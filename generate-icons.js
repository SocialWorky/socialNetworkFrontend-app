require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

const iconSizes = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// Tamaños adicionales para splash screens de iOS
const splashSizes = [
  { width: 640, height: 1136 },   // iPhone 5/SE
  { width: 750, height: 1334 },   // iPhone 6/7/8
  { width: 1125, height: 2436 },  // iPhone X/XS
  { width: 1170, height: 2532 },  // iPhone 12/13
  { width: 1179, height: 2556 },  // iPhone 14
  { width: 1242, height: 2688 },  // iPhone 6/7/8 Plus
  { width: 1284, height: 2778 },  // iPhone 12/13 Pro Max
  { width: 1290, height: 2796 },  // iPhone 14 Pro Max
  { width: 828, height: 1792 },   // iPhone XR/11
];

async function downloadImage(url) {
  const response = await axios({
    url,
    responseType: 'arraybuffer',
    timeout: 20000,
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const buffer = Buffer.from(response.data);
  // A valid logo must be a non-trivial image; bail out on empty/garbage responses.
  if (!buffer || buffer.length < 100) {
    throw new Error(`la descarga devolvió ${buffer ? buffer.length : 0} bytes (no es una imagen válida)`);
  }
  return buffer;
}

async function generateIcons(imageUrl, outputDir) {
  const imageBuffer = await downloadImage(imageUrl);

  // Validate the buffer is a real raster image before generating any size.
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.format || !metadata.width || !metadata.height) {
    throw new Error('el archivo descargado no es una imagen válida');
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generar iconos estándar
  for (const size of iconSizes) {
    const outputPath = path.join(outputDir, `icon-${process.env.NG_APP_PWA_NAME}-${size}x${size}.png`);
    console.log(`Generando ícono: ${outputPath}`);

    await sharp(imageBuffer)
      .resize(size, size)
      .toFormat('png')
      .toFile(outputPath);
  }

  // Generar splash screens para iOS
  for (const splash of splashSizes) {
    const outputPath = path.join(outputDir, `icon-${process.env.NG_APP_PWA_NAME}-${splash.width}x${splash.height}.png`);
    console.log(`Generando splash screen: ${outputPath}`);

    await sharp(imageBuffer)
      .resize(splash.width, splash.height, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat('png')
      .toFile(outputPath);
  }

  // Verify every manifest icon was actually written and is non-empty,
  // otherwise the build would ship a PWA with 404 icons.
  const missing = iconSizes
    .map((size) => path.join(outputDir, `icon-${process.env.NG_APP_PWA_NAME}-${size}x${size}.png`))
    .filter((file) => !fs.existsSync(file) || fs.statSync(file).size === 0);

  if (missing.length > 0) {
    throw new Error(`faltan íconos generados: ${missing.join(', ')}`);
  }

  console.log("Todos los íconos y splash screens han sido generados correctamente.");
}

const ICON_URL = process.env.NG_APP_META_IMAGE;
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

if (!ICON_URL) {
  console.error("La variable de entorno NG_APP_META_IMAGE no está definida.");
  process.exit(1);
}

generateIcons(ICON_URL, OUTPUT_DIR)
  .catch((error) => {
    // Fail the build instead of publishing an image with missing PWA icons.
    console.error(`Error al generar los íconos desde "${ICON_URL}": ${error.message}`);
    process.exit(1);
  });
