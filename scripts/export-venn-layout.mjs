import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_FILE = path.resolve("venn.json");
const OUT_FILE = path.resolve("src/data/venn-layout.json");
const ASSET_DIR = path.resolve("public/assets");
const SUPPORTED_TYPES = new Set(["ellipse", "rectangle", "text", "image"]);

const scene = JSON.parse(await readFile(SOURCE_FILE, "utf8"));
const elements = scene.elements
  .filter((element) => !element.isDeleted && SUPPORTED_TYPES.has(element.type))
  .map((element) => ({
    id: element.id,
    type: element.type,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle || 0,
    strokeColor: element.strokeColor,
    backgroundColor: element.backgroundColor,
    strokeWidth: element.strokeWidth,
    strokeStyle: element.strokeStyle,
    opacity: element.opacity,
    roundness: element.roundness || null,
    text: element.text,
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    textAlign: element.textAlign,
    lineHeight: element.lineHeight,
    fileId: element.fileId,
    crop: element.crop || null
  }));

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await mkdir(ASSET_DIR, { recursive: true });
const files = {};
for (const [fileId, file] of Object.entries(scene.files || {})) {
  if (!file.dataURL?.startsWith("data:image/")) continue;
  const extension = file.mimeType === "image/jpeg" ? "jpg" : file.mimeType === "image/webp" ? "webp" : "png";
  const fileName = `venn-${fileId.slice(0, 10)}.${extension}`;
  const data = Buffer.from(file.dataURL.split(",")[1], "base64");
  await writeFile(path.join(ASSET_DIR, fileName), data);
  files[fileId] = {
    fileName,
    mimeType: file.mimeType
  };
}
await writeFile(
  OUT_FILE,
  `${JSON.stringify(
    {
      type: "excalidraw-layout",
      source: "venn.json",
      files,
      elements
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Wrote ${elements.length} Venn layout elements to ${OUT_FILE}`);
