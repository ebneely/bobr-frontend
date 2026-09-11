/**
 * A layout-correct stand-in for photography.
 *
 * BOBR has no food photography yet, and a broken <img> or a hotlinked stock
 * photo would both misrepresent how the page will actually look. This renders a
 * deterministic gradient with a soft plate shape instead, so spacing, radii and
 * the scroll choreography can all be judged now and each block swapped for a
 * real photograph one at a time.
 *
 * Purely decorative: aria-hidden, and it carries no alt text because there is
 * nothing here to describe.
 */
export function PlaceholderMedia({
  tone = 'green',
  radius = 'var(--bobr-radius)',
  ratio = '4 / 5',
  label,
}: {
  tone?: 'green' | 'cream' | 'orange';
  radius?: string;
  ratio?: string;
  label?: string;
}) {
  const tones = {
    green: ['#4a6f45', '#1e3a1c'],
    cream: ['#fef5da', '#f0dfae'],
    orange: ['#ffb46b', '#e8761a'],
  } as const;
  const [from, to] = tones[tone];

  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: 'hidden',
        background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)`,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {/* Soft off-centre highlight, so the block reads as a photograph's
          lighting rather than as a flat swatch. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(60% 50% at 68% 28%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      <div
        style={{
          width: '52%',
          aspectRatio: '1',
          borderRadius: '50%',
          border: '1px solid rgba(255, 250, 229, 0.28)',
          background: 'rgba(255, 250, 229, 0.06)',
        }}
      />
      {label && (
        <span
          style={{
            position: 'absolute',
            bottom: 16,
            left: 18,
            fontSize: 'var(--bobr-text-xs)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255, 250, 229, 0.65)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
