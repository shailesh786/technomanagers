'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  HERO_ICONS,
  HERO_TAG_COLORS,
  formatScheduleLabel,
  heroTagTextColor,
  istIsoFromLocalInput,
  localInputFromIso,
} from '@/lib/hero';
import { cropImageTo16x9 } from '@/lib/crop-image';
import { HERO_FALLBACK_GRADIENT, heroGlyph } from '@/components/home/HeroCard';
import { uploadImageToBucket } from '@/components/admin/ImageUpload';
import {
  useAllHeroItems,
  useDeleteHeroItem,
  useMoveHeroItem,
  useSaveHeroItem,
  useToggleHeroItemVisibility,
} from '@/hooks/useHeroItems';
import type { HeroItem } from '@/types';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // recompressed to webp client-side

const SLOTS = [1, 2, 3] as const;

/** Editor form state — a draft copy of the selected item (unsaved edits). */
type Draft = {
  kind: string;
  title: string;
  subtitle: string;
  meta: string;
  cta_label: string;
  cta_href: string;
  tag_label: string;
  tag_color: string;
  icon: string;
  surface: 'white' | 'navy';
  image_url: string | null;
  /** Cropped-but-not-yet-uploaded image (uploaded on Save). */
  imageBlob: Blob | null;
  imagePreview: string | null;
  show_from_input: string;
  hide_after_input: string;
};

const EMPTY_DRAFT: Draft = {
  kind: '',
  title: '',
  subtitle: '',
  meta: '',
  cta_label: '',
  cta_href: '',
  tag_label: '',
  tag_color: HERO_TAG_COLORS[0],
  icon: HERO_ICONS[0],
  surface: 'white',
  image_url: null,
  imageBlob: null,
  imagePreview: null,
  show_from_input: '',
  hide_after_input: '',
};

function draftFromItem(item: HeroItem): Draft {
  return {
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    meta: item.meta,
    cta_label: item.cta_label,
    cta_href: item.cta_href,
    tag_label: item.tag_label ?? '',
    tag_color: item.tag_color,
    icon: item.icon,
    surface: item.surface,
    image_url: item.image_url,
    imageBlob: null,
    imagePreview: null,
    show_from_input: localInputFromIso(item.show_from),
    hide_after_input: localInputFromIso(item.hide_after),
  };
}

/** 48×28 gradient/image thumbnail used in slot and bench rows. */
function ItemThumb({ item }: { item: HeroItem }) {
  const Glyph = heroGlyph(item.icon);
  return (
    <div
      className="flex h-7 w-12 flex-none items-center justify-center overflow-hidden rounded-md text-white/85"
      style={item.image_url ? undefined : { backgroundImage: HERO_FALLBACK_GRADIENT }}
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Glyph className="h-3.5 w-3.5" strokeWidth={2} />
      )}
    </div>
  );
}

function TagChip({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block max-w-full truncate rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.11em]',
        className,
      )}
      style={{ backgroundColor: color, color: heroTagTextColor(color) }}
    >
      {label}
    </span>
  );
}

export default function AdminHeroBoard() {
  const { data: items = [], isLoading, isError, error } = useAllHeroItems();
  const saveMut = useSaveHeroItem();
  const toggleMut = useToggleHeroItemVisibility();
  const moveMut = useMoveHeroItem();
  const deleteMut = useDeleteHeroItem();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showBench, setShowBench] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const slotted = useMemo(
    () => new Map(items.filter((i) => i.priority !== null).map((i) => [i.priority as number, i])),
    [items],
  );
  const bench = useMemo(() => items.filter((i) => i.priority === null), [items]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  // Default selection: the slot-1 item (or first available) once data loads.
  useEffect(() => {
    if (!isNew && !selected && items.length > 0) {
      const first = SLOTS.map((s) => slotted.get(s)).find(Boolean) ?? items[0];
      if (first) setSelectedId(first.id);
    }
  }, [items, selected, isNew, slotted]);

  // Re-derive the draft when the selection changes. The ref guard keeps
  // background refetches (new array identities, same id) from clobbering
  // unsaved edits, while still deriving late when the selected row only
  // arrives after a refetch (e.g. right after saving a new item).
  const lastDerivedId = useRef<string | null>('__none__');
  useEffect(() => {
    const sourceId = isNew ? '__new__' : selected?.id ?? null;
    if (lastDerivedId.current === sourceId) return;
    lastDerivedId.current = sourceId;
    if (sourceId === '__new__') setDraft({ ...EMPTY_DRAFT });
    else if (selected) setDraft(draftFromItem(selected));
    else setDraft(null);
  }, [isNew, selected]);

  // Object-URL lifecycle for the not-yet-uploaded image preview.
  useEffect(
    () => () => {
      if (draft?.imagePreview) URL.revokeObjectURL(draft.imagePreview);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft?.imagePreview],
  );

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const selectItem = (item: HeroItem) => {
    setIsNew(false);
    setSelectedId(item.id);
  };

  const startNew = () => {
    setIsNew(true);
    setSelectedId(null);
  };

  const cancelEdits = () => {
    if (isNew) {
      setIsNew(false);
      const first = SLOTS.map((s) => slotted.get(s)).find(Boolean) ?? items[0];
      setSelectedId(first?.id ?? null);
    } else if (selected) {
      setDraft(draftFromItem(selected));
    }
  };

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Unsupported format — use PNG, JPG or WebP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File is too large. Maximum size is 5MB.');
      return;
    }
    try {
      const blob = await cropImageTo16x9(file);
      set({ imageBlob: blob, imagePreview: URL.createObjectURL(blob), image_url: null });
    } catch {
      toast.error('Could not read that image.');
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    const showFrom = istIsoFromLocalInput(draft.show_from_input);
    const hideAfter = istIsoFromLocalInput(draft.hide_after_input);
    if (showFrom && hideAfter && showFrom >= hideAfter) {
      toast.error('“Hide after” must be later than “Show from”.');
      return;
    }
    try {
      let imageUrl = draft.image_url;
      if (draft.imageBlob) {
        const file = new File([draft.imageBlob], 'hero.webp', { type: 'image/webp' });
        imageUrl = await uploadImageToBucket('hero-images', file, selected?.id);
      }
      const savedId = await saveMut.mutateAsync({
        id: isNew ? undefined : selected?.id,
        kind: draft.kind.trim(),
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        meta: draft.meta.trim(),
        cta_label: draft.cta_label.trim(),
        cta_href: draft.cta_href.trim(),
        tag_label: draft.tag_label.trim() ? draft.tag_label.trim().toUpperCase() : null,
        tag_color: draft.tag_color,
        image_url: imageUrl,
        icon: draft.icon,
        surface: draft.surface,
        show_from: showFrom,
        hide_after: hideAfter,
      });
      toast.success(isNew ? 'Item created — it starts on the bench' : 'Item saved');
      if (isNew) {
        setIsNew(false);
        setSelectedId(savedId);
        setShowBench(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const move = (id: string, priority: number | null) => {
    moveMut.mutate(
      { id, priority },
      {
        onSuccess: () =>
          toast.success(priority === null ? 'Moved to bench' : `Promoted to slot ${priority}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Move failed'),
      },
    );
  };

  const remove = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success('Item deleted');
        if (selectedId === id) setSelectedId(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
    });
  };

  const previewNavy = draft?.surface === 'navy';
  const PreviewGlyph = heroGlyph(draft?.icon ?? HERO_ICONS[0]);
  const previewImage = draft?.imagePreview ?? draft?.image_url ?? null;
  const editorLabel = isNew ? 'NEW ITEM' : selected?.priority ? `SLOT ${selected.priority}` : 'BENCH';

  if (isError) {
    return (
      <div className="max-w-2xl space-y-2">
        <h2 className="font-heading text-2xl font-extrabold">Homepage Hero</h2>
        <p className="text-sm text-destructive">
          Could not load hero items — has the hero_items migration been applied?
        </p>
        <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-extrabold">Homepage Hero</h2>
        <p className="text-sm text-muted-foreground">
          Three priority slots render on the homepage — desktop shows all three side by side,
          mobile swipes through them. Everything else waits on the bench.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[660px] w-full max-w-[960px]" />
      ) : (
        <div className="grid max-w-[960px] overflow-hidden rounded-xl border bg-background shadow-sm lg:min-h-[660px] lg:grid-cols-[1fr_372px]">
          {/* ── Left: slot list ─────────────────────────────────────────── */}
          <div className="p-6 lg:p-[30px] lg:pr-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold tracking-[-0.015em]">Hero Slots</h3>
                <p className="text-[13px] text-muted-foreground">
                  Three slots, filled by priority. Bench items appear only when promoted.
                </p>
              </div>
              <Button onClick={startNew} className="h-9 flex-none px-4 text-[13px] font-semibold">
                <Plus className="mr-1 h-4 w-4" /> New item
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[74px_minmax(0,1fr)_96px_52px] items-center gap-3 px-3.5 py-3 font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/70 sm:grid-cols-[74px_minmax(0,1fr)_100px_96px_52px]">
              <span>SLOT</span>
              <span>ITEM</span>
              <span className="hidden sm:block">TAG</span>
              <span>SCHEDULE</span>
              <span className="text-right">ON</span>
            </div>

            {/* Slot rows */}
            <div className="space-y-2">
              {SLOTS.map((slot) => {
                const item = slotted.get(slot);
                if (!item) {
                  return (
                    <div
                      key={slot}
                      className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 px-3.5 py-[18px]"
                    >
                      <span className="font-mono text-[9px] font-semibold tracking-[0.1em] text-muted-foreground/70">
                        PRIORITY {slot}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">
                        Empty — promote an item from the bench
                      </span>
                    </div>
                  );
                }
                const isSelected = !isNew && selectedId === item.id;
                return (
                  <div
                    key={slot}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectItem(item);
                      }
                    }}
                    className={cn(
                      'grid cursor-pointer grid-cols-[74px_minmax(0,1fr)_96px_52px] items-center gap-3 rounded-xl border bg-background px-3.5 py-3 transition-colors duration-200 sm:grid-cols-[74px_minmax(0,1fr)_100px_96px_52px]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      isSelected ? 'border-secondary bg-secondary/10' : 'hover:bg-muted/60',
                      !item.visible && 'opacity-55',
                    )}
                  >
                    <span className="font-mono text-[9px] font-semibold tracking-[0.1em] text-muted-foreground/70">
                      PRIORITY {slot}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <ItemThumb item={item} />
                      <div className="min-w-0">
                        <div className="truncate font-heading text-[13.5px] font-semibold text-foreground">
                          {item.title}
                        </div>
                        <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                          {item.kind}
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      {item.tag_label && <TagChip label={item.tag_label} color={item.tag_color} />}
                    </div>
                    <span
                      className={cn(
                        'truncate text-[12.5px]',
                        item.show_from || item.hide_after
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatScheduleLabel(item.show_from, item.hide_after)}
                    </span>
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={item.visible}
                        onCheckedChange={(visible) => toggleMut.mutate({ id: item.id, visible })}
                        className="data-[state=checked]:bg-secondary"
                        aria-label={`Slot ${slot} visibility`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bench strip */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-muted-foreground/30 px-4 py-3.5">
              <span className="text-[12.5px] text-muted-foreground">
                Bench — {bench.length === 0 ? 'empty' : `${bench.length} item${bench.length === 1 ? '' : 's'} ready, none shown`}
              </span>
              <Button
                variant="outline"
                onClick={() => setShowBench((v) => !v)}
                className="h-8 px-3.5 text-[12.5px] font-semibold"
              >
                {showBench ? 'Hide bench' : 'Manage bench'}
              </Button>
            </div>

            {/* Bench list */}
            {showBench && (
              <div className="mt-3 space-y-2">
                {bench.length === 0 && (
                  <p className="px-3.5 py-2 text-[12.5px] text-muted-foreground">
                    Nothing on the bench. “New item” adds one here.
                  </p>
                )}
                {bench.map((item) => {
                  const isSelected = !isNew && selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectItem(item);
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-3.5 py-3 transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isSelected ? 'border-secondary bg-secondary/10' : 'hover:bg-muted/60',
                      )}
                    >
                      <ItemThumb item={item} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-heading text-[13.5px] font-semibold text-foreground">
                          {item.title}
                        </div>
                        <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                          {item.kind}
                        </div>
                      </div>
                      {item.tag_label && (
                        <TagChip label={item.tag_label} color={item.tag_color} className="hidden sm:inline-block" />
                      )}
                      <div className="flex flex-none items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="mr-1 font-mono text-[9px] font-semibold tracking-[0.1em] text-muted-foreground/70">
                          TO SLOT
                        </span>
                        {SLOTS.map((slot) => (
                          <Button
                            key={slot}
                            variant="outline"
                            size="sm"
                            disabled={moveMut.isPending}
                            onClick={() => move(item.id, slot)}
                            className="h-7 w-7 p-0 text-[12px] font-semibold"
                            aria-label={`Promote “${item.title}” to slot ${slot}`}
                          >
                            {slot}
                          </Button>
                        ))}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label={`Delete “${item.title}”`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{item.title}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the item and its content. It is not on the
                                homepage (bench items never render).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
              Hidden items keep their content and priority. An item with a schedule window
              auto-hides outside it (times in IST). Homepage updates within a few seconds of a
              change.
            </p>
          </div>

          {/* ── Right: editor panel ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-t bg-muted p-6 lg:border-l lg:border-t-0 lg:px-[26px] lg:py-[30px]">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-base font-bold">
                {isNew ? 'New item' : 'Edit item'}
              </h4>
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/70">
                {draft ? editorLabel : ''}
              </span>
            </div>

            {!draft ? (
              <p className="text-[13px] text-muted-foreground">
                Select a slot or bench item to edit it, or create a new one.
              </p>
            ) : (
              <>
                {/* Live preview — bound to the unsaved draft */}
                <div className="rounded-xl border bg-background p-3.5">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/70">
                    LIVE PREVIEW
                  </span>
                  <div
                    className={cn(
                      'mt-2 overflow-hidden rounded-lg border',
                      previewNavy ? 'bg-primary' : 'bg-background',
                    )}
                  >
                    <div
                      className="relative flex aspect-video items-center justify-center text-white/70"
                      style={previewImage ? undefined : { backgroundImage: HERO_FALLBACK_GRADIENT }}
                    >
                      {previewImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          <PreviewGlyph className="h-[22px] w-[22px]" strokeWidth={2} />
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] font-medium tracking-[0.1em]">
                            IMAGE · 16:9
                          </span>
                        </>
                      )}
                      {draft.tag_label.trim() && (
                        <TagChip
                          label={draft.tag_label}
                          color={draft.tag_color}
                          className="absolute right-2.5 top-2.5 max-w-[70%]"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3.5">
                      {draft.kind.trim() && (
                        <span
                          className={cn(
                            'font-mono text-[9px] font-semibold uppercase tracking-[0.12em]',
                            previewNavy ? 'text-accent' : 'text-muted-foreground',
                          )}
                        >
                          {draft.kind}
                        </span>
                      )}
                      <span
                        className={cn(
                          'font-heading text-base font-bold leading-tight',
                          previewNavy ? 'text-primary-foreground' : 'text-foreground',
                        )}
                      >
                        {draft.title.trim() || 'Untitled item'}
                      </span>
                      {draft.subtitle.trim() && (
                        <p
                          className={cn(
                            'text-xs leading-normal',
                            previewNavy ? 'text-primary-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          {draft.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-kind" className="text-xs font-semibold text-foreground">
                    Kind / eyebrow
                  </label>
                  <Input
                    id="hero-kind"
                    value={draft.kind}
                    onChange={(e) => set({ kind: e.target.value })}
                    placeholder="e.g. COURSE · 12 MODULES"
                    className="h-[38px] bg-background text-[13px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-title" className="text-xs font-semibold text-foreground">
                    Title
                  </label>
                  <Input
                    id="hero-title"
                    value={draft.title}
                    onChange={(e) => set({ title: e.target.value })}
                    className="h-[38px] bg-background text-[13px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-subtitle" className="text-xs font-semibold text-foreground">
                    Subtitle
                  </label>
                  <Textarea
                    id="hero-subtitle"
                    value={draft.subtitle}
                    onChange={(e) => set({ subtitle: e.target.value })}
                    rows={2}
                    className="resize-none bg-background text-[13px] leading-normal"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hero-meta" className="text-xs font-semibold text-foreground">
                    Meta line
                  </label>
                  <Input
                    id="hero-meta"
                    value={draft.meta}
                    onChange={(e) => set({ meta: e.target.value })}
                    placeholder="e.g. From ₹4,999 · lifetime access"
                    className="h-[38px] bg-background text-[13px]"
                  />
                </div>

                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor="hero-tag" className="text-xs font-semibold text-foreground">
                      Tag label
                    </label>
                    <Input
                      id="hero-tag"
                      value={draft.tag_label}
                      onChange={(e) => set({ tag_label: e.target.value.toUpperCase() })}
                      placeholder="e.g. BESTSELLER"
                      className="h-[38px] bg-background font-mono text-[11px] font-semibold tracking-[0.08em]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pb-1.5">
                    {HERO_TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Tag colour ${color}`}
                        onClick={() => set({ tag_color: color })}
                        className={cn(
                          'h-[26px] w-[26px] rounded-full transition-shadow duration-200',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          draft.tag_color.toUpperCase() === color
                            ? 'ring-2 ring-foreground ring-offset-1'
                            : 'ring-1 ring-foreground/10',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Card surface</span>
                    <div className="grid h-[38px] grid-cols-2 overflow-hidden rounded-lg border bg-background">
                      {(['white', 'navy'] as const).map((surface) => (
                        <button
                          key={surface}
                          type="button"
                          onClick={() => set({ surface })}
                          aria-pressed={draft.surface === surface}
                          className={cn(
                            'text-[12.5px] font-semibold capitalize transition-colors duration-200',
                            draft.surface === surface
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {surface}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hero-icon" className="text-xs font-semibold text-foreground">
                      Fallback glyph
                    </label>
                    <select
                      id="hero-icon"
                      value={draft.icon}
                      onChange={(e) => set({ icon: e.target.value })}
                      className="h-[38px] rounded-lg border border-input bg-background px-3 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {HERO_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image dropzone — enforced 16:9 via client-side crop */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">Image · 16:9</span>
                  {previewImage ? (
                    <div className="relative overflow-hidden rounded-[10px] border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImage} alt="" className="aspect-video w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => set({ imageBlob: null, imagePreview: null, image_url: null })}
                        aria-label="Remove image"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:opacity-90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => document.getElementById('hero-image-input')?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          document.getElementById('hero-image-input')?.click();
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) void handleFile(file);
                      }}
                      className="flex h-[78px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-muted-foreground/30 bg-background text-xs text-muted-foreground/70 transition-colors duration-200 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Plus className="h-[18px] w-[18px]" />
                      <span>Drop a 16:9 image, or browse</span>
                    </div>
                  )}
                  <input
                    id="hero-image-input"
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = '';
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground/70">
                    Wider or taller images are centre-cropped to 16:9 automatically.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hero-cta-label" className="text-xs font-semibold text-foreground">
                      CTA label
                    </label>
                    <Input
                      id="hero-cta-label"
                      value={draft.cta_label}
                      onChange={(e) => set({ cta_label: e.target.value })}
                      placeholder="Start Course"
                      className="h-[38px] bg-background text-[13px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hero-cta-href" className="text-xs font-semibold text-foreground">
                      CTA link
                    </label>
                    <Input
                      id="hero-cta-href"
                      value={draft.cta_href}
                      onChange={(e) => set({ cta_href: e.target.value })}
                      placeholder="/courses"
                      className="h-[38px] bg-background text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hero-show-from" className="text-xs font-semibold text-foreground">
                      Show from (IST)
                    </label>
                    <Input
                      id="hero-show-from"
                      type="datetime-local"
                      value={draft.show_from_input}
                      onChange={(e) => set({ show_from_input: e.target.value })}
                      className="h-[38px] bg-background text-[13px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="hero-hide-after" className="text-xs font-semibold text-foreground">
                      Hide after (IST)
                    </label>
                    <Input
                      id="hero-hide-after"
                      type="datetime-local"
                      value={draft.hide_after_input}
                      onChange={(e) => set({ hide_after_input: e.target.value })}
                      className="h-[38px] bg-background text-[13px]"
                    />
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-muted-foreground/70">
                  Leave blank for “always on”. Outside the window the card auto-hides.
                </p>

                {/* Footer actions */}
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <Button
                    onClick={save}
                    disabled={saveMut.isPending}
                    className="h-10 px-[18px] text-[13px] font-semibold"
                  >
                    {saveMut.isPending ? 'Saving…' : 'Save item'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEdits}
                    className="h-10 px-[18px] text-[13px] font-semibold"
                  >
                    Cancel
                  </Button>
                  {!isNew && selected?.priority != null && (
                    <button
                      type="button"
                      onClick={() => move(selected.id, null)}
                      className="ml-auto text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Move to bench
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
