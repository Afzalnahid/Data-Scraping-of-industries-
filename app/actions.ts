"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Platform } from "@/lib/config";
import { sql, type Post } from "@/lib/db";
import { planTomorrow, publishDue, publishOne, saveMetrics } from "@/lib/jobs";
import { adapters } from "@/lib/platforms";
import { FIELDS, getSettings, saveSetting, type SectionId } from "@/lib/settings";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const id = (form: FormData) => Number(form.get("id"));

function back(target: string, msg: string, ok = true): never {
  const [path, hash] = target.split("#");
  const q = new URLSearchParams({ msg: msg.slice(0, 600), ok: ok ? "1" : "0" });
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}${hash ? `#${hash}` : ""}`);
}

// ---------- Settings ----------

async function persistSection(form: FormData): Promise<SectionId> {
  const section = String(form.get("section")) as SectionId;
  for (const f of FIELDS.filter((f) => f.section === section)) {
    if (f.type === "secret") {
      const value = String(form.get(f.key) ?? "").trim();
      if (form.get(`${f.key}__clear`)) await saveSetting(f.key, "");
      else if (value) await saveSetting(f.key, value);
    } else if (f.type === "toggle") {
      await saveSetting(f.key, form.get(f.key) ? "true" : "false");
    } else if (f.type === "platforms") {
      await saveSetting(f.key, form.getAll(f.key).map(String).join(","));
    } else {
      await saveSetting(f.key, String(form.get(f.key) ?? "").trim());
    }
  }
  revalidatePath("/", "layout");
  return section;
}

export async function saveSettingsSection(form: FormData) {
  const section = await persistSection(form);
  back(`/settings#${section}`, "Saved.");
}

// Saves the section first so freshly pasted values are what gets tested.
export async function testConnection(form: FormData) {
  const target = await persistSection(form);
  const s = await getSettings();
  let msg: string;
  let ok = true;
  try {
    if (target === "ai") {
      if (!s.anthropicApiKey) throw new Error("Claude API key is not set");
      const model = await new Anthropic({ apiKey: s.anthropicApiKey }).models.retrieve(s.model);
      msg = `Claude API key works (model ${model.id})`;
    } else {
      const adapter = adapters[target as Platform];
      if (!adapter) throw new Error(`Nothing to test for ${target}`);
      msg = await adapter.test(s);
    }
  } catch (err) {
    ok = false;
    msg = String(err);
  }
  back(`/settings#${target}`, msg, ok);
}

// ---------- Jobs ----------

export async function planNow() {
  const { results } = await planTomorrow();
  revalidatePath("/", "layout");
  back("/posts?tab=review", results.join(" · ") || "Nothing to plan.");
}

export async function publishDueNow() {
  const { results } = await publishDue();
  revalidatePath("/", "layout");
  back("/posts?tab=published", results.join(" · ") || "No approved posts are due yet.");
}

// ---------- Posts ----------

async function loadPost(postId: number) {
  const [post] = await sql<Post[]>`SELECT * FROM posts WHERE id = ${postId}`;
  if (!post) throw new Error(`Post #${postId} not found`);
  return post;
}

export async function approvePost(form: FormData) {
  await sql`UPDATE posts SET status = 'approved', body = ${String(form.get("body") ?? "")}
            WHERE id = ${id(form)} AND status = 'draft'`;
  revalidatePath("/", "layout");
  back("/posts?tab=review", `#${id(form)} approved: it will be published at its scheduled time.`);
}

export async function approveAndPublishNow(form: FormData) {
  await sql`UPDATE posts SET status = 'approved', body = ${String(form.get("body") ?? "")}
            WHERE id = ${id(form)} AND status IN ('draft', 'approved', 'failed')`;
  const msg = await publishOne(await loadPost(id(form)), await getSettings());
  revalidatePath("/", "layout");
  back("/posts?tab=review", msg, !msg.includes("failed"));
}

export async function approveAll() {
  const rows = await sql`UPDATE posts SET status = 'approved' WHERE status = 'draft' RETURNING id`;
  revalidatePath("/", "layout");
  back("/posts?tab=scheduled", `${rows.length} post(s) approved.`);
}

export async function rejectPost(form: FormData) {
  await sql`UPDATE posts SET status = 'rejected' WHERE id = ${id(form)} AND status IN ('draft', 'approved', 'failed')`;
  revalidatePath("/", "layout");
  back(String(form.get("back") ?? "/posts"), `#${id(form)} rejected.`);
}

export async function unapprovePost(form: FormData) {
  await sql`UPDATE posts SET status = 'draft' WHERE id = ${id(form)} AND status = 'approved'`;
  revalidatePath("/", "layout");
  back("/posts?tab=scheduled", `#${id(form)} moved back to review.`);
}

// Skool: the user copied the text and posted it by hand.
export async function markManualPosted(form: FormData) {
  await sql`UPDATE posts SET status = 'published', published_at = now()
            WHERE id = ${id(form)} AND status = 'manual'`;
  revalidatePath("/", "layout");
  back("/posts?tab=skool", `#${id(form)} marked as posted.`);
}

export async function enterMetrics(form: FormData) {
  await saveMetrics(
    id(form),
    {
      reach: num(form.get("reach")),
      reactions: num(form.get("reactions")),
      comments: num(form.get("comments")),
      shares: num(form.get("shares")),
    },
    "manual",
  );
  revalidatePath("/", "layout");
  back("/posts?tab=published", `Metrics saved for #${id(form)}.`);
}
