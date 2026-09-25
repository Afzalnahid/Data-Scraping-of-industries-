import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseArms, engagementScore, type HistoryRow } from "./strategy.ts";

const base = {
  slots: [8, 12, 19],
  contentTypes: ["tip", "story"],
  languages: ["en", "bn"],
  niches: ["AI"],
  epsilon: 0,
  rng: () => 0,
};

test("engagementScore weights comments and shares above reactions", () => {
  assert.equal(engagementScore({ reactions: 10, comments: 2, shares: 1, reach: 500 }), 10 + 4 + 3 + 5);
  assert.equal(engagementScore({}), 0);
});

test("exploration picks least-tried options", () => {
  const history: HistoryRow[] = [
    { slot_hour: 8, content_type: "tip", language: "en", niche: "AI", score: 5 },
    { slot_hour: 12, content_type: "tip", language: "en", niche: "AI", score: 5 },
  ];
  const [arms] = chooseArms({ ...base, history, count: 1, exploring: true });
  assert.equal(arms.slot_hour, 19);
  assert.equal(arms.content_type, "story");
  assert.equal(arms.language, "bn");
});

test("exploitation picks the best-scoring option with >=2 measurements", () => {
  const history: HistoryRow[] = [
    { slot_hour: 8, content_type: "tip", language: "en", niche: "AI", score: 1 },
    { slot_hour: 8, content_type: "tip", language: "en", niche: "AI", score: 1 },
    { slot_hour: 19, content_type: "story", language: "bn", niche: "AI", score: 20 },
    { slot_hour: 19, content_type: "story", language: "bn", niche: "AI", score: 30 },
  ];
  const [arms] = chooseArms({ ...base, history, count: 1, exploring: false });
  assert.deepEqual(arms, { slot_hour: 19, content_type: "story", language: "bn", niche: "AI" });
});

test("multiple posts per day use distinct slots", () => {
  const arms = chooseArms({ ...base, history: [], count: 3, exploring: true });
  assert.equal(new Set(arms.map((a) => a.slot_hour)).size, 3);
});
