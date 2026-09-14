'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { MenuDocument } from '@/lib/api/menu';
import { Button } from '@/components/ui/Button';
import { ExternalIcon } from './MenuIcons';

/**
 * The printed menu — for people who want the whole thing at once.
 *
 * Deliberately a different object from the dish cards: a sheet of paper lying
 * on a card, with the button to open the real file. An IMAGE (or a PDF the API
 * rendered a first page for) shows that picture; a PDF without a preview gets a
 * drawn sheet instead of an embedded viewer, which would need a PDF library and
 * a frame-src exception for a thumbnail nobody can read at this size anyway.
 */
export function PrintedMenuCard({ document }: { document: MenuDocument }) {
  const t = useTranslations('menu.document');
  const tc = useTranslations('common');
  const locale = useLocale();

  const preview = document.previewUrl ?? (document.kind === 'IMAGE' ? document.url : null);
  const updated = formatUpdated(document.updatedAt, locale);

  return (
    <section className="bobr-printed" aria-labelledby="bobr-printed-title">
      <a
        href={document.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bobr-printed__sheet"
        // The button below is the labelled way in; this is the same target
        // for a pointer, so it is kept out of the tab order and the a11y tree.
        tabIndex={-1}
        aria-hidden
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" loading="lazy" decoding="async" />
        ) : (
          <DrawnSheet appName={tc('appName')} />
        )}
        <span className="bobr-printed__kind">{document.kind === 'PDF' ? t('kindPdf') : t('kindImage')}</span>
      </a>

      <div className="bobr-printed__text">
        <p className="bobr-kicker">{t('eyebrow')}</p>
        <h2 id="bobr-printed-title" className="bobr-printed__title">
          {t('title')}
        </h2>
        <p className="bobr-printed__body">{t('body')}</p>
        {updated && <p className="bobr-printed__updated">{t('updated', { date: updated })}</p>}
      </div>

      <div className="bobr-printed__action">
        {/* `light`: a solid green face would vanish into the green card. */}
        <Button externalHref={document.url} variant="light">
          <span className="bobr-btn-label">
            {document.kind === 'PDF' ? t('openPdf') : t('openImage')}
            <ExternalIcon />
            <span className="bobr-sr-only"> ({t('newTab')})</span>
          </span>
        </Button>
      </div>
    </section>
  );
}

/** Calendar date in Warsaw — an upload at 00:30 Warsaw time is that day, not the UTC one before. */
function formatUpdated(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  }).format(date);
}

/** A page of a menu, drawn: wordmark, five course headings and their lines. */
function DrawnSheet({ appName }: { appName: string }) {
  return (
    <span className="bobr-drawn-sheet" aria-hidden>
      <span className="bobr-drawn-sheet__mark">{appName}</span>
      {[3, 2, 3, 2, 3].map((lines, i) => (
        <span key={i} className="bobr-drawn-sheet__course">
          <span className="bobr-drawn-sheet__heading" />
          {Array.from({ length: lines }, (_, j) => (
            <span key={j} className="bobr-drawn-sheet__line" style={{ width: `${88 - ((i + j) % 3) * 14}%` }} />
          ))}
        </span>
      ))}
    </span>
  );
}
