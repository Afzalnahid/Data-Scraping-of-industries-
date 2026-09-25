"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { saveMetrics } from "@/lib/jobs";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

export async function approvePost(form: FormData) {
  const id = Number(form.get("id"));
  const body = String(form.get("body") ?? "");
  await sql`UPDATE posts SET status = 'approved', body = ${body} WHERE id = ${id} AND status = 'draft'`;
  revalidatePath("/");
}

export async function rejectPost(form: FormData) {
  await sql`UPDATE posts SET status = 'rejected' WHERE id = ${Number(form.get("id"))} AND status = 'draft'`;
  revalidatePath("/");
}

// Skool: the user copied the text and posted it by hand.
export async function markManualPosted(form: FormData) {
  await sql`UPDATE posts SET status = 'published', published_at = now()
            WHERE id = ${Number(form.get("id"))} AND status = 'manual'`;
  revalidatePath("/");
}

export async function enterMetrics(form: FormData) {
  await saveMetrics(
    Number(form.get("id")),
    {
      reach: num(form.get("reach")),
      reactions: num(form.get("reactions")),
      comments: num(form.get("comments")),
      shares: num(form.get("shares")),
    },
    "manual",
  );
  revalidatePath("/");
}
