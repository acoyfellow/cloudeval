import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

export async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function writeTextFile(path, content) {
  await ensureDir(dirname(path));
  await writeFile(path, content, "utf8");
}

export async function readTextFile(path) {
  return readFile(path, "utf8");
}
