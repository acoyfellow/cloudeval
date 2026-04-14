import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { exists } from "../utils/fs.mjs";
import cloudflarePreset from "../presets/cloudflare.mjs";
import genericPreset from "../presets/generic.mjs";

export const DEFAULT_CONFIG_FILE = "evals.config.mjs";

const PRESETS = {
  cloudflare: cloudflarePreset,
  generic: genericPreset,
};

export async function loadConfig(cwd = process.cwd(), file = DEFAULT_CONFIG_FILE, preset = "cloudflare") {
  const configPath = resolve(cwd, file);
  if (!(await exists(configPath))) {
    return { ...(PRESETS[preset] ?? PRESETS.cloudflare), __path: null };
  }

  const mod = await import(pathToFileURL(configPath).href);
  return { ...(mod.default ?? mod), __path: configPath };
}

export function resolveConfigPath(cwd = process.cwd(), file = DEFAULT_CONFIG_FILE) {
  return resolve(cwd, file);
}

export function resolveRelative(cwd, relPath) {
  return resolve(dirname(resolve(cwd, DEFAULT_CONFIG_FILE)), relPath);
}
