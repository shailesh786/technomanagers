'use client';

/**
 * components/admin/AdminCohortTestimonials.tsx
 *
 * CRUD for the testimonial wall on /cohort. One list, three card kinds:
 *
 *   Video      paste a YouTube link. The page derives the poster from the video
 *              id, so nothing else is required — a poster upload is only there
 *              for the rare video whose YouTube thumbnail is a bad frame.
 *   Written    a quote plus attribution.
 *   Screenshot a review capture (WhatsApp, LinkedIn, feedback form).
 *
 * Every mutation flushes the cohort page's ISR cache, so edits are live within
 * a second rather than on the next 5-minute rebuild.
 */

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, GripVertical, Youtube, Quote, ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { ImageUpload, uploadImageToBucket } from '@/components/admin/ImageUpload';
import {
  useAllCohortTestimonials, useCreateCohortTestimonial, useUpdateCohortTestimonial,
  useDeleteCohortTestimonial, useToggleCohortTestimonialVisible, useReorderCohortTestimonials,
  type CohortTestimonialInput,
} from '@/hooks/useCohortTestimonials';
import { resolveVideoSource } from '@/lib/youtube';
import type { CohortTestimonial, CohortTestimonialKind } from '@/types';

const BUCKET = 'testimonial-images';

const KINDS: { id: CohortTestimonialKind; label: string; hint: string; icon: typeof Youtube }[] = [
  { id: 'video', label: 'Video', hint: 'A YouTube link', icon: Youtube },
  { id: 'text', label: 'Written', hint: 'A typed-out quote', icon: Quote },
  { id: 'image', label: 'Screenshot', hint: 'A review capture', icon: ImageIcon },
];

type Form = {
  kind: CohortTestimonialKind;
  name: string;
  role: string;
  outcome: string;
  quote: string;
  video_url: string;
  video_length: string;
  image_url: string;
};

const EMPTY: Form = { kind: 'video', name: '', role: '', outcome: '', quote: '', video_url: '', video_length: '', image_url: '' };

function toForm(row: CohortTestimonial): Form {
  return {
    kind: row.kind,
    name: row.name,
    role: row.role,
    outcome: row.outcome,
    quote: row.quote,
    video_url: row.video_url ?? '',
    video_length: row.video_length,
    image_url: row.image_url ?? '',
  };
}

export default function AdminCohortTestimonials() {
  const { data: rows = [], isLoading } = useAllCohortTestimonials();
  const createMut = useCreateCohortTestimonial();
  const updateMut = useUpdateCohortTestimonial();
  const deleteMut = useDeleteCohortTestimonial();
  const toggleMut = useToggleCohortTestimonialVisible();
  const reorderMut = useReorderCohortTestimonials();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CohortTestimonial | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(
    () => ({
      total: rows.length,
      live: rows.filter((r) => r.visible).length,
      video: rows.filter((r) => r.kind === 'video').length,
    }),
    [rows],
  );

  /** Lift `id` out of the list and drop it back in at `to`, then persist. */
  const moveTo = (id: string, to: number) => {
    const from = rows.findIndex((r) => r.id === id);
    const target = Math.max(0, Math.min(to, rows.length - 1));
    if (from < 0 || from === target) return;
    const next = [...rows];
    const [row] = next.splice(from, 1);
    next.splice(target, 0, row);
    reorderMut.mutate(next);
  };

  const open = (row?: CohortTestimonial) => {
    setFile(null);
    setEditing(row ? { id: row.id, form: toForm(row) } : { id: null, form: { ...EMPTY } });
  };

  const patch = (p: Partial<Form>) => setEditing((e) => e && { ...e, form: { ...e.form, ...p } });

  const form = editing?.form;
  const source = form?.kind === 'video' ? resolveVideoSource(form.video_url) : null;

  /** Mirrors the table's payload CHECK so a rejected insert never surprises us. */
  const problem = (() => {
    if (!form) return null;
    if (form.kind === 'text' && !form.quote.trim()) return 'A written testimonial needs a quote.';
    if (form.kind === 'video' && !form.video_url.trim()) return 'Paste the YouTube link for this video.';
    if (form.kind === 'video' && !source) return 'That does not look like a YouTube link (or any playable URL).';
    if (form.kind === 'image' && !form.image_url.trim() && !file) return 'Upload the screenshot, or paste its URL.';
    if (form.kind !== 'image' && !form.name.trim()) return 'Add the reviewer’s name.';
    return null;
  })();

  const save = async () => {
    if (!editing || !form || problem) return;
    setSaving(true);
    try {
      let imageUrl = form.image_url.trim();
      if (file) imageUrl = await uploadImageToBucket(BUCKET, file);

      const existing = editing.id ? rows.find((r) => r.id === editing.id) : undefined;

      const input: CohortTestimonialInput = {
        kind: form.kind,
        // Editing must not republish a row the admin had deliberately hidden;
        // visibility is owned by the switch in the list, not by this form.
        visible: existing?.visible ?? true,
        // New rows land at the end of the stream; existing rows keep their slot.
        display_order: existing?.display_order ?? Math.max(0, ...rows.map((r) => r.display_order)) + 10,
        name: form.name.trim(),
        role: form.role.trim(),
        outcome: form.outcome.trim(),
        quote: form.quote.trim(),
        video_url: form.kind === 'video' ? form.video_url.trim() : null,
        video_length: form.kind === 'video' ? form.video_length.trim() : '',
        image_url: imageUrl || null,
      };

      if (editing.id) {
        await updateMut.mutateAsync({ id: editing.id, ...input });
        toast.success('Testimonial updated');
      } else {
        await createMut.mutateAsync(input);
        toast.success('Testimonial added');
      }
      setEditing(null);
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the testimonial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl">Cohort Testimonials</h2>
          <p className="text-sm text-muted-foreground">
            The review wall on <span className="font-medium">/cohort</span>. Videos, written quotes and screenshots are
            woven into one stream. Drag a row, or use the arrows, to change the order — videos are then spread across
            the wall&apos;s columns automatically so they never clump together.
          </p>
        </div>
        <Button onClick={() => open()} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No testimonials yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            The reviews section is hidden on /cohort until at least one is published.
          </p>
          <Button onClick={() => open()} className="mt-4" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Add the first one
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {counts.live} of {counts.total} live · {counts.video} video{counts.video === 1 ? '' : 's'}
          </p>

          <div className="rounded-xl border divide-y">
            {rows.map((row, i) => {
              const kind = KINDS.find((k) => k.id === row.kind);
              const KindIcon = kind?.icon ?? Quote;
              const preview = row.kind === 'text' ? row.quote : row.quote || row.role || row.video_url || row.image_url || '';
              return (
                <div
                  key={row.id}
                  // Native HTML5 drag — no dependency, and the chevrons above
                  // stay the keyboard- and touch-accessible path to the same
                  // reorder, so nothing is drag-only.
                  draggable
                  onDragStart={(e) => {
                    setDragId(row.id);
                    e.dataTransfer.effectAllowed = 'move';
                    // Firefox ignores dragstart without data set.
                    e.dataTransfer.setData('text/plain', row.id);
                  }}
                  onDragOver={(e) => {
                    if (!dragId || dragId === row.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDropId(row.id);
                  }}
                  onDragLeave={() => setDropId((d) => (d === row.id ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId && dragId !== row.id) moveTo(dragId, i);
                    setDragId(null);
                    setDropId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropId(null);
                  }}
                  className={`flex items-center gap-2 p-3 transition-colors ${row.visible ? '' : 'opacity-55'} ${
                    dragId === row.id ? 'opacity-40' : ''
                  } ${dropId === row.id ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''}`}
                >
                  <GripVertical
                    className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                    aria-hidden
                  />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${row.name || 'testimonial'} up`}
                      disabled={i === 0}
                      onClick={() => moveTo(row.id, i - 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${row.name || 'testimonial'} down`}
                      disabled={i === rows.length - 1}
                      onClick={() => moveTo(row.id, i + 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="hidden flex-col sm:flex">
                    <button
                      type="button"
                      aria-label={`Move ${row.name || 'testimonial'} to the top`}
                      disabled={i === 0}
                      onClick={() => moveTo(row.id, 0)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronsUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${row.name || 'testimonial'} to the bottom`}
                      disabled={i === rows.length - 1}
                      onClick={() => moveTo(row.id, rows.length - 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronsDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <RowThumb row={row} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <KindIcon className="h-3 w-3" /> {kind?.label}
                      </Badge>
                      <span className="truncate text-sm font-medium">{row.name || '—'}</span>
                      {row.outcome && <Badge className="text-[10px]">{row.outcome}</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{preview || '—'}</p>
                  </div>

                  <Switch
                    checked={row.visible}
                    onCheckedChange={(visible) => toggleMut.mutate({ id: row.id, visible })}
                    aria-label={row.visible ? 'Hide from the page' : 'Show on the page'}
                  />
                  <Button size="icon" variant="ghost" onClick={() => open(row)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setPendingDelete(row)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Editor ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit testimonial' : 'Add testimonial'}</DialogTitle>
            <DialogDescription>
              Everything here renders on the cohort page&apos;s review wall.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => patch({ kind: k.id })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        form.kind === k.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <k.icon className="h-4 w-4 mb-1" />
                      <div className="text-sm font-medium">{k.label}</div>
                      <div className="text-[11px] text-muted-foreground">{k.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.kind === 'video' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">YouTube link *</label>
                    <Input
                      value={form.video_url}
                      onChange={(e) => patch({ video_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs">
                      {source?.type === 'youtube' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px text-success" />
                          <span className="text-muted-foreground">
                            Video <code className="font-mono">{source.id}</code> — the poster below is what visitors see
                            until they click. No YouTube player loads before that.
                          </span>
                        </>
                      ) : source?.type === 'file' ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px text-warning" />
                          <span className="text-muted-foreground">
                            Direct media file. It will play, but there is no automatic poster — upload one below.
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Paste the watch, share or Shorts link — all of them work.
                        </span>
                      )}
                    </div>
                    {source?.type === 'youtube' && (
                      <div className="relative mt-2 h-36 w-64 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={form.image_url.trim() || source.posterFallback}
                          alt=""
                          fill
                          sizes="256px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Runtime</label>
                    <Input
                      value={form.video_length}
                      onChange={(e) => patch({ video_length: e.target.value })}
                      placeholder="2:14"
                      className="max-w-[140px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Shown on the play badge. Leave blank for a plain &ldquo;Watch&rdquo; label.
                    </p>
                  </div>
                </>
              )}

              {form.kind === 'text' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Quote *</label>
                  <Textarea value={form.quote} onChange={(e) => patch({ quote: e.target.value })} rows={5} />
                </div>
              )}

              {form.kind === 'image' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Quote (transcription)</label>
                  <Textarea value={form.quote} onChange={(e) => patch({ quote: e.target.value })} rows={3} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional but recommended: what the screenshot says. It becomes the image&apos;s alt text, which is
                    the only part search engines and screen readers can read.
                  </p>
                </div>
              )}

              {form.kind === 'video' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Pull quote</label>
                  <Textarea value={form.quote} onChange={(e) => patch({ quote: e.target.value })} rows={2} />
                  <p className="text-xs text-muted-foreground mt-1">
                    One short line laid over the poster. Keep it under ~120 characters.
                  </p>
                </div>
              )}

              {(form.kind === 'image' || form.kind === 'video') && (
                <div>
                  <label className="text-sm font-medium block mb-1">
                    {form.kind === 'image' ? 'Screenshot *' : 'Poster override'}
                  </label>
                  <ImageUpload
                    bucketName={BUCKET}
                    inputId="testimonial-image"
                    initialUrl={form.image_url}
                    urlValue={form.image_url}
                    selectedFile={file}
                    onFileChange={setFile}
                    onUrlChange={(url) => patch({ image_url: url })}
                  />
                  {form.kind === 'image' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Type the review out in the Quote field below too — neither Google nor a screen reader can read
                      words inside an image, and that text becomes the screenshot&apos;s description.
                    </p>
                  )}
                  {form.kind === 'video' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Worth setting for an older, low-resolution video: YouTube has no 16:9 thumbnail
                      for those, so the card falls back to a 4:3 one and shows black bars.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Name {form.kind !== 'image' && '*'}
                  </label>
                  <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Varun Khanna" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Role</label>
                  <Input value={form.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Product Lead, Google" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Outcome pill</label>
                <Input value={form.outcome} onChange={(e) => patch({ outcome: e.target.value })} placeholder="Offer at eGov Foundation" />
                <p className="text-xs text-muted-foreground mt-1">
                  A concrete result — an offer, a promotion, something shipped. Leave blank for no pill; cards that have
                  one are visually promoted on the wall.
                </p>
              </div>

              {problem && <p className="text-sm text-destructive">{problem}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!!problem || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing?.id ? 'Save changes' : 'Add testimonial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name ? `${pendingDelete.name}’s ` : 'This '}
              testimonial will be removed from the cohort page. This cannot be undone — to take it down temporarily,
              use the visibility switch instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deleteMut.mutateAsync(pendingDelete.id);
                  toast.success('Testimonial deleted');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Could not delete');
                }
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** 48px list thumbnail: the screenshot, the poster override, or YouTube's own. */
function RowThumb({ row }: { row: CohortTestimonial }) {
  const source = row.kind === 'video' ? resolveVideoSource(row.video_url) : null;
  const src =
    row.image_url ?? (source?.type === 'youtube' ? source.posterFallback : null);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Quote className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return <Image src={src} alt="" fill sizes="48px" className="object-cover" />;
}
