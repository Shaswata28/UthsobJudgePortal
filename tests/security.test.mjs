import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPin,
  verifyPin,
  hashToken,
  newToken,
  validateScore,
  normalizeJudgeLogin,
} from "../server/security.mjs";
import handler from "../server/handler.mjs";
import { parseJudgeCredentials } from "../scripts/judge-credentials.mjs";
const entry = "22222222-2222-4222-a222-222222222222";
test("email judge logins normalize consistently without conflating domains", () => {
  assert.equal(normalizeJudgeLogin("  Judge_1 "), "judge_1");
  assert.equal(
    normalizeJudgeLogin("Judge@example.com"),
    normalizeJudgeLogin("judge@EXAMPLE.COM"),
  );
  assert.notEqual(
    normalizeJudgeLogin("judge@example.com"),
    normalizeJudgeLogin("judge@other.example"),
  );
  assert.match(normalizeJudgeLogin("judge@example.com"), /^[a-z0-9_]{2,40}$/);
  assert.throws(() => normalizeJudgeLogin("not a login"));
});
test("private judge import parses names and credentials and rejects incomplete or duplicate records", () => {
  const records = parseJudgeCredentials(
    "1. Sample Judge\nemail: sample@example.com\nPIN: 0123\n",
  );
  assert.equal(records[0].name, "Sample Judge");
  assert.equal(records[0].username, normalizeJudgeLogin("sample@example.com"));
  assert.equal(records[0].pin, "0123");
  assert.throws(() => parseJudgeCredentials("Judge\nemail: judge@example.com"));
  assert.throws(() =>
    parseJudgeCredentials(
      "Judge\nemail: same@example.com\nPIN: 0000\nJudge Two\nemail: SAME@example.com\nPIN: 1234",
    ),
  );
});
test("PIN hashes are salted and reject incorrect credentials", async () => {
  const first = await hashPin("0123"),
    second = await hashPin("0123");
  assert.notEqual(first, second);
  assert.equal(await verifyPin("0123", first), true);
  assert.equal(await verifyPin("0124", first), false);
  assert.equal(await verifyPin("123", "bad"), false);
  await assert.rejects(hashPin("12345"));
});
test("zero and remark-only drafts are valid; unsafe scores and extra precision are rejected", () => {
  assert.equal(
    validateScore({ entry_id: entry, score: 0, remark: "" }).score,
    0,
  );
  assert.equal(
    validateScore({ entry_id: entry, score: null, remark: "Draft remark" })
      .score,
    null,
  );
  assert.equal(
    validateScore({ entry_id: entry, score: 9.25, remark: "" }).score,
    9.25,
  );
  for (const score of [-1, 10.01, 8.555, NaN, Infinity, "8.5", undefined])
    assert.throws(() => validateScore({ entry_id: entry, score, remark: "" }));
  assert.throws(() =>
    validateScore({ entry_id: entry, score: 1, remark: "x".repeat(5001) }),
  );
});
test("session tokens have sufficient entropy and only their hashes are stored", () => {
  const first = newToken(),
    second = newToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.notEqual(hashToken(first), first);
  assert.equal(hashToken(first), hashToken(first));
});
function request(url, { method = "GET", body, headers = {} } = {}) {
  let result;
  const req = {
    url,
    method,
    body,
    headers: { host: "localhost:5173", ...headers },
  };
  const res = {
    statusCode: 200,
    setHeader() {},
    end(text) {
      result = { status: this.statusCode, body: JSON.parse(text) };
    },
  };
  return handler(req, res).then(() => result);
}
test("server rejects anonymous score access and cross-origin writes", async () => {
  process.env.SUPABASE_URL = "https://portal-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
  const anonymous = await request("/api/judge/data");
  assert.equal(anonymous.status, 401);
  const spoof = await request("/api/judge/score", {
    method: "PUT",
    body: { judge_id: "someone-else", entry_id: entry, score: 10, remark: "" },
    headers: {
      origin: "http://localhost:5173",
      "content-type": "application/json",
    },
  });
  assert.equal(spoof.status, 401);
  const cross = await request("/api/judge/login", {
    method: "POST",
    body: { username: "imran", pin: "4821" },
    headers: {
      origin: "https://unrelated.example",
      "content-type": "application/json",
    },
  });
  assert.equal(cross.status, 403);
  const admin = await request("/api/admin/data");
  assert.equal(admin.status, 401);
});
test("score ownership comes from the verified session, never the request body", async () => {
  const owner = "11111111-1111-4111-a111-111111111111";
  let written;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    let response = [];
    if (url.includes("/judge_sessions?"))
      response = {
        judge_id: owner,
        expires_at: new Date(Date.now() + 10000).toISOString(),
      };
    else if (url.includes("/judges?"))
      response = { id: owner, name: "Judge", username: "judge", active: true };
    else if (url.includes("/entries?")) response = { id: entry };
    else if (url.includes("/scores?")) {
      written = JSON.parse(options.body);
      response = { ...written, updated_at: new Date().toISOString() };
    } else throw new Error(`Unexpected Supabase request: ${url}`);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await request("/api/judge/score", {
      method: "PUT",
      body: {
        judge_id: "different-judge",
        entry_id: entry,
        score: 9.25,
        remark: "Good",
      },
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/json",
        cookie: `judge_session=${newToken()}`,
      },
    });
    assert.equal(result.status, 200);
    assert.equal(written.judge_id, owner);
    assert.equal(written.score, 9.25);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
