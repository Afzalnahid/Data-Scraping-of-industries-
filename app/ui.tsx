import { PLATFORM_LABELS, type Platform } from "@/lib/config";
import type { Post } from "@/lib/db";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function fmt(d: Date | null, tzOffset: number) {
  if (!d) return "-";
  return new Date(d.getTime() + tzOffset * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  if (typeof params.msg !== "string") return null;
  return <div className={`flash ${params.ok === "0" ? "flash-error" : ""}`}>{params.msg}</div>;
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return <span className={`badge badge-${platform}`}>{PLATFORM_LABELS[platform] ?? platform}</span>;
}

export function PostMeta({ post, tzOffset }: { post: Post; tzOffset: number }) {
  return (
    <div className="meta">
      <PlatformBadge platform={post.platform} />
      <span className="tag">#{post.id}</span>
      <span className="tag">{post.content_type.replace(/_/g, " ")}</span>
      <span className="tag">{post.language === "bn" ? "বাংলা" : "English"}</span>
      <span className="tag">{post.niche}</span>
      <span className="tag">🕒 {fmt(post.published_at ?? post.scheduled_at, tzOffset)}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}
