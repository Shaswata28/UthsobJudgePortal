import { rm } from "node:fs/promises";
// Local competition assets support development only. Live photos use private Supabase Storage.
await rm(new URL("../dist/photos", import.meta.url), {
  recursive: true,
  force: true,
});
await rm(new URL("../dist/catalog.json", import.meta.url), { force: true });
