// Decides WHEN and WHAT to post, per platform.
//
// Phase 1 (first EXPLORE_DAYS): spread posts evenly over every time slot,
// content type, language and niche so each gets tried.
// Phase 2: for each dimension independently, pick the option with the best
// average engagement score (epsilon-greedy: EXPLORE_RATE of picks keep
// testing the least-tried option so the tool keeps learning).

export interface HistoryRow {
  slot_hour: number;
  content_type: string;
  language: string;
  niche: string;
  score: number | null;
}

export interface Arms {
  slot_hour: number;
  content_type: string;
  language: string;
  niche: string;
}

export interface Engagement {
  reach?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
}

// Comments and shares signal stronger engagement than a reaction; reach
// rewards posts that got in front of more people.
export function engagementScore(m: Engagement): number {
  return (
    (m.reactions ?? 0) + 2 * (m.comments ?? 0) + 3 * (m.shares ?? 0) + (m.reach ?? 0) / 100
  );
}

type Dim = keyof Arms;

export function dimensionStats(history: HistoryRow[], dim: Dim) {
  const stats = new Map<string, { tried: number; scored: number; total: number }>();
  for (const row of history) {
    const key = String(row[dim]);
    const s = stats.get(key) ?? { tried: 0, scored: 0, total: 0 };
    s.tried += 1;
    if (row.score !== null) {
      s.scored += 1;
      s.total += row.score;
    }
    stats.set(key, s);
  }
  return stats;
}

function pick<T extends string | number>(
  options: T[],
  history: HistoryRow[],
  dim: Dim,
  explore: boolean,
  rng: () => number,
): T {
  const stats = dimensionStats(history, dim);
  const tried = (o: T) => stats.get(String(o))?.tried ?? 0;
  const leastTried = () => {
    const min = Math.min(...options.map(tried));
    const pool = options.filter((o) => tried(o) === min);
    return pool[Math.floor(rng() * pool.length)];
  };
  if (explore) return leastTried();

  let best: T | null = null;
  let bestMean = -Infinity;
  for (const o of options) {
    const s = stats.get(String(o));
    if (!s || s.scored < 2) continue; // need at least 2 measured posts
    const mean = s.total / s.scored;
    if (mean > bestMean) {
      bestMean = mean;
      best = o;
    }
  }
  return best ?? leastTried();
}

export function chooseArms(opts: {
  history: HistoryRow[];
  count: number;
  exploring: boolean;
  epsilon: number;
  slots: number[];
  contentTypes: string[];
  languages: string[];
  niches: string[];
  rng?: () => number;
}): Arms[] {
  const rng = opts.rng ?? Math.random;
  const chosen: Arms[] = [];
  let history = [...opts.history];
  for (let i = 0; i < opts.count; i++) {
    const explore = () => opts.exploring || rng() < opts.epsilon;
    const usedSlots = new Set(chosen.map((c) => c.slot_hour));
    const freeSlots = opts.slots.filter((s) => !usedSlots.has(s));
    const arms: Arms = {
      slot_hour: pick(freeSlots.length ? freeSlots : opts.slots, history, "slot_hour", explore(), rng),
      content_type: pick(opts.contentTypes, history, "content_type", explore(), rng),
      language: pick(opts.languages, history, "language", explore(), rng),
      niche: pick(opts.niches, history, "niche", explore(), rng),
    };
    chosen.push(arms);
    // count today's picks as "tried" so the next pick spreads out
    history = [...history, { ...arms, score: null }];
  }
  return chosen;
}

// Best option per dimension, for the dashboard.
export function insights(history: HistoryRow[]) {
  const dims: Dim[] = ["slot_hour", "content_type", "language", "niche"];
  return dims.map((dim) => {
    const rows = [...dimensionStats(history, dim).entries()]
      .map(([option, s]) => ({
        option,
        tried: s.tried,
        measured: s.scored,
        avgScore: s.scored ? s.total / s.scored : null,
      }))
      .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
    return { dimension: dim, rows };
  });
}
