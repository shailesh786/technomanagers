'use client';

/**
 * components/cohort/TestimonialLightbox.tsx
 *
 * The player/viewer that opens when a visitor clicks a video or screenshot
 * card on the cohort testimonial wall.
 *
 * This module is `next/dynamic`-imported by CohortTestimonials with ssr:false,
 * so neither Radix Dialog nor the YouTube iframe is in the cohort page's
 * initial bundle — they arrive only once someone actually opens a testimonial.
 * That keeps the wall's cost on first load down to HTML plus lazy images.
 */

import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { resolveVideoSource } from '@/lib/youtube';
import type { CohortTestimonial } from '@/types';

interface Props {
  item: CohortTestimonial;
  onClose: () => void;
}

export default function TestimonialLightbox({ item, onClose }: Props) {
  const source = item.kind === 'video' ? resolveVideoSource(item.video_url) : null;
  const label = [item.name, item.role].filter(Boolean).join(' — ') || 'Cohort testimonial';

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={
          item.kind === 'image'
            ? 'max-w-3xl border-none bg-transparent p-0 shadow-none sm:rounded-none'
            : 'max-w-4xl overflow-hidden border-none bg-black p-0'
        }
      >
        {/* Radix requires a title for the dialog's accessible name; the visual
            attribution already sits on the card behind the overlay. */}
        <DialogTitle className="sr-only">{label}</DialogTitle>

        {item.kind === 'image' && item.image_url && (
          <div className="relative h-[80vh] w-full">
            <Image
              src={item.image_url}
              alt={label}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
          </div>
        )}

        {source?.type === 'youtube' && (
          <div className="relative aspect-video w-full">
            <iframe
              src={source.embedUrl}
              title={label}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        {source?.type === 'file' && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={source.src}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] w-full bg-black"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
