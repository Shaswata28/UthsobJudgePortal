import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import convert from "heic-convert";

const root = process.cwd();
const selected = path.join(root, "Selected Photos");
const imageFile = (name) => /\.(jpg|jpeg|png|webp|heic)$/i.test(name);
const warnings = [];
const uuid = (key) => {
  const h = createHash("sha256").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
function metadata(name) {
  const clean = name.replace(/\.(jpg|jpeg|png|webp|heic)$/i, "");
  const match = clean.match(/^(\d+)\s*-\s*(.+?)\s*-\s*(.+)$/);
  if (!match) throw new Error(`Cannot read entry metadata: ${name}`);
  return {
    number: Number(match[1]),
    participant_name: match[2].trim(),
    title: match[3].trim(),
  };
}
await mkdir(path.join(root, "public/photos"), { recursive: true });
await mkdir(path.join(root, "data"), { recursive: true });
let overrides = {};
try {
  overrides = JSON.parse(
    await readFile(path.join(root, "data/story-order.json"), "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const assets = [];
const entries = [];
let previewCache = {};
try {
  previewCache = JSON.parse(
    await readFile(path.join(root, "data/preview-cache.json"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
async function preview(source, storagePath) {
  const destination = path.join(root, "public/photos", storagePath);
  await mkdir(path.dirname(destination), { recursive: true });
  let current = false;
  try {
    current = (await stat(destination)).mtimeMs >= (await stat(source)).mtimeMs;
  } catch {}
  const sourceBuffer = await readFile(source);
  const fingerprint = createHash("sha256").update(sourceBuffer).digest("hex");
  current = current && previewCache[storagePath] === fingerprint;
  const isHeic = /ftyp(?:heic|heix|hevc|mif1)/.test(
    sourceBuffer.subarray(0, 40).toString("ascii"),
  );
  let originalSource = path.relative(root, source);
  let originalPath = `originals/${storagePath.replace(/\.jpg$/, path.extname(source).toLowerCase())}`;
  // Buffers also handle Windows source paths longer than native image libraries support.
  let input = sourceBuffer;
  if (isHeic) {
    originalPath = `originals/${storagePath}`;
    originalSource = `data/converted/${storagePath}`;
    const convertedPath = path.join(root, originalSource);
    await mkdir(path.dirname(convertedPath), { recursive: true });
    let convertedCurrent = false;
    try {
      convertedCurrent =
        (await stat(convertedPath)).mtimeMs >= (await stat(source)).mtimeMs;
    } catch {}
    convertedCurrent =
      convertedCurrent && previewCache[storagePath] === fingerprint;
    if (!convertedCurrent)
      await writeFile(
        convertedPath,
        Buffer.from(
          await convert({ buffer: sourceBuffer, format: "JPEG", quality: 1 }),
        ),
      );
    input = convertedPath;
  }
  if (!current) {
    await sharp(input)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(destination);
  }
  previewCache[storagePath] = fingerprint;
  assets.push({
    source: path.relative(root, source),
    original_source: originalSource,
    preview: `public/photos/${storagePath}`,
    storage_path: storagePath,
    original_path: originalPath,
  });
  return {
    image_url: `/photos/${storagePath}`,
    original_url: `/photos/${storagePath}`,
    storage_path: storagePath,
    original_path: originalPath,
  };
}
for (const category of ["mobile", "device"]) {
  const directory = path.join(
    selected,
    category[0].toUpperCase() + category.slice(1),
  );
  const files = (await readdir(directory))
    .filter(imageFile)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const filename of files) {
    const { number, ...meta } = metadata(filename);
    const serial = `${category === "mobile" ? "M" : "D"}-${String(number).padStart(3, "0")}`;
    const image = await preview(
      path.join(directory, filename),
      `${category}/${String(number).padStart(3, "0")}.jpg`,
    );
    entries.push({
      id: uuid(serial),
      serial,
      category,
      ...meta,
      ...image,
      story_images: [],
    });
  }
  console.log(`${category}: ${files.length} photographs prepared`);
}
const storyDirectory = path.join(selected, "Story");
const storyHashes = new Map();
for (const folder of (await readdir(storyDirectory, { withFileTypes: true }))
  .filter((f) => f.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
  const { number, ...meta } = metadata(folder.name);
  const serial = `S-${String(number).padStart(3, "0")}`;
  const files = (await readdir(path.join(storyDirectory, folder.name))).filter(
    imageFile,
  );
  let ordered = overrides[serial];
  if (
    ordered &&
    (ordered.length !== files.length ||
      new Set(ordered).size !== files.length ||
      ordered.some((f) => !files.includes(f)))
  )
    throw new Error(`Invalid image order override for ${serial}`);
  function sequence(filename) {
    const parenthesized = filename.match(/\((\d+)\)(?=\.[^.]+$)/);
    if (parenthesized) return Number(parenthesized[1]);
    const prefix = filename.split(" - ")[0];
    const match = prefix.match(/(?:^|[_ (]|Serial\s+)(\d+)(?=[ )._]|$)/i);
    return match ? Number(match[1]) : null;
  }
  if (!ordered) {
    const numbers = files.map(sequence);
    if (
      numbers.some((n) => n === null) ||
      new Set(numbers).size !== files.length
    )
      warnings.push(
        `${serial}: Image sequence cannot be verified from filenames. Set its ordered filenames in data/story-order.json before importing.`,
      );
    ordered = files.sort(
      (a, b) =>
        (sequence(a) ?? 0) - (sequence(b) ?? 0) ||
        a.localeCompare(b, undefined, { numeric: true }),
    );
  }
  if (!files.length)
    warnings.push(
      `${serial}: The story folder is empty. Add its photographs before importing.`,
    );
  if (files.length) {
    const hashes = await Promise.all(
      files.map(async (f) =>
        createHash("sha256")
          .update(await readFile(path.join(storyDirectory, folder.name, f)))
          .digest("hex"),
      ),
    );
    const signature = hashes.sort().join(":");
    if (storyHashes.has(signature))
      warnings.push(
        `${serial}: Its photographs are identical to ${storyHashes.get(signature)}. Confirm and correct the source folders before importing.`,
      );
    storyHashes.set(signature, serial);
  }
  const story_images = [];
  for (let i = 0; i < ordered.length; i++) {
    const image = await preview(
      path.join(storyDirectory, folder.name, ordered[i]),
      `story/${String(number).padStart(3, "0")}/${i + 1}.jpg`,
    );
    story_images.push({
      id: uuid(`${serial}:${i + 1}`),
      entry_id: uuid(serial),
      image_order: i + 1,
      ...image,
    });
  }
  entries.push({
    id: uuid(serial),
    serial,
    category: "story",
    ...meta,
    image_url: null,
    original_url: null,
    story_images,
  });
}
await writeFile(
  path.join(root, "public/catalog.json"),
  JSON.stringify(entries),
);
await writeFile(
  path.join(root, "data/import-manifest.json"),
  JSON.stringify({ entries, assets, warnings }, null, 2),
);
await writeFile(
  path.join(root, "data/preview-cache.json"),
  JSON.stringify(previewCache),
);
console.log(
  `Prepared ${entries.length} entries and ${assets.length} images. Originals preserved.`,
);
for (const warning of warnings) console.warn(warning);
