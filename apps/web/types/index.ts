export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  course_count: number;
}

export interface Attachment {
  title: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  duration_seconds: number;
  attachments?: Attachment[];
}

export interface Course {
  id: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url?: string;
  lesson_count: number;
  syllabus: Lesson[];
  outcome: string[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "user" | "admin";
  subscription_status?: string;
  phone_verified?: boolean;
  trial_active?: boolean;
  trial_expires?: string;
}

export interface SubscriptionTier {
  id: string;
  label: string;
  price_per_month: number;
  duration_months: number;
  badge?: string;
  recommended?: boolean;
}

export interface Subscription {
  id: string;
  tier: string;
  status: string;
  starts_at: string;
  ends_at: string;
}

export interface Order {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_provider: string;
  payment_status: string;
  created_at: string;
}

export interface Review {
  id: string;
  name: string;
  role?: string;
  job_title?: string;
  quote?: string;
  comment?: string;
  outcome: string;
  rating?: number;
  verified?: boolean;
  category_id?: string;
  category_name?: string;
  course_title?: string;
}

export interface Progress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  last_position_seconds: number;
  note?: string;
  updated_at: string;
}
