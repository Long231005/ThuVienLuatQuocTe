import type { SourceCategory, SourceLink } from '@/lib/schemas';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface TreatyRecord {
  id: string;
  author_id: string;
  author_username: string;
  author_role: UserRole;
  name: string;
  category: SourceCategory;
  date_text: string;
  content: string;
  tags: string[];
  sources: SourceLink[];
  created_at: string;
  updated_at: string;
}

export interface CaseRecord {
  id: string;
  author_id: string;
  author_username: string;
  author_role: UserRole;
  name: string;
  court: string;
  year: number;
  facts: string;
  issues: string;
  holding: string;
  significance: string;
  tags: string[];
  sources: SourceLink[];
  created_at: string;
  updated_at: string;
}

export type DisplayScope = 'all' | 'mine';
