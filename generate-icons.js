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
    responseType: 'arraybuffer'
  });
  return response.data;
}

async function generateIcons(imageUrl, outputDir) {
  try {
    const imageBuffer = await downloadImage(imageUrl);

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

    console.log("Todos los íconos y splash screens han sido generados correctamente.");
  } catch (error) {
    console.error("Error al generar los íconos:", error.message);
  }
}

const ICON_URL = process.env.NG_APP_META_IMAGE;
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

if (!ICON_URL) {
  console.error("La variable de entorno NG_APP_META_IMAGE no está definida.");
  process.exit(1);
}

generateIcons(ICON_URL, OUTPUT_DIR);
