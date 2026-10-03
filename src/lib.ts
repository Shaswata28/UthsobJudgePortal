import { createClient } from "@supabase/supabase-js";
import type { Dataset, Score } from "./types";
export const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
      )
    : null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = "GET",
  admin = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin) {
    const session = await supabase?.auth.getSession();
    if (session?.data.session)
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Connection lost. Please check your internet connection.",
      0,
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error || "Unable to complete this request.",
      response.status,
    );
  return data;
}
export async function previewData(): Promise<Dataset> {
  const response = await fetch("/catalog.json");
  if (!response.ok)
    throw new Error("Prepare the local photos before opening the preview.");
  return {
    entries: await response.json(),
    scores: [],
    judges: Array.from({ length: 6 }, (_, i) => ({
      id: `preview-${i + 1}`,
      name: i === 0 ? "Preview Judge" : `Judge ${i + 1}`,
      username: `judge${i + 1}`,
      active: true,
    })),
  };
}
export function completed(scores: Score[], entryIds: Set<string>) {
  return scores.filter((s) => entryIds.has(s.entry_id) && s.score !== null)
    .length;
}
export function average(scores: Score[]) {
  const valid = scores.filter((s) => s.score !== null);
  return valid.length
    ? valid.reduce((sum, s) => sum + Number(s.score), 0) / valid.length
    : null;
}
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Neutralize spreadsheet formula injection, including after leading whitespace.
  if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
