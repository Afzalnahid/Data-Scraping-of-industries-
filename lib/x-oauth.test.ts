import { test } from "node:test";
import assert from "node:assert/strict";
import { oauth1Header } from "./platforms/x.ts";

// Worked example from X's "Creating a signature" documentation.
test("oauth1Header matches the documented signature", () => {
  const header = oauth1Header(
    "POST",
    "https://api.twitter.com/1.1/statuses/update.json",
    { include_entities: "true", status: "Hello Ladies + Gentlemen, a signed OAuth request!" },
    {
      key: "xvz1evFS4wEEPTGEFPHBog",
      secret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
      tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
    },
    "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
    "1318622958",
  );
  assert.match(header, /oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"/);
});
