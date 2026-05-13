import { Star, ArrowRight, Video, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CoachingService } from '@/types';

interface CoachingCardProps {
  service: CoachingService;
}

export default function CoachingCard({ service }: CoachingCardProps) {
  return (
    <a
      href={service.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border bg-coaching p-5 shadow-sm hover:shadow-md transition-all duration-200 relative"
    >
      {service.badge_text && (
        <Badge className="absolute top-4 right-4 bg-secondary text-secondary-foreground text-xs">
          {service.badge_text}
        </Badge>
      )}

      {/* Type & duration */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Video className="h-3.5 w-3.5" />
        <span>{service.platform}</span>
        <span>·</span>
        <Clock className="h-3.5 w-3.5" />
        <span>{service.duration}</span>
      </div>

      {/* Rating */}
      {service.rating && (
        <div className="flex items-center gap-1 mb-2">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="text-sm font-semibold">{service.rating}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-heading font-bold text-base mb-1 group-hover:text-secondary transition-colors">
        {service.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">{service.short_description}</p>

      {/* CTA arrow */}
      <div className="flex items-center justify-end">
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all" />
      </div>
    </a>
  );
}
