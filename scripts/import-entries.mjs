import { readFile, stat } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import readXlsxFile from "read-excel-file/node";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Configure .env.local first.");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const manifest = JSON.parse(
  await readFile("data/import-manifest.json", "utf8"),
);
const pendingFlag = process.argv.find((arg) =>
  arg.startsWith("--pending-stories="),
);
const pendingStories = new Set(
  pendingFlag ? pendingFlag.split("=")[1].split(",") : [],
);
const previewOnly = process.argv.includes("--preview-only");
const onlyFlag = process.argv.find((arg) => arg.startsWith("--only-entries="));
const onlyEntries = onlyFlag
  ? new Set(onlyFlag.split("=")[1].split(","))
  : null;
if (onlyEntries) {
  for (const serial of onlyEntries) {
    if (!manifest.entries.some((entry) => entry.serial === serial))
      throw new Error(`Unknown entry: ${serial}`);
  }
}
const entries = manifest.entries.filter(
  (entry) => !onlyEntries || onlyEntries.has(entry.serial),
);
for (const serial of pendingStories) {
  if (
    !manifest.entries.some(
      (entry) => entry.serial === serial && entry.category === "story",
    )
  )
    throw new Error(`Unknown pending story: ${serial}`);
}
const blockingWarnings = manifest.warnings.filter((warning) => {
  const serial = warning.split(":")[0];
  if (onlyEntries && !onlyEntries.has(serial)) return false;
  return !(
    pendingStories.has(serial) &&
    warning.includes("Image sequence cannot be verified")
  );
});
if (blockingWarnings.length)
  throw new Error(
    `Resolve photo preparation warnings first:\n${blockingWarnings.join("\n")}`,
  );
const check = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
// Optional workbook paths: --mobile file.xlsx --device file.xlsx --story file.xlsx.
// Local filenames are the fallback because the supplied workspace has photos, but no Excel files.
for (const category of ["mobile", "device", "story"]) {
  const flag = process.argv.indexOf(`--${category}`);
  if (flag < 0) continue;
  const sheet = await readXlsxFile(process.argv[flag + 1]);
  const headers = sheet[0].map(String);
  const rows = sheet
    .slice(1)
    .map((row) => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
  for (const row of rows) {
    const raw = String(row.Serial ?? row.serial ?? "").trim();
    const number = raw.match(/\d+/)?.[0];
    const serial = `${{ mobile: "M", device: "D", story: "S" }[category]}-${String(Number(number)).padStart(3, "0")}`;
    const entry = manifest.entries.find((e) => e.serial === serial);
    if (!entry) throw new Error(`Workbook references unknown entry ${serial}`);
    if (row.Name) entry.participant_name = String(row.Name).trim();
    if (row["Photo Title"]) entry.title = String(row["Photo Title"]).trim();
  }
}
const bucket = check(await db.storage.getBucket("photos"));
if (bucket.public) throw new Error("The photos bucket must be private.");
const pendingPrefixes = [...pendingStories].map(
  (serial) => `story/${serial.slice(2)}/`,
);
const assets = manifest.assets.filter(
  (asset) =>
    !pendingPrefixes.some((prefix) => asset.storage_path.startsWith(prefix)) &&
    (!onlyEntries ||
      entries.some(
        (entry) =>
          entry.storage_path === asset.storage_path ||
          entry.story_images.some(
            (image) => image.storage_path === asset.storage_path,
          ),
      )),
);
for (const asset of assets) {
  const originalSize = (await stat(asset.original_source)).size;
  if (
    !previewOnly &&
    bucket.file_size_limit &&
    originalSize > bucket.file_size_limit
  )
    throw new Error(
      `Original exceeds bucket upload limit: ${asset.original_source}`,
    );
}
let uploaded = 0;
async function uploadAsset(asset) {
  check(
    await db.storage
      .from("photos")
      .upload(asset.storage_path, await readFile(asset.preview), {
        contentType: "image/jpeg",
        upsert: true,
      }),
  );
  const type = /\.png$/i.test(asset.original_source)
    ? "image/png"
    : "image/jpeg";
  if (!previewOnly)
    check(
      await db.storage
        .from("photos")
        .upload(asset.original_path, await readFile(asset.original_source), {
          contentType: type,
          upsert: true,
        }),
    );
  console.log(`Uploaded ${++uploaded}/${assets.length}: ${asset.storage_path}`);
}
// A small pool keeps uploads quick without overwhelming storage or local memory.
let assetIndex = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (assetIndex < assets.length) {
      const asset = assets[assetIndex++];
      await uploadAsset(asset);
    }
  }),
);
for (const entry of entries) {
  const images = pendingStories.has(entry.serial) ? [] : entry.story_images;
  if (pendingStories.has(entry.serial)) {
    const existingImages = check(
      await db
        .from("story_images")
        .select("id")
        .eq("entry_id", entry.id)
        .limit(1),
    );
    if (existingImages.length)
      throw new Error(
        `Cannot mark ${entry.serial} pending: it already has imported photographs.`,
      );
  }
  const { storage_path, original_path, story_images, ...record } = entry;
  record.image_url = storage_path || null;
  record.original_url = previewOnly ? null : original_path || null;
  // Upsert by stable IDs/serials: repeat imports keep judging scores intact.
  check(await db.from("entries").upsert(record, { onConflict: "serial" }));
  if (images.length) {
    check(
      await db.from("story_images").upsert(
        images.map(
          ({ storage_path, original_path, id, entry_id, image_order }) => ({
            id,
            entry_id,
            image_order,
            image_url: storage_path,
            original_url: previewOnly ? null : original_path,
          }),
        ),
        { onConflict: "entry_id,image_order" },
      ),
    );
  }
}
console.log(
  `Imported ${entries.length} entries. Existing scores were preserved.`,
);
if (pendingStories.size)
  console.log(
    `Awaiting confirmed image order: ${[...pendingStories].join(", ")}. Their entry records were added without photographs.`,
  );
if (previewOnly)
  console.log(
    "High-quality judging previews uploaded. Full-resolution originals remain in the local source folders.",
  );
