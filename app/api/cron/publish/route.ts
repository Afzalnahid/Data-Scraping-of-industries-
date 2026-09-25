import { cronHandler } from "@/lib/cron";
import { publishDue } from "@/lib/jobs";

export const maxDuration = 300;
export const GET = cronHandler(publishDue);
