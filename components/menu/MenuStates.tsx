'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';

/**
 * Loading, empty, no-results and error, each drawn rather than left as a line of
 * grey text. They share one frame — an empty plate — because all four are the
 * same moment from the visitor's side: nothing to eat on screen yet.
 */

export function MenuSkeleton() {
  const t = useTranslations('menu');
  return (
    <div className="bobr-menu-skeleton" role="status" aria-live="polite">
      <span className="bobr-sr-only">{t('loading')}</span>
      {[0, 1].map((block) => (
        <div key={block} className="bobr-menu-skeleton__course" aria-hidden>
          <span className="bobr-skel bobr-skel--dot" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="bobr-skel bobr-skel--heading" />
            <div className="bobr-dish-grid">
              {[0, 1, 2].map((card) => (
                <span key={card} className="bobr-skel bobr-skel--card" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StateFrame({
  title,
  children,
  tone = 'plain',
  role,
}: {
  title: string;
  children: ReactNode;
  tone?: 'plain' | 'error';
  role?: 'alert';
}) {
  return (
    <div className="bobr-menu-state" data-tone={tone} role={role}>
      <span className="bobr-menu-state__plate" aria-hidden>
        <span />
      </span>
      <h2 className="bobr-h3 bobr-menu-state__title">{title}</h2>
      {children}
    </div>
  );
}

export function MenuEmpty() {
  const t = useTranslations('menu');
  return (
    <StateFrame title={t('emptyTitle')}>
      <p className="bobr-menu-state__body">{t('emptyBody')}</p>
      <Button href="/#diets" variant="outline">
        {t('emptyCta')}
      </Button>
    </StateFrame>
  );
}

export function MenuNoResults({ query, onClear }: { query: string; onClear: () => void }) {
  const t = useTranslations('menu');
  return (
    <StateFrame title={t('noResultsTitle')}>
      <p className="bobr-menu-state__body">
        {query ? t('noResultsQuery', { q: query }) : t('noResultsFilters')} {t('noResultsBody')}
      </p>
      <Button onClick={onClear} variant="outline">
        {t('clearFilters')}
      </Button>
    </StateFrame>
  );
}

export function MenuError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('menu');
  return (
    <StateFrame title={t('errorTitle')} tone="error" role="alert">
      <p className="bobr-menu-state__body">{t('errorBody')}</p>
      {message && <p className="bobr-menu-state__detail">{message}</p>}
      <Button onClick={onRetry}>{t('retry')}</Button>
    </StateFrame>
  );
}
