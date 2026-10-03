import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { hashPin, verifyPin } from "../server/security.mjs";
import { parseJudgeCredentials } from "./judge-credentials.mjs";

const records = parseJudgeCredentials(
  await readFile("Judge login.txt", "utf8"),
);
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: existing, error } = await db
  .from("judges")
  .select("id,username,pin_hash,active");
if (error) throw new Error("Unable to read judge accounts.");
// Verify existing records first; never reset someone's PIN as a side effect of importing.
for (const record of records) {
  const account = existing.find((judge) => judge.username === record.username);
  if (
    account &&
    (!account.active || !(await verifyPin(record.pin, account.pin_hash)))
  )
    throw new Error(
      "An existing judge account differs from the file. Use admin account management to change it.",
    );
}
const newRecords = [];
for (const record of records.filter(
  (record) => !existing.some((judge) => judge.username === record.username),
))
  newRecords.push({
    name: record.name,
    username: record.username,
    pin_hash: await hashPin(record.pin),
    active: true,
  });
if (newRecords.length) {
  const { error } = await db.from("judges").insert(newRecords);
  if (error)
    throw new Error(
      "Unable to import judge accounts. No credentials were printed.",
    );
}
console.log(
  JSON.stringify({
    judgesInFile: records.length,
    added: newRecords.length,
    existingVerified: records.length - newRecords.length,
    pinsStoredAs: "salted scrypt hashes",
  }),
);
