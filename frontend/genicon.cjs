const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const FRONT = "C:/Users/PichulaSad/Desktop/8 semestre/HeavyCult/HeavyCult/frontend";
const OUT = "C:/Users/PichulaSad/Desktop/8 semestre/HeavyCult/HeavyCult/chrome-extension-dropi/icons";
const svg = fs.readFileSync(path.join(FRONT, "public/logo.svg"));

const sizes = [16, 32, 48, 128];

(async () => {
  for (const size of sizes) {
    const file = path.join(OUT, `icon${size}.png`);
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(file);
    const m = await sharp(file).metadata();
    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`icon${size}.png -> ${m.width}x${m.height} | canales: ${m.channels} | ${kb} KB`);
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
