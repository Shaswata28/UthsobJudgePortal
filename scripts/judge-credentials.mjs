import { normalizeJudgeLogin } from "../server/security.mjs";

export function parseJudgeCredentials(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length || lines.length % 3)
    throw new Error("Expected one name, email/username, and PIN per judge.");
  const records = [];
  for (let i = 0; i < lines.length; i += 3) {
    const name = lines[i].replace(/^\d+[.)]\s*/, "").replace(/^#+\s*/, "");
    const login = lines[i + 1].replace(/^(?:email|username)\s*[:=]\s*/i, "");
    const pin = lines[i + 2].replace(/^PIN\s*[:=]\s*/i, "");
    if (!name || name.length > 150 || !/^\d{4}$/.test(pin))
      throw new Error(
        `Check the name and four-digit PIN for record ${records.length + 1}.`,
      );
    records.push({ name, login, username: normalizeJudgeLogin(login), pin });
  }
  if (new Set(records.map((record) => record.username)).size !== records.length)
    throw new Error("The credentials file contains duplicate judge logins.");
  return records;
}
