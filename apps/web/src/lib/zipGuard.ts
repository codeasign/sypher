// Minimal ZIP central-directory reader — no external zip library needed
// since we only need aggregate sizes, not entry contents. Used by
// /api/upload to reject zip bombs: a small compressed file whose declared
// uncompressed total is wildly larger (classic 42.zip-style attack) never
// reaches Bunny storage or gets decompressed anywhere downstream.

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 65535;

export interface ZipSummary {
  entryCount: number;
  totalCompressed: number;
  totalUncompressed: number;
}

/** Scans backward for the End Of Central Directory record (comment length is variable, so it isn't at a fixed offset). */
function findEocd(buf: Buffer): number {
  const searchStart = Math.max(0, buf.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  for (let i = buf.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/**
 * Returns null if the buffer isn't a well-formed ZIP (central directory
 * missing/truncated) — callers should treat that as "reject the upload",
 * not "skip the check".
 */
export function summarizeZip(buf: Buffer): ZipSummary | null {
  const eocdOffset = findEocd(buf);
  if (eocdOffset === -1) return null;

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cdOffset = buf.readUInt32LE(eocdOffset + 16);

  let totalCompressed = 0;
  let totalUncompressed = 0;
  let entryCount = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (cdOffset + 46 > buf.length) return null;
    if (buf.readUInt32LE(cdOffset) !== CENTRAL_DIR_SIGNATURE) return null;

    const compressedSize = buf.readUInt32LE(cdOffset + 20);
    const uncompressedSize = buf.readUInt32LE(cdOffset + 24);
    const nameLen = buf.readUInt16LE(cdOffset + 28);
    const extraLen = buf.readUInt16LE(cdOffset + 30);
    const commentLen = buf.readUInt16LE(cdOffset + 32);

    totalCompressed += compressedSize;
    totalUncompressed += uncompressedSize;
    entryCount += 1;

    cdOffset += 46 + nameLen + extraLen + commentLen;
  }

  return { entryCount, totalCompressed, totalUncompressed };
}

/**
 * Zip-bomb guard: caps both the absolute uncompressed total and the
 * compression ratio. Either alone is dodgeable (a ratio cap alone lets a
 * huge-but-plausible archive through; a size cap alone lets a tiny,
 * absurdly-compressed bomb through) — both together close each other's gap.
 */
export function isZipBomb(summary: ZipSummary, maxUncompressedBytes: number, maxRatio: number): boolean {
  if (summary.totalUncompressed > maxUncompressedBytes) return true;
  if (summary.totalCompressed > 0 && summary.totalUncompressed / summary.totalCompressed > maxRatio) return true;
  return false;
}
