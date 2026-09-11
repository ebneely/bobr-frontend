import type { ReactNode } from 'react';
import { EyebrowChip } from './EyebrowChip';
import { Reveal } from '@/components/motion/Reveal';

interface SectionHeadingProps {
  eyebrow: string;
  /** Regular-weight opening of the heading. */
  lead: string;
  /** The emphasised tail — same size, heavier weight, accent colour. */
  em: string;
  body?: string;
  align?: 'start' | 'center';
  as?: 'h1' | 'h2';
  children?: ReactNode;
}

/**
 * Eyebrow chip, then a two-tone heading, then optional body copy.
 *
 * The heading splits into a regular `lead` and a bold accent `em` rather than
 * taking pre-marked-up HTML, because the emphasis has to survive translation:
 * Polish and English put the stressed phrase in different places, so each
 * locale supplies its own two halves.
 */
export function SectionHeading({
  eyebrow,
  lead,
  em,
  body,
  align = 'start',
  as: Tag = 'h2',
  children,
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
        gap: '1.5rem',
        maxWidth: centered ? '48rem' : undefined,
        marginInline: centered ? 'auto' : undefined,
      }}
    >
      <Reveal>
        <EyebrowChip>{eyebrow}</EyebrowChip>
      </Reveal>

      <Reveal delay={0.08}>
        <Tag className={Tag === 'h1' ? 'bobr-display' : 'bobr-h2'}>
          {lead} <span className="bobr-em">{em}</span>
        </Tag>
      </Reveal>

      {body && (
        <Reveal delay={0.16}>
          <p className="bobr-body" style={{ maxWidth: '38rem' }}>
            {body}
          </p>
        </Reveal>
      )}

      {children && <Reveal delay={0.24}>{children}</Reveal>}
    </div>
  );
}
