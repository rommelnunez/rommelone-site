import { put } from "@vercel/blob";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const UPLOADS_DIR = join(process.cwd(), "assets/uploads");
const MAP_FILE = join(process.cwd(), "scripts/blob-url-map.json");

async function main() {
  const files = readdirSync(UPLOADS_DIR).filter(
    (f) => !f.startsWith(".") && f !== ".gitkeep"
  );

  console.log(`Uploading ${files.length} files to Vercel Blob...\n`);

  const urlMap = {};
  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = join(UPLOADS_DIR, file);
    try {
      const content = readFileSync(filePath);
      const blob = await put(`uploads/${file}`, content, {
        access: "public",
        addRandomSuffix: false,
      });
      urlMap[`/assets/uploads/${file}`] = blob.url;
      uploaded++;
      process.stdout.write(`\r  [${uploaded}/${files.length}] ${file}`);
    } catch (err) {
      console.error(`\n  FAIL: ${file} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\nDone: ${uploaded} uploaded, ${failed} failed.`);

  writeFileSync(MAP_FILE, JSON.stringify(urlMap, null, 2));
  console.log(`URL map written to ${MAP_FILE}`);
}

main().catch(console.error);
