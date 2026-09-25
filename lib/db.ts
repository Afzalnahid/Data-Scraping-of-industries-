import postgres from "postgres";
import type { ContentType, Language, Platform } from "./config";

export const sql = postgres(process.env.DATABASE_URL ?? "", {
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : "require",
  max: 3,
  // Supabase's transaction pooler (port 6543, recommended for serverless)
  // does not support prepared statements.
  prepare: false,
});

export type PostStatus = "draft" | "approved" | "published" | "manual" | "rejected" | "failed";

export interface Post {
  id: number;
  platform: Platform;
  niche: string;
  content_type: ContentType;
  language: Language;
  slot_hour: number;
  scheduled_at: Date;
  status: PostStatus;
  body: string;
  poster_title: string | null;
  external_id: string | null;
  error: string | null;
  created_at: Date;
  published_at: Date | null;
  reach: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  score: number | null;
  metrics_source: string | null;
  metrics_updated_at: Date | null;
}
