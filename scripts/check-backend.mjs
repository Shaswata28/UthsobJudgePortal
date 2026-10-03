import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes, randomInt } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { hashPin, verifyPin } from "../server/security.mjs";
import { parseJudgeCredentials } from "./judge-credentials.mjs";

// Live verification uses a temporary account and removes only its own test records.
const origin = "http://127.0.0.1:5173";
const db = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const check = ({data,error}) => { if(error) throw new Error("Backend verification query failed.");return data; };
const config = await (await fetch(`${origin}/api/config`)).json();
assert.equal(config.configured, true);assert.equal(config.preview, false);
const credentials = parseJudgeCredentials(await readFile("Judge login.txt", "utf8"));
const judges = check(await db.from("judges").select("username,pin_hash,active"));
for(const credential of credentials) {
  const judge = judges.find(judge => judge.username === credential.username);
  assert.ok(judge?.active);assert.equal(await verifyPin(credential.pin,judge.pin_hash),true);
}
const entry = check(await db.from("entries").select("id").eq("serial","M-001").single());
const username = `backend_check_${randomBytes(5).toString("hex")}`;
const pin = String(randomInt(10000)).padStart(4,"0");
const testJudge = check(await db.from("judges").insert({name:"Temporary backend verification",username,pin_hash:await hashPin(pin)}).select("id").single());
let browser;
try {
  browser = await chromium.launch({channel:"chrome",headless:true});
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/judge/login`);
  assert.equal(await page.getByRole("button",{name:"Explore judge preview"}).count(),0);
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("4-digit PIN").fill(pin);
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await page.waitForURL("**/judge/dashboard");
  await page.waitForFunction(()=>document.querySelector('.overall-card h2')?.textContent?.includes('192'));
  assert.match(await page.locator(".overall-card h2").innerText(), /192/);
  await page.getByRole("link",{name:"Continue judging"}).first().click();
  await page.getByLabel("Score out of 10").fill("9.25");
  await page.getByLabel("Remarks optional").fill("Temporary backend verification; removed after checking.");
  await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent?.trim()==="Saved");
  const saved = check(await db.from("scores").select("score,remark").eq("judge_id",testJudge.id).eq("entry_id",entry.id).single());
  assert.equal(Number(saved.score),9.25);assert.match(saved.remark,/Temporary backend verification/);
  await page.reload();await page.getByLabel("Score out of 10").waitFor();
  // Continue judging deliberately resumes at the next unscored entry after reload.
  await page.getByRole("button",{name:"Previous",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#score')?.value === "9.25");
  assert.equal(await page.getByLabel("Score out of 10").inputValue(),"9.25");
  assert.match(await page.getByLabel("Remarks optional").inputValue(),/Temporary backend verification/);
  const image=page.locator(".photo-view>img");await image.waitFor();
  await page.waitForFunction(()=>{const image=document.querySelector('.photo-view>img');return image?.complete&&image.naturalWidth>0;});
  assert.equal(await context.request.get(`${origin}/api/admin/data`).then(res=>res.status()),401);
  await page.getByRole("button",{name:"Log out"}).click();await page.waitForURL("**/judge/login");
  assert.equal(await context.request.get(`${origin}/api/judge/data`).then(res=>res.status()),401);
  await page.getByLabel("Username or email").fill(credentials[0].login);
  await page.getByLabel("4-digit PIN").fill(credentials[0].pin);
  await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL("**/judge/dashboard");
  await page.getByRole("button",{name:"Log out"}).click();await page.waitForURL("**/judge/login");
  console.log(JSON.stringify({liveBackend:true,previewDisabled:true,judgeCredentialsVerified:credentials.length,realEmailLogin:true,entriesLoaded:192,autosavePersisted:true,scoreSurvivedReload:true,privatePhotoLoaded:true,adminIsolation:true,logoutRevokedSession:true}));
} finally {
  await browser?.close();
  check(await db.from("scores").delete().eq("judge_id",testJudge.id));
  check(await db.from("judges").delete().eq("id",testJudge.id));
  console.log("Temporary verification account, session, and score removed.");
}
