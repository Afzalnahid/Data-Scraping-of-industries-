import type { Platform } from "../config";
import { facebook } from "./facebook";
import { linkedin } from "./linkedin";
import type { PlatformAdapter } from "./types";
import { x } from "./x";

// Skool has no adapter: its posts are published manually from the dashboard.
export const adapters: Partial<Record<Platform, PlatformAdapter>> = { facebook, linkedin, x };
