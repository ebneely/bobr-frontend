'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GateCard } from '@/components/ui/GateCard';
import { ApiError, apiAssetUrl, formatApiError } from '@/lib/api/client';
import { useApiErrorTranslate } from '@/lib/api/use-api-error';
import {
  PHOTO_POSITIONS,
  apiGetMyIntake,
  apiSaveMyIntake,
  apiUploadIntakePhoto,
  type ActivityType,
  type IntakeProfile,
  type PhotoPosition,
} from '@/lib/api/intake';
import { ALLERGENS, type Allergen } from '@/lib/api/menu';

/** The order the checkboxes appear in. NONE first: it is the opt-out. */
const ACTIVITIES: readonly ActivityType[] = [
  'NONE',
  'GYM',
  'SWIMMER',
  'BOXING_MMA',
  'OTHER',
] as const;

const ACTIVITY_LABEL_KEY: Record<ActivityType, string> = {
  NONE: 'activityNone',
  GYM: 'activityGym',
  SWIMMER: 'activitySwimmer',
  BOXING_MMA: 'activityBoxingMma',
  OTHER: 'activityOther',
};

const PHOTO_LABEL_KEY: Record<PhotoPosition, string> = {
  FRONT: 'photoFront',
  BACK: 'photoBack',
  LEFT: 'photoLeft',
  RIGHT: 'photoRight',
};

type Load = 'loading' | 'ready' | 'signedOut' | 'failed';

export function IntakeClient({
  signedIn,
  next,
  returnPath,
}: {
  /** From the server's session check. A 401 while loading flips it. */
  signedIn: boolean;
  /** A validated local path to continue to once the profile is complete. */
  next: string | null;
  /** This page with its query, for the login link's `next`. */
  returnPath: string;
}) {
  const t = useTranslations('intake');
  const tm = useTranslations('menu');
  const translateError = useApiErrorTranslate();

  const [load, setLoad] = useState<Load>('loading');
  const [profile, setProfile] = useState<IntakeProfile | null>(null);

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [composition, setComposition] = useState('');
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [other, setOther] = useState('');
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');

  // Errors stay hidden until the first save attempt, so an untouched form is
  // not already shouting. The NONE/sport conflict is the exception below —
  // that one is a contradiction the person just created, not a blank field.
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [uploading, setUploading] = useState<PhotoPosition | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  /**
   * Load the existing profile once.
   *
   * Every setState here runs in a promise callback, never synchronously in the
   * effect body — React 19 flags the synchronous form, and it is also what
   * produces the extra render this screen has no use for.
   */
  useEffect(() => {
    // Signed out: nothing to load, the card below explains. No request, so no
    // 401 that would otherwise read as "load failed" (G06).
    if (!signedIn) return;
    let alive = true;

    apiGetMyIntake()
      .then((p) => {
        if (!alive) return;
        applyProfile(p);
        setLoad('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        // 404 is the normal first visit: there is simply no profile yet.
        if (e instanceof ApiError && e.status === 404) setLoad('ready');
        else if (e instanceof ApiError && e.status === 401) setLoad('signedOut');
        else setLoad('failed');
      });

    return () => {
      alive = false;
    };
  }, [signedIn]);

  function applyProfile(p: IntakeProfile) {
    setProfile(p);
    setWeight(p.weightKg == null ? '' : String(p.weightKg));
    setHeight(p.heightCm == null ? '' : String(p.heightCm));
    setComposition(p.bodyComposition ?? '');
    setActivities(p.activityTypes ?? []);
    setOther(p.activityOther ?? '');
    setAllergens(p.allergens ?? []);
    setDietaryNotes(p.dietaryNotes ?? '');
  }

  function toggleAllergen(a: Allergen) {
    setSaved(false);
    setAllergens((previous) =>
      previous.includes(a) ? previous.filter((x) => x !== a) : [...previous, a],
    );
  }

  // --- Validation, derived during render -----------------------------------
  // No effect mirrors these into state: a derived value kept in state is a
  // value that can disagree with what it was derived from.
  const has = (a: ActivityType) => activities.includes(a);
  const sports = activities.filter((a) => a !== 'NONE');

  const weightNumber = Number(weight.replace(',', '.'));
  const heightNumber = Number(height.replace(',', '.'));

  const weightError =
    weight.trim() === '' || !Number.isFinite(weightNumber) || weightNumber <= 0
      ? t('errWeight')
      : null;
  const heightError =
    height.trim() === '' || !Number.isFinite(heightNumber) || heightNumber <= 0
      ? t('errHeight')
      : null;

  // The server answers 422 for this combination. Saying it here saves the round
  // trip and, more to the point, says it while both boxes are still on screen.
  const conflict = has('NONE') && sports.length > 0;
  const otherMissing = has('OTHER') && other.trim() === '';
  const noActivity = activities.length === 0;

  const activityError = conflict
    ? t('errNoneWithSport')
    : attempted && noActivity
      ? t('errActivityEmpty')
      : null;
  const otherError = attempted && otherMissing ? t('errOtherRequired') : null;

  const blocked = Boolean(
    weightError || heightError || conflict || otherMissing || noActivity,
  );

  function toggleActivity(a: ActivityType) {
    setSaved(false);
    setActivities((previous) =>
      previous.includes(a) ? previous.filter((x) => x !== a) : [...previous, a],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSaveError(null);
    setSaved(false);
    if (blocked) return;

    setSaving(true);
    try {
      const next = await apiSaveMyIntake({
        weightKg: weightNumber,
        heightCm: heightNumber,
        // Body composition is optional: an empty box means "not told", which is
        // null, not an empty string the server would have to interpret.
        bodyComposition: composition.trim() === '' ? null : composition.trim(),
        activityTypes: activities,
        activityOther: has('OTHER') ? other.trim() : null,
        allergens,
        dietaryNotes: dietaryNotes.trim() === '' ? null : dietaryNotes.trim(),
      });
      applyProfile(next);
      setSaved(true);
    } catch (e: unknown) {
      const body = e instanceof ApiError ? e.body : null;
      setSaveError(formatApiError(body, translateError) || t('errSave'));
    } finally {
      setSaving(false);
    }
  }

  async function upload(position: PhotoPosition, file: File) {
    setPhotoError(null);
    setUploading(position);
    try {
      applyProfile(await apiUploadIntakePhoto(position, file));
    } catch (e: unknown) {
      const body = e instanceof ApiError ? e.body : null;
      setPhotoError(
        `${t(PHOTO_LABEL_KEY[position])}: ${formatApiError(body, translateError) || t('errPhoto')}`,
      );
    } finally {
      setUploading(null);
    }
  }

  if (!signedIn || load === 'signedOut') {
    return (
      <GateCard
        testId="intake-signed-out"
        title={t('signInTitle')}
        body={t('signInBody')}
        cta={t('signIn')}
        href={{ pathname: '/login', query: { next: returnPath } }}
      />
    );
  }

  if (load === 'loading') {
    return (
      <p className="bobr-body" role="status" aria-live="polite">
        {t('loading')}
      </p>
    );
  }

  if (load === 'failed') {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          color: 'var(--bobr-danger)',
          fontSize: 'var(--bobr-text-body)',
        }}
      >
        {t('errLoad')}
      </p>
    );
  }

  // No saved profile yet means nothing is uploaded yet, so all four are missing.
  const missing: PhotoPosition[] = profile
    ? profile.missingPhotos
    : [...PHOTO_POSITIONS];
  const complete = Boolean(profile?.completedAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <GateBanner
        complete={complete}
        text={
          complete
            ? next
              ? t('completeYesNext')
              : t('completeYes')
            : next
              ? t('completeNoNext')
              : t('completeNo')
        }
        cta={complete ? (next ? t('continueOrder') : t('goOrder')) : null}
        href={continueHref(next)}
      />

      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
      >
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
            {t('measurements')}
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
              gap: '1.25rem',
            }}
          >
            <Field
              label={t('weight')}
              type="text"
              inputMode="decimal"
              name="weightKg"
              autoComplete="off"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setSaved(false);
              }}
              hint={t('weightHint')}
              error={attempted ? (weightError ?? undefined) : undefined}
            />

            <Field
              label={t('height')}
              type="text"
              inputMode="numeric"
              name="heightCm"
              autoComplete="off"
              value={height}
              onChange={(e) => {
                setHeight(e.target.value);
                setSaved(false);
              }}
              hint={t('heightHint')}
              error={attempted ? (heightError ?? undefined) : undefined}
            />
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {/* Optional, and labelled as such — there is no error path here. */}
            <Field
              label={`${t('bodyComposition')} (${t('optional')})`}
              type="text"
              name="bodyComposition"
              autoComplete="off"
              value={composition}
              onChange={(e) => {
                setComposition(e.target.value);
                setSaved(false);
              }}
              hint={t('bodyCompositionHint')}
            />
          </div>
        </fieldset>

        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
            {t('activity')}
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
              gap: '0.75rem',
            }}
          >
            {ACTIVITIES.map((a) => {
              const on = has(a);
              // Only the pair that actually contradicts is marked, so the
              // message points at something rather than reddening the group.
              const bad = conflict && (a === 'NONE' || sports.includes(a));
              return (
                <label
                  key={a}
                  data-activity={a}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.9rem 1rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--bobr-radius-sm)',
                    border: `1px solid ${
                      bad
                        ? 'var(--bobr-danger)'
                        : on
                          ? 'var(--bobr-accent)'
                          : 'var(--bobr-border)'
                    }`,
                    background: 'var(--bobr-surface)',
                    fontSize: 'var(--bobr-text-sm)',
                    color: 'var(--bobr-fg)',
                  }}
                >
                  <input
                    type="checkbox"
                    name="activityTypes"
                    value={a}
                    checked={on}
                    aria-invalid={bad ? true : undefined}
                    onChange={() => toggleActivity(a)}
                    style={{
                      width: '1.1rem',
                      height: '1.1rem',
                      accentColor: 'var(--bobr-accent)',
                    }}
                  />
                  {t(ACTIVITY_LABEL_KEY[a])}
                </label>
              );
            })}
          </div>

          {activityError && (
            <p
              role="status"
              aria-live="polite"
              data-testid="activity-error"
              style={{
                marginTop: '0.75rem',
                fontSize: 'var(--bobr-text-sm)',
                color: 'var(--bobr-danger)',
              }}
            >
              {activityError}
            </p>
          )}

          {/* Free text appears only with OTHER ticked, and is required only
              then — an always-present box would read as always required. */}
          {has('OTHER') && (
            <div style={{ marginTop: '1.25rem' }}>
              <Field
                label={t('activityOther')}
                type="text"
                name="activityOther"
                autoComplete="off"
                placeholder={t('activityOtherPlaceholder')}
                value={other}
                onChange={(e) => {
                  setOther(e.target.value);
                  setSaved(false);
                }}
                error={otherError ?? undefined}
              />
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: 0, margin: 0, padding: 0 }} data-testid="allergens-fieldset">
          <legend className="bobr-h4" style={{ marginBottom: '0.875rem' }}>
            {t('allergens')}
          </legend>
          <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)', marginBottom: '0.875rem' }}>
            {t('allergensHint')}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))',
              gap: '0.6rem',
            }}
          >
            {ALLERGENS.map((a) => {
              const on = allergens.includes(a);
              return (
                <label
                  key={a}
                  data-allergen={a}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 0.9rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--bobr-radius-sm)',
                    border: `1px solid ${on ? 'var(--bobr-accent)' : 'var(--bobr-border)'}`,
                    background: 'var(--bobr-surface)',
                    fontSize: 'var(--bobr-text-sm)',
                    color: 'var(--bobr-fg)',
                  }}
                >
                  <input
                    type="checkbox"
                    name="allergens"
                    value={a}
                    checked={on}
                    onChange={() => toggleAllergen(a)}
                    style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--bobr-accent)' }}
                  />
                  {tm(`allergen.${a}`)}
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Field
              label={`${t('dietaryNotes')} (${t('optional')})`}
              type="text"
              name="dietaryNotes"
              autoComplete="off"
              value={dietaryNotes}
              onChange={(e) => {
                setDietaryNotes(e.target.value);
                setSaved(false);
              }}
              hint={t('dietaryNotesHint')}
            />
          </div>
        </fieldset>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            alignItems: 'flex-start',
          }}
        >
          <p
            role="status"
            aria-live="polite"
            data-testid="save-status"
            style={{
              minHeight: '1.2em',
              fontSize: 'var(--bobr-text-sm)',
              whiteSpace: 'pre-line',
              color: saveError ? 'var(--bobr-danger)' : 'var(--bobr-fg-muted)',
            }}
          >
            {saveError ?? (saved ? t('saved') : '')}
          </p>

          <Button type="submit">{saving ? t('saving') : t('save')}</Button>
        </div>
      </form>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 className="bobr-h4">{t('photos')}</h2>
        <p className="bobr-body" style={{ fontSize: 'var(--bobr-text-sm)' }}>
          {t('photosIntro')}
        </p>

        {!profile && (
          <p
            className="bobr-body"
            style={{
              fontSize: 'var(--bobr-text-sm)',
              color: 'var(--bobr-accent-hover)',
            }}
          >
            {t('saveFirst')}
          </p>
        )}

        {/* The checklist is driven by the server's missingPhotos, not by what
            this component believes it uploaded — the server is the one that
            decides when the gate opens. */}
        <ul
          data-testid="photo-checklist"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {PHOTO_POSITIONS.map((position) => {
            const gone = missing.includes(position);
            const busy = uploading === position;
            const photoPath = profile?.photos[position];
            return (
              <li
                key={position}
                data-position={position}
                data-missing={gone ? 'true' : 'false'}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  borderRadius: 'var(--bobr-radius-sm)',
                  border: `1px solid ${gone ? 'var(--bobr-border)' : 'var(--bobr-accent)'}`,
                  background: 'var(--bobr-surface)',
                }}
              >
                {photoPath ? (
                  // A plain <img>, never next/image: the bytes are behind the
                  // session cookie at a same-origin proxied path, not a static
                  // asset next/image could optimise.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apiAssetUrl(photoPath)}
                    alt=""
                    data-testid={`photo-preview-${position}`}
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      objectFit: 'cover',
                      borderRadius: 'var(--bobr-radius-sm)',
                      flex: '0 0 auto',
                    }}
                  />
                ) : null}
                <span
                  aria-hidden
                  style={{
                    width: '1.4rem',
                    textAlign: 'center',
                    color: gone ? 'var(--bobr-fg-muted)' : 'var(--bobr-accent)',
                    fontWeight: 'var(--bobr-weight-bold)',
                  }}
                >
                  {gone ? '·' : '✓'}
                </span>

                <span
                  style={{
                    fontWeight: 'var(--bobr-weight-medium)',
                    minWidth: '6rem',
                  }}
                >
                  {t(PHOTO_LABEL_KEY[position])}
                </span>

                <span
                  style={{
                    fontSize: 'var(--bobr-text-sm)',
                    color: gone
                      ? 'var(--bobr-fg-muted)'
                      : 'var(--bobr-accent-hover)',
                  }}
                >
                  {busy
                    ? t('photoUploading')
                    : gone
                      ? t('photoMissing')
                      : t('photoDone')}
                </span>

                <PhotoPicker
                  position={position}
                  label={t('photoChoose')}
                  disabled={busy || !profile}
                  onPick={(file) => void upload(position, file)}
                />
              </li>
            );
          })}
        </ul>

        <p
          role="status"
          aria-live="polite"
          data-testid="photo-status"
          style={{
            minHeight: '1.2em',
            fontSize: 'var(--bobr-text-sm)',
            whiteSpace: 'pre-line',
            color: photoError ? 'var(--bobr-danger)' : 'var(--bobr-fg-muted)',
          }}
        >
          {photoError ??
            (missing.length === 0
              ? t('allPhotos')
              : t('remaining', { count: missing.length }))}
        </p>
      </section>
    </div>
  );
}

function PhotoPicker({
  position,
  label,
  disabled,
  onPick,
}: {
  position: PhotoPosition;
  label: string;
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <label
      style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: 'var(--bobr-text-sm)',
        color: disabled ? 'var(--bobr-fg-muted)' : 'var(--bobr-fg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--bobr-border)',
        borderRadius: 'var(--bobr-radius-control)',
        padding: '0.45rem 0.9rem',
        background: 'var(--bobr-bg)',
      }}
    >
      {label}
      {/* A real file input, visually hidden rather than display:none, so it
          keeps its place in the tab order and its label is announced. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        disabled={disabled}
        data-testid={`photo-input-${position}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clear the input so picking the same file twice still fires change.
          if (input.current) input.current.value = '';
          if (file) onPick(file);
        }}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </label>
  );
}

/**
 * Where "continue" goes. `next` is a validated local path with its locale
 * (/pl/order?meal=…); the Link adds the locale itself, so it is stripped here.
 * Without one, the order page is the natural next step.
 */
function continueHref(next: string | null): string {
  if (!next) return '/order';
  return next.replace(/^\/(pl|en)(?=\/|\?|$)/, '') || '/';
}

function GateBanner({
  complete,
  text,
  cta,
  href,
}: {
  complete: boolean;
  text: string;
  cta: string | null;
  /** Without the locale prefix — the locale-aware Link adds it. */
  href: string;
}) {
  return (
    <div
      data-testid="gate-banner"
      data-complete={complete ? 'true' : 'false'}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--bobr-radius-sm)',
        border: `1px solid ${complete ? 'var(--bobr-accent)' : 'var(--bobr-border)'}`,
        background: complete ? 'var(--bobr-surface)' : 'var(--bobr-bg-alt)',
      }}
    >
      <span style={{ fontSize: 'var(--bobr-text-sm)', color: 'var(--bobr-fg)', flex: '1 1 16rem' }}>
        {text}
      </span>
      {cta && <Button href={href}>{cta}</Button>}
    </div>
  );
}
