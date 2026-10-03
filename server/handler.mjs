import { createClient } from "@supabase/supabase-js";
import {
  hashPin,
  verifyPin,
  hashToken,
  newToken,
  validateScore,
  normalizeJudgeLogin,
} from "./security.mjs";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const publicJudge = "id,name,username,active,created_at";
function client() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HttpError(503, "The portal is awaiting its Supabase connection.");
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function readBody(req) {
  if (req.body)
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20000) throw new HttpError(413, "Request is too large.");
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
function cookie(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("judge_session="))
    ?.slice(14);
}
function setCookie(res, token, age = 604800) {
  res.setHeader(
    "Set-Cookie",
    `judge_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}
async function judgeSession(db, req) {
  const token = cookie(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Please log in to continue.");
  const session = check(
    await db
      .from("judge_sessions")
      .select("judge_id,expires_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle(),
  );
  if (!session || Date.parse(session.expires_at) <= Date.now())
    throw new HttpError(401, "Your session expired. Please log in again.");
  const judge = check(
    await db
      .from("judges")
      .select(publicJudge)
      .eq("id", session.judge_id)
      .maybeSingle(),
  );
  if (!judge?.active)
    throw new HttpError(401, "This judge account is disabled.");
  return judge;
}
async function adminSession(db, req) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Please log in as an administrator.");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session expired. Please log in again.");
  const admin = check(
    await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle(),
  );
  if (!admin)
    throw new HttpError(
      403,
      "This account does not have administrator access.",
    );
  return data.user;
}
async function signedEntries(db) {
  const entries = check(
    await db
      .from("entries")
      .select(
        "id,serial,participant_name,title,category,image_url,original_url,story_images(id,image_url,original_url,image_order)",
      )
      .order("serial"),
  );
  const paths = [
    ...new Set(
      entries
        .flatMap((e) => [
          e.image_url,
          e.original_url,
          ...e.story_images.flatMap((i) => [i.image_url, i.original_url]),
        ])
        .filter(Boolean),
    ),
  ];
  const signed = paths.length
    ? check(await db.storage.from("photos").createSignedUrls(paths, 3600))
    : [];
  if (signed.some((i) => i.error || !i.signedUrl))
    throw new HttpError(
      503,
      "Some photographs could not be loaded. Please retry.",
    );
  const urls = new Map(signed.map((i) => [i.path, i.signedUrl]));
  return entries.map((e) => ({
    ...e,
    image_url: urls.get(e.image_url) || null,
    original_url: urls.get(e.original_url) || null,
    story_images: e.story_images
      .sort((a, b) => a.image_order - b.image_order)
      .map((i) => ({
        ...i,
        image_url: urls.get(i.image_url),
        original_url: urls.get(i.original_url),
      })),
  }));
}
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const send = (value, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(value));
  };
  try {
    const path = new URL(req.url, "http://localhost").pathname.replace(
      /\/$/,
      "",
    );
    const method = req.method || "GET";
    if (path === "/api/config" && method === "GET") {
      const configured = Boolean(
        process.env.VITE_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.VITE_SUPABASE_ANON_KEY,
      );
      return send({
        configured,
        preview:
          !configured &&
          process.env.NODE_ENV !== "production" &&
          process.env.ALLOW_LOCAL_PREVIEW === "true",
      });
    }
    // Cookie-authenticated writes are restricted to the same origin, including login.
    if (!["GET", "HEAD"].includes(method)) {
      const origin = req.headers.origin;
      const allowed =
        process.env.APP_ORIGIN ||
        `${process.env.NODE_ENV === "production" ? "https" : "http"}://${req.headers.host}`;
      if (!origin || origin !== allowed)
        throw new HttpError(403, "Request origin is not allowed.");
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new HttpError(415, "Use a JSON request.");
    }
    const db = client();
    if (path === "/api/judge/login" && method === "POST") {
      const body = await readBody(req);
      let username;
      try {
        username = normalizeJudgeLogin(body.username);
      } catch (error) {
        throw new HttpError(400, error.message);
      }
      const pin = String(body.pin || "");
      if (!/^[a-z0-9_]{2,40}$/.test(username) || !/^\d{4}$/.test(pin))
        throw new HttpError(
          400,
          "Enter your username or email and four-digit PIN.",
        );
      const ip = process.env.VERCEL
        ? String(req.headers["x-forwarded-for"] || "").split(",")[0]
        : req.socket?.remoteAddress || "local";
      for (const key of [`user:${username}`, `ip:${ip}`]) {
        if (
          !check(
            await db.rpc("consume_login_attempt", {
              attempt_key: hashToken(key),
            }),
          )
        )
          throw new HttpError(
            429,
            "Too many login attempts. Please try again in 15 minutes.",
          );
      }
      const judge = check(
        await db
          .from("judges")
          .select("*")
          .eq("username", username)
          .maybeSingle(),
      );
      // Perform the same expensive hash even for unknown usernames.
      const dummy =
        "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
      const valid = await verifyPin(pin, judge?.pin_hash || dummy);
      if (!valid || !judge?.active)
        throw new HttpError(401, "Incorrect username or PIN.");
      if (cookie(req))
        check(
          await db
            .from("judge_sessions")
            .delete()
            .eq("token_hash", hashToken(cookie(req))),
        );
      const token = newToken();
      check(
        await db.from("judge_sessions").insert({
          token_hash: hashToken(token),
          judge_id: judge.id,
          expires_at: new Date(Date.now() + 604800000).toISOString(),
        }),
      );
      setCookie(res, token);
      const { pin_hash, ...safeJudge } = judge;
      return send({ judge: safeJudge });
    }
    if (path === "/api/judge/logout" && method === "POST") {
      if (cookie(req))
        check(
          await db
            .from("judge_sessions")
            .delete()
            .eq("token_hash", hashToken(cookie(req))),
        );
      setCookie(res, "", 0);
      return send({ ok: true });
    }
    if (path.startsWith("/api/judge/")) {
      const judge = await judgeSession(db, req);
      if (path === "/api/judge/me" && method === "GET") return send({ judge });
      if (path === "/api/judge/data" && method === "GET") {
        const [entries, scores] = await Promise.all([
          signedEntries(db),
          db
            .from("scores")
            .select("entry_id,score,remark,updated_at")
            .eq("judge_id", judge.id)
            .then(check),
        ]);
        return send({ entries, scores });
      }
      if (path === "/api/judge/score" && method === "PUT") {
        let value;
        try {
          value = validateScore(await readBody(req));
        } catch (e) {
          throw new HttpError(400, e.message);
        }
        const entry = check(
          await db
            .from("entries")
            .select("id")
            .eq("id", value.entry_id)
            .maybeSingle(),
        );
        if (!entry) throw new HttpError(404, "Entry not found.");
        // Ignore any browser-supplied judge ID. Ownership comes from the verified cookie.
        const score = check(
          await db
            .from("scores")
            .upsert(
              { ...value, judge_id: judge.id },
              { onConflict: "judge_id,entry_id" },
            )
            .select("entry_id,score,remark,updated_at")
            .single(),
        );
        return send({ score });
      }
    }
    if (path.startsWith("/api/admin/")) {
      const admin = await adminSession(db, req);
      if (path === "/api/admin/me" && method === "GET")
        return send({ admin: { id: admin.id, email: admin.email } });
      if (path === "/api/admin/data" && method === "GET") {
        const [entries, judges, scores] = await Promise.all([
          signedEntries(db),
          db.from("judges").select(publicJudge).order("created_at").then(check),
          db
            .from("scores")
            .select("judge_id,entry_id,score,remark,updated_at")
            .order("id")
            .range(0, 999)
            .then(check),
        ]);
        // Supabase defaults to 1,000 rows. Paginate all scores explicitly.
        let all = scores;
        for (
          let offset = scores.length;
          scores.length && offset % 1000 === 0;
          offset += 1000
        ) {
          const batch = check(
            await db
              .from("scores")
              .select("judge_id,entry_id,score,remark,updated_at")
              .order("id")
              .range(offset, offset + 999),
          );
          all = all.concat(batch);
          if (batch.length < 1000) break;
        }
        return send({ entries, judges, scores: all });
      }
      if (path === "/api/admin/judges" && method === "POST") {
        const body = await readBody(req);
        const name = String(body.name || "").trim();
        let username;
        try {
          username = normalizeJudgeLogin(body.username);
        } catch (error) {
          throw new HttpError(400, error.message);
        }
        if (!name || name.length > 150 || !/^[a-z0-9_]{2,40}$/.test(username))
          throw new HttpError(
            400,
            "Enter a name and a valid username or email.",
          );
        let pin_hash;
        try {
          pin_hash = await hashPin(String(body.pin || ""));
        } catch (e) {
          throw new HttpError(400, e.message);
        }
        return send({
          judge: check(
            await db
              .from("judges")
              .insert({ name, username, pin_hash })
              .select(publicJudge)
              .single(),
          ),
        });
      }
      const judgeMatch = path.match(/^\/api\/admin\/judges\/([0-9a-f-]{36})$/i);
      if (judgeMatch && method === "PATCH") {
        const body = await readBody(req);
        const update = {};
        if (typeof body.active === "boolean") update.active = body.active;
        if (body.pin !== undefined) {
          try {
            update.pin_hash = await hashPin(String(body.pin));
          } catch (e) {
            throw new HttpError(400, e.message);
          }
        }
        if (!Object.keys(update).length)
          throw new HttpError(400, "No change supplied.");
        const judge = check(
          await db
            .from("judges")
            .update(update)
            .eq("id", judgeMatch[1])
            .select(publicJudge)
            .single(),
        );
        if (update.pin_hash || update.active === false)
          check(
            await db.from("judge_sessions").delete().eq("judge_id", judge.id),
          );
        return send({ judge });
      }
      const entryMatch = path.match(
        /^\/api\/admin\/entries\/([0-9a-f-]{36})$/i,
      );
      if (entryMatch && method === "PATCH") {
        const body = await readBody(req);
        if (
          typeof body.title !== "string" ||
          typeof body.participant_name !== "string" ||
          !body.title.trim() ||
          !body.participant_name.trim() ||
          body.title.length > 2000 ||
          body.participant_name.length > 150
        )
          throw new HttpError(400, "Enter a participant name and title.");
        return send({
          entry: check(
            await db
              .from("entries")
              .update({
                title: body.title.trim(),
                participant_name: body.participant_name.trim(),
              })
              .eq("id", entryMatch[1])
              .select("id,title,participant_name")
              .single(),
          ),
        });
      }
    }
    throw new HttpError(404, "This endpoint does not exist.");
  } catch (error) {
    if (!error.status) console.error("Portal API:", error.message);
    const duplicate = error.code === "23505";
    send(
      {
        error: error.status
          ? error.message
          : duplicate
            ? "This username or entry already exists."
            : "Something went wrong. Please retry.",
      },
      error.status || (duplicate ? 409 : 500),
    );
  }
}
