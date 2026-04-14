export function normalizeModelName(model) {
  return model.replace(/^workers-ai[:/]/, "");
}

export function slugifyModelName(model) {
  return normalizeModelName(model)
    .replace(/^@cf\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
