// Shared, client-safe upload constants + helpers for the public intake flow.
// NO server-only imports here — this module is imported by BOTH the OnboardForm
// (client component) and the upload route (server). The client-side checks are
// UX only; the server re-validates every file (never trust the browser).

export const MAX_FILES = 6;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

// Brand assets we accept: logos, mockups, screenshots, and brand-guideline
// PDFs. Kept deliberately narrow — no SVG (can embed scripts → stored-XSS risk)
// and no archives / office docs (wider attack surface, rarely needed for a
// look-and-feel brief). Extend the two lists below together when needed.
export const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "gif", "pdf"] as const;

// Map a validated extension → the Content-Type the server stores the object
// with. We set this from the (allow-listed) extension rather than the
// browser-supplied file.type to avoid content-type confusion.
export const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

// Value for the <input accept="…"> attribute.
export const ACCEPT_ATTR = [
  ...ALLOWED_MIME,
  ...ALLOWED_EXT.map((e) => `.${e}`),
].join(",");

export function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isAllowedType(file: { name: string; type: string }): boolean {
  const extOk = (ALLOWED_EXT as readonly string[]).includes(fileExt(file.name));
  // Some browsers report an empty type for valid files; allow that as long as
  // the extension is on the allow-list. A present type must also be allowed.
  const mimeOk =
    !file.type || (ALLOWED_MIME as readonly string[]).includes(file.type);
  return extOk && mimeOk;
}

// Returns an error message for an invalid file, or null when it's acceptable.
// Shared by the client (pre-flight) and the server (authoritative check).
export function validateFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!isAllowedType(file)) return "Unsupported type — use PNG, JPG, WEBP, GIF, or PDF.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_BYTES) return `Too large — max ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

// Make a storage-safe object name: drop any path, keep a sane basename +
// extension, replace unsafe characters, and cap the length. The route prefixes
// the result with a timestamp + random token so uploads never collide or
// silently overwrite an earlier file.
export function safeObjectName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? "file";
  const dot = base.lastIndexOf(".");
  const rawName = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  const cleanName =
    rawName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 80) ||
    "file";
  const cleanExt = ext.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 10).toLowerCase();
  return cleanExt ? `${cleanName}.${cleanExt}` : cleanName;
}
