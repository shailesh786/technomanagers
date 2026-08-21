/**
 * lib/youtube.ts — resolve an admin-pasted video link into something the
 * testimonial wall can render.
 *
 * The wall never mounts a YouTube iframe on load: it paints a poster image and
 * only swaps in the player after a click (see CohortTestimonialLightbox). A
 * YouTube embed pulls ~1 MB of third-party JS, so a page with four of them
 * would lose its LCP and TBT budget before a visitor watches anything.
 *
 * Everything here is pure and synchronous — parsing happens at render time,
 * which keeps `video_url` the single source of truth in the database with no
 * derived column to drift out of sync.
 */

export type VideoSource =
  | {
      type: 'youtube';
      /** 11-character YouTube video id */
      id: string;
      /** Canonical watch URL — used as the <a href> so the card works without JS */
      watchUrl: string;
      /** Privacy-preserving embed URL, only ever loaded after a click */
      embedUrl: string;
      /** Highest-resolution poster; not present for every video, hence posterFallback */
      poster: string;
      /** 480x360 poster that YouTube generates for every video */
      posterFallback: string;
    }
  | {
      type: 'file';
      /** Direct media URL played in a <video> element */
      src: string;
    };

/**
 * Matches every YouTube URL shape we can reasonably receive from an admin:
 * watch?v=, youtu.be/, /embed/, /shorts/, /live/ — with or without www, and
 * with any trailing query string or timestamp.
 */
const YOUTUBE_ID = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/** File extensions a browser can play in a <video> element. */
const MEDIA_EXTENSION = /\.(mp4|m4v|webm|ogv|ogg|mov)$/i;

/** Returns the 11-char video id, or null when the URL is not a YouTube link. */
export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = YOUTUBE_ID.exec(url.trim());
  return match ? match[1] : null;
}

/**
 * Classifies a testimonial's `video_url`.
 *
 * YouTube is the documented path for new testimonials. Direct media URLs are
 * still supported because the three testimonials that predate this table are
 * Cloudinary MP4s — they keep working until someone re-points them at YouTube.
 *
 * Returns null for an empty or unusable URL so callers can skip the card.
 */
export function resolveVideoSource(url: string | null | undefined): VideoSource | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const id = parseYouTubeId(trimmed);
  if (id) {
    return {
      type: 'youtube',
      id,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      // youtube-nocookie.com does not write tracking cookies until playback,
      // and `rel=0` keeps the end screen on this channel's own videos.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`,
      // maxresdefault is 1280x720 and genuinely 16:9. YouTube only generates
      // it for uploads with enough source resolution, so the poster component
      // falls back to hqdefault, which exists for every video.
      //
      // Expect one logged 404 the first time a low-resolution video is shown —
      // that is the fallback firing, not a fault. hqdefault is 480x360, i.e.
      // the 16:9 frame letterboxed into 4:3, so it shows black bars on the
      // card. Uploading a poster override in /admin is the fix for the rare
      // old video where that looks bad.
      poster: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      posterFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Anything else must be a direct media file. Requiring both an http(s)
  // scheme and a playable extension stops two different mistakes: a
  // `javascript:` row becoming an href, and a pasted *page* URL (a Vimeo or
  // LinkedIn link) becoming a <video src> that renders a permanently broken
  // player. Rejecting here surfaces as a clear validation error in /admin.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  const path = trimmed.split(/[?#]/)[0];
  if (!MEDIA_EXTENSION.test(path)) return null;
  return { type: 'file', src: trimmed };
}
