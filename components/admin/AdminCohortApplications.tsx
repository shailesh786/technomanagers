'use client';

/**
 * Admin → Leads. Every cohort application from /cohort/apply, with the
 * exact consent wording each applicant ticked, when, and from where; whether
 * their email copy, the team copy and the Google Sheet row went out; and a
 * status + notes field for follow-up. Reads and updates go through RLS
 * (admins only); rows are only ever created by /api/cohort-applications.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, ExternalLink, MessageCircle, Search } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type CohortApplicationRow,
} from '@/lib/cohort-application';

// cohort_applications is not in the generated Database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createSupabaseBrowserClient() as any;
const SHEET_URL = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
const QUERY_KEY = ['admin-cohort-applications'];

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function DeliveryBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? 'text-green-700' : 'text-amber-700'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function AdminCohortApplications() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const { data: rows, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohort_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as CohortApplicationRow[];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: { id: string; status?: ApplicationStatus; admin_notes?: string | null }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from('cohort_applications').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (!q || [r.full_name, r.email, r.phone, r.job_role].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [rows, search, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const open = rows?.find((r) => r.id === openId) ?? null;

  const exportCsv = () => {
    const header = [
      'Submitted (IST)', 'Name', 'Email', 'Phone', 'Country', 'Current role', 'Experience', 'Goal', 'Consent', 'Consent version', 'Status', 'Notes', 'Source', 'IP', 'Reference',
    ];
    const lines = filtered.map((r) =>
      [
        fmt(r.created_at), r.full_name, r.email, `${r.country_code} ${r.phone}`, r.country, r.job_role, r.experience,
        r.primary_goal,
        r.consents.map((c) => `${c.accepted ? '[x]' : '[ ]'} ${c.text}`).join(' / '),
        r.consent_version, STATUS_LABELS[r.status], r.admin_notes, r.source_url, r.ip_address, r.id,
      ].map(csvCell).join(','),
    );
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl">Leads ({counts.all})</h2>
          <p className="text-sm text-muted-foreground">
            From <a href="/cohort/apply" target="_blank" className="underline">/cohort/apply</a>. Click a row to see the
            consents, delivery status and notes.
          </p>
        </div>
        <div className="flex gap-2">
          {SHEET_URL && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={SHEET_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Google Sheet
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="pl-8" />
        </div>
        {(['all', ...APPLICATION_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Could not load leads: {(error as Error).message}. If this says the table does not exist, the
          cohort_applications migration has not been run on this Supabase project yet.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No leads yet.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Submitted</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Role · Exp</th>
                <th className="text-left p-3 font-medium">Goal</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Copies</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-muted/40 cursor-pointer"
                  onClick={() => {
                    setOpenId(r.id);
                    setNotesDraft(r.admin_notes ?? '');
                  }}
                >
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{fmt(r.created_at)}</td>
                  <td className="p-3 font-medium">{r.full_name}</td>
                  <td className="p-3">
                    <div>{r.email}</div>
                    <div className="text-muted-foreground">{r.country_code} {r.phone}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.job_role} · {r.experience}</td>
                  <td className="p-3 text-muted-foreground">{r.primary_goal}</td>
                  <td className="p-3"><Badge variant={r.status === 'new' ? 'default' : 'secondary'}>{STATUS_LABELS[r.status]}</Badge></td>
                  <td className="p-3">
                    {r.applicant_email_sent_at && r.team_email_sent_at && r.sheet_synced_at ? (
                      <DeliveryBadge ok label="All sent" />
                    ) : (
                      <DeliveryBadge ok={false} label="Check" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.full_name}</DialogTitle>
                <DialogDescription>Applied {fmt(open.created_at)} IST · Ref {open.id}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`https://wa.me/${(open.country_code + open.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${open.email}`}>Email</a>
                </Button>
              </div>

              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                {([
                  ['Email', open.email],
                  ['Phone / WhatsApp', `${open.country_code} ${open.phone}`],
                  ['Country', open.country],
                  ['Current role', open.job_role],
                  ['Experience', open.experience],
                  ['Main goal', open.primary_goal],
                ] as [string, string | null][]).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v || '—'}</dd>
                  </div>
                ))}
              </dl>

              <section className="space-y-2">
                <h3 className="font-medium text-sm">Consent (version {open.consent_version})</h3>
                <ul className="space-y-1.5 text-sm">
                  {open.consents.map((c) => (
                    <li key={c.key} className="flex gap-2">
                      <span aria-hidden>{c.accepted ? '✅' : '⬜️'}</span>
                      <span className={c.accepted ? '' : 'text-muted-foreground'}>{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Ticked at {fmt(open.created_at)} IST from IP {open.ip_address || 'unknown'}. Policies:{' '}
                  {Object.entries(open.policy_versions || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
                </p>
                <p className="text-xs text-muted-foreground break-words">Browser: {open.user_agent || '—'}</p>
                <p className="text-xs text-muted-foreground break-words">
                  Source: {open.source_url || '—'}
                  {open.utm ? ` · ${Object.entries(open.utm).map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-medium text-sm">Copies</h3>
                <div className="flex flex-wrap gap-4">
                  <DeliveryBadge ok={Boolean(open.applicant_email_sent_at)} label={`Applicant email ${open.applicant_email_sent_at ? fmt(open.applicant_email_sent_at) : 'not sent'}`} />
                  <DeliveryBadge ok={Boolean(open.team_email_sent_at)} label={`Team email ${open.team_email_sent_at ? fmt(open.team_email_sent_at) : 'not sent'}`} />
                  <DeliveryBadge ok={Boolean(open.sheet_synced_at)} label={`Sheet ${open.sheet_synced_at ? fmt(open.sheet_synced_at) : 'not added'}`} />
                </div>
                {open.sync_errors && <p className="text-xs text-amber-700 break-words">{open.sync_errors}</p>}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium text-sm">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {APPLICATION_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: open.id, status: s })}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${open.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <h3 className="font-medium text-sm pt-2">Notes</h3>
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="e.g. Call on 24 Nov — explained schedule and refund window. Will decide by Friday."
                  rows={4}
                />
                <Button
                  size="sm"
                  disabled={update.isPending || notesDraft === (open.admin_notes ?? '')}
                  onClick={() => update.mutate({ id: open.id, admin_notes: notesDraft.trim() || null })}
                >
                  Save notes
                </Button>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
