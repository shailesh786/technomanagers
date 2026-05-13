import { formatDistanceToNow } from 'date-fns';

export function timeAgo(date: string | null) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
