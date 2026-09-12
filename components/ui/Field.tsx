'use client';

import { useId, type InputHTMLAttributes } from 'react';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Shown under the input, and read out with it. */
  hint?: string;
  /** Field-level error. Replaces the hint and marks the input invalid. */
  error?: string;
}

/**
 * A labelled text input.
 *
 * The label is a real `<label htmlFor>`, not a placeholder: a placeholder
 * disappears the moment someone types, so anyone who loses their place has no
 * way back to what the field was for, and screen readers treat it as a hint
 * rather than a name.
 *
 * `aria-describedby` is wired to whichever of hint/error is showing, and
 * `aria-invalid` marks the field, so the error is announced rather than merely
 * rendered in red — colour alone is not an error message.
 */
export function Field({ label, hint, error, ...props }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--bobr-text-sm)',
          fontWeight: 'var(--bobr-weight-medium)',
          color: 'var(--bobr-fg)',
        }}
      >
        {label}
      </label>

      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={{
          width: '100%',
          padding: '0.8rem 1rem',
          fontFamily: 'inherit',
          fontSize: 'var(--bobr-text-body)',
          color: 'var(--bobr-fg)',
          background: 'var(--bobr-surface)',
          border: `1px solid ${error ? 'var(--bobr-danger)' : 'var(--bobr-border)'}`,
          borderRadius: 'var(--bobr-radius-control)',
          outline: 'none',
          transition: 'border-color var(--bobr-duration) var(--bobr-ease)',
        }}
      />

      {error ? (
        <p
          id={`${id}-error`}
          style={{
            fontSize: 'var(--bobr-text-sm)',
            color: 'var(--bobr-danger)',
          }}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          style={{
            fontSize: 'var(--bobr-text-sm)',
            color: 'var(--bobr-fg-muted)',
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
