import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as opentype from "opentype.js";

let regularFont: opentype.Font | null = null;
let boldFont: opentype.Font | null = null;

function getFonts(): { regular: opentype.Font; bold: opentype.Font } {
  if (!regularFont || !boldFont) {
    const fontsDir = path.join(process.cwd(), "fonts");
    const regularBuf = fs.readFileSync(
      path.join(fontsDir, "roboto-regular.ttf")
    );
    const boldBuf = fs.readFileSync(path.join(fontsDir, "roboto-bold.ttf"));
    regularFont = opentype.parse(
      regularBuf.buffer.slice(
        regularBuf.byteOffset,
        regularBuf.byteOffset + regularBuf.byteLength
      )
    );
    boldFont = opentype.parse(
      boldBuf.buffer.slice(
        boldBuf.byteOffset,
        boldBuf.byteOffset + boldBuf.byteLength
      )
    );
  }
  return { regular: regularFont, bold: boldFont };
}

function textToSvgPath(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string
): string {
  const pathData = font.getPath(text, x, y, fontSize).toPathData(2);
  return `<path d="${pathData}" fill="${fill}" />`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "...";
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

  const line1 = `[${params.action}] ${truncate(params.fullName, 28)} (${params.employeeCode})`;
  const line2 = params.displayTimeWib;
  const coordStr = `(${params.lat.toFixed(5)}, ${params.lng.toFixed(5)})`;
  const cleanAddr = truncate(params.address || "Alamat tidak tersedia", 48);
  const line3 = `${cleanAddr} ${coordStr}`;

  const accentColor = params.action === "CHECK-IN" ? "#22c55e" : "#f97316";

  const { regular, bold } = getFonts();
  const textX = margin + 24;

  const path1 = textToSvgPath(
    bold,
    line1,
    textX,
    boxY + Math.round(boxHeight * 0.31),
    fontSizeTitle,
    "#ffffff"
  );
  const path2 = textToSvgPath(
    regular,
    line2,
    textX,
    boxY + Math.round(boxHeight * 0.59),
    fontSizeSub,
    "#e2e8f0"
  );
  const path3 = textToSvgPath(
    regular,
    line3,
    textX,
    boxY + Math.round(boxHeight * 0.85),
    fontSizeSub,
    "#cbd5e1"
  );

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${margin}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="12" ry="12" fill="rgba(15, 23, 42, 0.78)" />
      <rect x="${margin}" y="${boxY}" width="8" height="${boxHeight}" rx="4" ry="4" fill="${accentColor}" />
      ${path1}
      ${path2}
      ${path3}
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
