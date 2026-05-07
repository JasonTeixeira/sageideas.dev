// Virus-scan adapter — stubbed for Phase 2C PR-A.
//
// Real implementation can swap to ClamAV (clamd over TCP), VirusTotal,
// Cloudmersive, or an internal sidecar without changing call sites. The API
// surface is intentionally minimal: bytes in, verdict out.

export type ScanResult = { ok: true } | { ok: false; reason: string };

const MAX_BYTES = 75 * 1024 * 1024;

export async function scanBuffer(bytes: ArrayBuffer | Uint8Array): Promise<ScanResult> {
  const length = bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength;
  if (length > MAX_BYTES) {
    return { ok: false, reason: 'File exceeds the maximum scannable size (75 MB).' };
  }
  // Stub: real scanner goes here. We accept everything for now; route layer
  // still applies bucket-level MIME / size limits via storage RLS.
  return { ok: true };
}
