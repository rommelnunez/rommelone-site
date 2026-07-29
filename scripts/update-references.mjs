import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const MAP_FILE = join(process.cwd(), "scripts/blob-url-map.json");
const PROJECTS_DIR = join(process.cwd(), "projects");
const SETTINGS_FILE = join(process.cwd(), "_data/settings.yaml");

const urlMap = JSON.parse(readFileSync(MAP_FILE, "utf-8"));

function replaceUrls(content) {
  let updated = content;
  for (const [oldPath, newUrl] of Object.entries(urlMap)) {
    // Replace both with and without leading slash
    updated = updated.replaceAll(oldPath, newUrl);
  }
  return updated;
}

let totalFiles = 0;
let totalReplacements = 0;

// Update project markdown files
const mdFiles = readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".md"));
for (const file of mdFiles) {
  const filePath = join(PROJECTS_DIR, file);
  const original = readFileSync(filePath, "utf-8");
  const updated = replaceUrls(original);
  if (updated !== original) {
    writeFileSync(filePath, updated);
    const count = (original.length - updated.length === 0)
      ? original.split("/assets/uploads/").length - updated.split("/assets/uploads/").length + (updated.match(/blob\.vercel-storage/g) || []).length
      : (updated.match(/blob\.vercel-storage/g) || []).length;
    console.log(`  ${file}: ${count} URLs updated`);
    totalFiles++;
    totalReplacements += count;
  }
}

// Update settings.yaml
const settingsOriginal = readFileSync(SETTINGS_FILE, "utf-8");
const settingsUpdated = replaceUrls(settingsOriginal);
if (settingsUpdated !== settingsOriginal) {
  writeFileSync(SETTINGS_FILE, settingsUpdated);
  const count = (settingsUpdated.match(/blob\.vercel-storage/g) || []).length;
  console.log(`  settings.yaml: ${count} URLs updated`);
  totalFiles++;
  totalReplacements += count;
}

console.log(`\nDone: ${totalReplacements} URLs updated across ${totalFiles} files.`);
