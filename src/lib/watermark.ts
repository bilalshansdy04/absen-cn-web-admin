import sharp from "sharp";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export interface WatermarkParams {
  imageBuffer: Buffer;
  action: "CHECK-IN" | "CHECK-OUT";
  fullName: string;
  employeeCode: string;
  displayTimeWib: string;
  address: string;
  lat: number;
  lng: number;
}

export async function burnAttendanceWatermark(
  params: WatermarkParams
): Promise<Buffer> {
  const image = sharp(params.imageBuffer).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 1440;

  const boxHeight = Math.max(128, Math.round(height * 0.11));
  const margin = Math.max(20, Math.round(width * 0.025));
  const boxWidth = width - margin * 2;
  const boxY = height - boxHeight - margin;
  const fontSizeTitle = Math.max(20, Math.round(width * 0.024));
  const fontSizeSub = Math.max(16, Math.round(width * 0.019));

  const line1 = escapeXml(
    `[${params.action}] ${truncate(params.fullName, 28)} (${params.employeeCode})`
  );
  const line2 = escapeXml(params.displayTimeWib);
  const coordStr = `(${params.lat.toFixed(5)}, ${params.lng.toFixed(5)})`;
  const cleanAddr = truncate(params.address || "Alamat tidak tersedia", 48);
  const line3 = escapeXml(`${cleanAddr} ${coordStr}`);

  const accentColor = params.action === "CHECK-IN" ? "#22c55e" : "#f97316";

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${margin}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="12" ry="12" fill="rgba(15, 23, 42, 0.78)" />
      <rect x="${margin}" y="${boxY}" width="8" height="${boxHeight}" rx="4" ry="4" fill="${accentColor}" />
      <text x="${margin + 24}" y="${boxY + Math.round(boxHeight * 0.31)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fontSizeTitle}" font-weight="bold" fill="#ffffff">${line1}</text>
      <text x="${margin + 24}" y="${boxY + Math.round(boxHeight * 0.59)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fontSizeSub}" fill="#e2e8f0">${line2}</text>
      <text x="${margin + 24}" y="${boxY + Math.round(boxHeight * 0.85)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fontSizeSub}" fill="#cbd5e1">${line3}</text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
