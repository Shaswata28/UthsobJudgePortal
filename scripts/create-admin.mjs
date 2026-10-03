import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const input = createInterface({ input: process.stdin, output: process.stdout });
const email = (await input.question("Existing Supabase Auth admin email: "))
  .trim()
  .toLowerCase();
input.close();
let user;
for (let page = 1; !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (data.users.length < 100) break;
}
if (!user)
  throw new Error(
    "Create the email/password user in Supabase Authentication first.",
  );
const { error } = await db.from("admin_users").upsert({ user_id: user.id });
if (error) throw error;
console.log("Administrator access granted.");
