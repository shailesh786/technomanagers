'use client';

/**
 * Cohort application form. Validation rules and consent wording come from
 * lib/cohort-application.ts, which the server route re-checks, so the two can
 * never disagree. Consent checkboxes start unticked and are never pre-filled.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import {
  cohortApplicationSchema,
  CONSENTS,
  CURRENT_ROLES,
  EXPERIENCE_BANDS,
  PRIMARY_GOALS,
  type CohortApplicationInput,
} from '@/lib/cohort-application';
import { COUNTRIES, countryByIso } from '@/lib/countries';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/** Consent text with the policy names turned into links. */
function ConsentLabel({ text }: { text: string }) {
  const parts = text.split(/(technomanagers\.in\/cohort|refund policy|privacy policy)/i);
  return (
    <>
      {parts.map((p, i) => {
        const lower = p.toLowerCase();
        const href =
          lower === 'technomanagers.in/cohort' ? '/cohort' : lower === 'refund policy' ? '/refund-policy' : lower === 'privacy policy' ? '/privacy' : null;
        return href ? (
          <Link key={i} href={href} target="_blank" className="underline text-foreground hover:text-primary">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

/** "IN" -> 🇮🇳 (regional indicator letters). */
function flagEmoji(iso: string) {
  return iso.replace(/./g, (ch) => String.fromCodePoint(0x1f1a5 + ch.charCodeAt(0)));
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive mt-1">{message}</p> : null;
}

function Choice({
  name,
  label,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value?: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium mb-2">
        {label} <span className="text-destructive">*</span>
      </legend>
      <RadioGroup value={value ?? ''} onValueChange={onChange} className="gap-2">
        {options.map((o) => (
          <div key={o} className="flex items-center gap-2">
            <RadioGroupItem value={o} id={`${name}-${o}`} />
            <Label htmlFor={`${name}-${o}`} className="font-normal cursor-pointer">
              {o}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <FieldError message={error} />
    </fieldset>
  );
}

export default function CohortApplyForm() {
  const { user } = useAuth();
  const [done, setDone] = useState<{ emailSent: boolean; email: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CohortApplicationInput>({
    resolver: zodResolver(cohortApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      country: 'IN',
      phone: '',
      website: '',
      consents: { agreement: false },
    },
  });

  // Pre-fill name/email for signed-in visitors (never the consents).
  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    if (!getValues('fullName') && (meta.full_name || meta.name)) setValue('fullName', meta.full_name || meta.name || '');
    if (!getValues('email') && user.email) setValue('email', user.email);
  }, [user, getValues, setValue]);

  const country = watch('country');

  const onSubmit = async (values: CohortApplicationInput) => {
    setServerError(null);
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k) ?? '']).filter(([, v]) => v));
    try {
      const res = await fetch('/api/cohort-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          sourceUrl: window.location.href,
          utm,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(json.error || 'Something went wrong. Please try again.');
        return;
      }
      setDone({ emailSent: json.emailSent !== false, email: values.email.trim() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setServerError('Could not reach the server. Check your connection and try again.');
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border bg-muted/40 p-6 md:p-8 space-y-3" role="status">
        <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden />
        <h2 className="font-heading font-bold text-xl">Application received</h2>
        <p className="text-muted-foreground">
          Thanks for applying. We&apos;ll get back to you soon, usually on WhatsApp or by phone.
        </p>
        {done.emailSent && (
          <p className="text-muted-foreground">
            A copy of your answers is on its way to <b>{done.email}</b>.
            If it isn&apos;t in your inbox in a few minutes, check spam or promotions.
          </p>
        )}
        <Link href="/cohort" className="inline-block text-sm underline">
          Back to cohort details
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="fullName" autoComplete="name" placeholder="Your name" {...register('fullName')} />
        <FieldError message={errors.fullName?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email address <span className="text-destructive">*</span>
        </Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Phone / WhatsApp number <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          {/* Native select for picking (full country names), showing just flag + code when closed. */}
          <div className="relative shrink-0">
            <div aria-hidden className="pointer-events-none flex h-10 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm">
              <span>{flagEmoji(country)}</span>
              <span>{countryByIso(country)?.dial ?? '+'}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            <select aria-label="Country" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" {...register('country')}>
              {COUNTRIES.map(([iso, name, dial]) => (
                <option key={iso} value={iso}>
                  {name} ({dial})
                </option>
              ))}
            </select>
          </div>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" {...register('phone')} />
        </div>
        <FieldError message={errors.country?.message || errors.phone?.message} />
      </div>

      <Controller
        control={control}
        name="currentRole"
        render={({ field }) => (
          <Choice name="currentRole" label="What is your current role?" options={CURRENT_ROLES} value={field.value} onChange={field.onChange} error={errors.currentRole?.message} />
        )}
      />
      <Controller
        control={control}
        name="experience"
        render={({ field }) => (
          <Choice name="experience" label="How many years of work experience do you have?" options={EXPERIENCE_BANDS} value={field.value} onChange={field.onChange} error={errors.experience?.message} />
        )}
      />
      <Controller
        control={control}
        name="primaryGoal"
        render={({ field }) => (
          <Choice name="primaryGoal" label="What is your number one goal?" options={PRIMARY_GOALS} value={field.value} onChange={field.onChange} error={errors.primaryGoal?.message} />
        )}
      />
      {CONSENTS.map((c) => {
        const err = errors.consents?.[c.key]?.message;
        return (
          <div key={c.key}>
            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name={`consents.${c.key}`}
                render={({ field }) => (
                  <Checkbox
                    id={`consent-${c.key}`}
                    checked={field.value === true}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    className="mt-0.5"
                    aria-invalid={Boolean(err)}
                  />
                )}
              />
              <Label htmlFor={`consent-${c.key}`} className="font-normal leading-relaxed text-sm text-muted-foreground cursor-pointer">
                <ConsentLabel text={c.text} />
              </Label>
            </div>
            <FieldError message={err} />
          </div>
        );
      })}

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          'Submit'
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        We&apos;ll email you a copy of your answers, with the date and time you submitted.
      </p>
    </form>
  );
}
