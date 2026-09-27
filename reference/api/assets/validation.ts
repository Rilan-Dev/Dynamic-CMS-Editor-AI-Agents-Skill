export type AssetInspection = {
  ext: string;
  kind: "raster" | "svg" | "video";
  contentType: string;
};

export function inspectAsset(bytes: Buffer): AssetInspection | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: ".jpg", kind: "raster", contentType: "image/jpeg" };
  }
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: ".png", kind: "raster", contentType: "image/png" };
  }
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: ".webp", kind: "raster", contentType: "image/webp" };
  }
  if (bytes.subarray(0, 4).toString("ascii") === "GIF8") {
    return { ext: ".gif", kind: "raster", contentType: "image/gif" };
  }
  if (bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    return { ext: ".mp4", kind: "video", contentType: "video/mp4" };
  }
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { ext: ".webm", kind: "video", contentType: "video/webm" };
  }

  const head = bytes.subarray(0, 2048).toString("utf8").replace(/^﻿/, "");
  const stripped = head
    .replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, "")
    .trimStart();
  if (/^<svg[\s>]/i.test(stripped)) {
    return { ext: ".svg", kind: "svg", contentType: "image/svg+xml" };
  }

  return null;
}

export function sanitizeSvg(bytes: Buffer): Buffer {
  const svg = bytes
    .toString("utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");

  return Buffer.from(svg, "utf8");
}
