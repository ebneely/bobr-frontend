import { fireEvent, render, screen } from '@testing-library/react';
import { getImageProps } from 'next/image';

import { intrinsicSize, parseRatio, RemoteImage } from '@/components/ui/RemoteImage';
import { srcSetLoader, srcSetRungs } from '@/lib/images/srcset-loader';

// The shape bobr-backend#55 sends: key = delivered width, value = signed imgproxy URL.
const rung = (w: number) => `https://img.example.test/sig/rs:fit:${w}:0:0/dpr:1/q:95/f:webp/plain/meals/a.jpg`;
const SRC_SET = {
  '1080': rung(1080),
  '320': rung(320),
  '828': rung(828),
  '480': rung(480),
  '640': rung(640),
};
const IMAGE_URL = 'https://img.example.test/sig/dpr:2/meals/a.jpg';

describe('srcSetLoader', () => {
  const load = srcSetLoader(SRC_SET);

  it('picks the smallest rung at or above the requested width', () => {
    expect(load({ src: IMAGE_URL, width: 320 })).toBe(rung(320));
    expect(load({ src: IMAGE_URL, width: 321 })).toBe(rung(480));
    expect(load({ src: IMAGE_URL, width: 750 })).toBe(rung(828));
    expect(load({ src: IMAGE_URL, width: 16 })).toBe(rung(320));
  });

  it('returns the top rung past the top of the ladder', () => {
    expect(load({ src: IMAGE_URL, width: 1200 })).toBe(rung(1080));
    expect(load({ src: IMAGE_URL, width: 3840 })).toBe(rung(1080));
  });

  it('falls back to imageUrl without a usable ladder', () => {
    expect(srcSetLoader(null)({ src: IMAGE_URL, width: 640 })).toBe(IMAGE_URL);
    expect(srcSetLoader(undefined)({ src: IMAGE_URL, width: 640 })).toBe(IMAGE_URL);
    expect(srcSetLoader({})({ src: IMAGE_URL, width: 640 })).toBe(IMAGE_URL);
    expect(srcSetLoader({ big: 'x' })({ src: IMAGE_URL, width: 640 })).toBe(IMAGE_URL);
  });

  it('sorts rungs numerically, not as strings', () => {
    expect(srcSetRungs(SRC_SET)).toEqual([320, 480, 640, 828, 1080]);
  });

  it('gives a 390px DPR-3 phone the 1080 rung (#31 "fixed when")', () => {
    // The carousel's sizes: 82vw of 390px = 320 CSS px, x3 = 960 device px.
    const { props } = getImageProps({
      src: IMAGE_URL,
      alt: '',
      width: 1080,
      height: 810,
      loader: srcSetLoader(SRC_SET),
      sizes: '(max-width: 483px) 82vw, 396px',
    });
    const candidates = (props.srcSet ?? '').split(', ').map((c) => {
      const [url, descriptor] = c.split(' ');
      return { url, w: Number(descriptor.replace('w', '')) };
    });
    // The browser takes the smallest candidate whose descriptor covers the need.
    const needed = 390 * 0.82 * 3;
    const chosen = candidates.filter((c) => c.w >= needed).sort((a, b) => a.w - b.w)[0];
    expect(chosen.url).toBe(rung(1080));
    // Nothing points at Next's optimizer.
    expect(props.srcSet).not.toContain('/_next/image');
  });
});

describe('intrinsicSize', () => {
  it('uses the photo size when the backend knows it', () => {
    expect(intrinsicSize(1600, 1200, '4 / 3')).toEqual({ width: 1600, height: 1200 });
  });
  it('derives it from the frame ratio otherwise', () => {
    expect(intrinsicSize(null, null, '4 / 3')).toEqual({ width: 1080, height: 810 });
    expect(intrinsicSize(1600, null, '16 / 10')).toEqual({ width: 1080, height: 675 });
    expect(parseRatio('nonsense')).toBeCloseTo(4 / 3);
  });
});

describe('RemoteImage', () => {
  it('renders a srcset of server rungs when the ladder exists', () => {
    render(<RemoteImage src={IMAGE_URL} srcSet={SRC_SET} alt="dish" sizes="100vw" />);
    const img = screen.getByAltText('dish');
    expect(img.getAttribute('srcset')).toContain(rung(320));
    expect(img.getAttribute('srcset')).toContain(rung(1080));
    expect(img.getAttribute('sizes')).toBe('100vw');
  });

  it('renders the plain imageUrl when there is no ladder (local dev)', () => {
    render(<RemoteImage src={IMAGE_URL} srcSet={null} alt="dish" sizes="100vw" />);
    const img = screen.getByAltText('dish');
    expect(img.getAttribute('src')).toBe(IMAGE_URL);
    expect(img.getAttribute('srcset')).toBeNull();
    expect(img.getAttribute('width')).toBe('1080');
    expect(img.getAttribute('height')).toBe('810');
  });

  it('degrades to the plain URL, then to the fallback', () => {
    render(
      <RemoteImage
        src={IMAGE_URL}
        srcSet={SRC_SET}
        alt="dish"
        sizes="100vw"
        fallback={<span data-testid="placeholder" />}
      />,
    );
    fireEvent.error(screen.getByAltText('dish'));
    const plain = screen.getByAltText('dish');
    expect(plain.getAttribute('src')).toBe(IMAGE_URL);
    expect(plain.getAttribute('srcset')).toBeNull();

    fireEvent.error(plain);
    expect(screen.queryByAltText('dish')).toBeNull();
    expect(screen.getByTestId('placeholder')).toBeTruthy();
  });
});
