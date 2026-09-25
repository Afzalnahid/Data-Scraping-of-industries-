import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Platform } from "./config";
import type { Settings } from "./settings";
import type { Arms } from "./strategy";

const PLATFORM_RULES: Record<Platform, string> = {
  facebook:
    "Facebook Page post. 60-150 words. Strong first-line hook, short paragraphs, a few relevant emojis, end with a call to comment. 2-4 hashtags at the end.",
  linkedin:
    "LinkedIn personal-profile post. 120-250 words. Scroll-stopping first line, one idea per short paragraph with blank lines between, professional but human, no emoji spam, end with a question. 3 hashtags at the end.",
  x: "X (Twitter) post. MAXIMUM 270 characters including hashtags and spaces. Punchy, one idea, 1-2 hashtags.",
  skool:
    "Skool community post. 80-200 words. Conversational, value first, ends with a question that invites members to reply. No hashtags.",
};

const CONTENT_RULES: Record<string, string> = {
  tip: "One specific, actionable tip the reader can apply today.",
  story: "A short first-person style story with a lesson at the end.",
  question: "Open with a thought-provoking question and give a short opinion to spark debate.",
  myth_vs_fact: "Bust one common myth: state the myth, then the fact with a reason.",
  listicle: "A numbered list of 3-5 crisp points.",
  poster_quote: "A memorable one-line insight (also used as poster headline) plus 2-3 lines of context.",
  case_study: "A mini case study: situation, action, result with a concrete (clearly hypothetical if not real) number.",
  behind_the_scenes: "Show how the work is actually done: a process, tool or daily routine.",
};

const LANGUAGE_RULES: Record<string, string> = {
  en: "Write in clear, simple English.",
  bn: "Write in natural, conversational Bangla (বাংলা script). English technical terms may stay in English.",
};

const PostSchema = z.object({
  body: z.string().describe("The complete post text, ready to publish"),
  poster_title: z
    .string()
    .describe("A headline of at most 8 words for an image poster, ALWAYS in English even for Bangla posts"),
});

export type GeneratedPost = z.infer<typeof PostSchema>;

export async function generatePost(
  settings: Settings,
  platform: Platform,
  arms: Arms,
  recentOpenings: string[],
): Promise<GeneratedPost> {
  if (!settings.anthropicApiKey) throw new Error("Claude API key is not set (Settings page)");
  const client = new Anthropic({ apiKey: settings.anthropicApiKey });

  const system = [
    "You write high-engagement social media posts for a personal brand.",
    `Brand voice: ${settings.brandVoice}`,
    "Never invent statistics, quotes or facts presented as real. Hypothetical examples must be clearly framed as such.",
    "Return only the post itself: no preamble, no notes to the author.",
  ].join("\n");

  const prompt = [
    `Platform rules: ${PLATFORM_RULES[platform]}`,
    `Niche: ${arms.niche}`,
    `Format: ${CONTENT_RULES[arms.content_type] ?? arms.content_type}`,
    `Language: ${LANGUAGE_RULES[arms.language] ?? arms.language}`,
    recentOpenings.length
      ? `Avoid repeating these recent posts' topics:\n- ${recentOpenings.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  for (let attempt = 0; attempt < 2; attempt++) {
    const extra =
      attempt > 0 ? "\n\nYour previous draft was too long. It MUST be at most 270 characters." : "";
    const response = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt + extra }],
      output_config: { format: betaZodOutputFormat(PostSchema) },
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`Claude declined: ${response.stop_details?.category ?? "unknown"}`);
    }
    const post = response.parsed_output;
    if (!post) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);
    if (platform !== "x" || post.body.length <= 280) return post;
  }
  throw new Error("X post stayed over 280 characters after a retry");
}
