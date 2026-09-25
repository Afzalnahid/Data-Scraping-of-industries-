import { test } from "node:test";
import assert from "node:assert/strict";
import { decrypt, encrypt } from "./crypto.ts";

test("encrypt/decrypt round-trips and uses a fresh IV", () => {
  const a = encrypt("sk-ant-secret", "master");
  const b = encrypt("sk-ant-secret", "master");
  assert.notEqual(a, b);
  assert.equal(decrypt(a, "master"), "sk-ant-secret");
});

test("decrypt fails with the wrong master secret", () => {
  assert.throws(() => decrypt(encrypt("x", "right"), "wrong"));
});
