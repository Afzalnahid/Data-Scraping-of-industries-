import { cronHandler } from "@/lib/cron";
import { collectMetrics } from "@/lib/jobs";

export const maxDuration = 300;
export const GET = cronHandler(collectMetrics);
