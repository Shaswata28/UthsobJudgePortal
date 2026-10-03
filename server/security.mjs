import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export function normalizeJudgeLogin(value) {
  const login = String(value || "")
    .trim()
    .toLowerCase();
  if (/^[a-z0-9_]{2,40}$/.test(login)) return login;
  if (login.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login))
    return `email_${hashToken(login).slice(0, 32)}`;
  throw new Error("Enter a valid username or email address.");
}
export const newToken = () => randomBytes(32).toString("hex");
export async function hashPin(pin) {
  if (!/^\d{4}$/.test(pin))
    throw new Error("PIN must contain exactly four digits.");
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(pin, salt, 64);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPin(pin, stored) {
  const [algorithm, salt, hex] = (stored || "").split(":");
  if (algorithm !== "scrypt" || !salt || !hex || !/^\d{4}$/.test(pin))
    return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(pin, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function validateScore(body) {
  if (
    typeof body.entry_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.entry_id)
  )
    throw new Error("Invalid entry.");
  const score = body.score;
  if (
    score !== null &&
    (typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 10 ||
      Math.abs(score * 100 - Math.round(score * 100)) > 1e-8)
  )
    throw new Error("Use a score from 0 to 10, with up to two decimal places.");
  if (typeof body.remark !== "string" || body.remark.length > 5000)
    throw new Error("Remarks must be 5,000 characters or fewer.");
  return { entry_id: body.entry_id, score, remark: body.remark };
}
