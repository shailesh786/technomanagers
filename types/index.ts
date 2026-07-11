export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  commenting_disabled?: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Question {
  id: string;
  question_text: string;
  company: string[] | null;
  category: string[] | null;
  tags: string[] | null;
  difficulty: string | null;
  role: string | null;
  sample_answer: string | null;
  status: string | null;
  upvotes: number | null;
  created_at: string | null;
  updated_at: string | null;
  /** Non-deleted comment count — present on list queries (question_comments(count) embed). */
  comment_count?: number;
}

export interface Course {
  id: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  thumbnail_url: string | null;
  external_url: string;
  category: string | null;
  display_order: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CoachingService {
  id: string;
  title: string;
  service_type: string | null;
  short_description: string | null;
  price: number | null;
  original_price: number | null;
  duration: string | null;
  platform: string | null;
  rating: number | null;
  external_url: string;
  badge_text: string | null;
  display_order: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  event_date: string;
  duration: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  status: string | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HeroSlide {
  id: string;
  title: string;
  highlight: string | null;
  description: string;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CohortSettings {
  id: string;
  apply_url: string;
  whatsapp_url: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface SavedQuestion {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string | null;
}
