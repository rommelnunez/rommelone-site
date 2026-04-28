import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { cache } from "react";
import type { Settings } from "./types";

export const getSettings = cache((): Settings => {
  const filePath = path.join(process.cwd(), "_data", "settings.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) as Settings;
});
