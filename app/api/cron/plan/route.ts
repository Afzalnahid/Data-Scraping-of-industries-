import { cronHandler } from "@/lib/cron";
import { planTomorrow } from "@/lib/jobs";

export const maxDuration = 300;
export const GET = cronHandler(planTomorrow);
