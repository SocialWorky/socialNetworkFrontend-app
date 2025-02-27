require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

const iconSizes = [
  72, 96, 128, 144, 152, 192, 384, 512
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

    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      console.log(`Generando ícono: ${outputPath}`);

      await sharp(imageBuffer)
        .resize(size, size)
        .toFormat('png')
        .toFile(outputPath);
    }

    console.log("Todos los íconos han sido generados correctamente.");
  } catch (error) {
    console.error("Error al generar los íconos:", error.message);
  }
}

require('dotenv').config();
const ICON_URL = process.env.NG_APP_META_IMAGE;
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'icons');

if (!ICON_URL) {
  console.error("La variable de entorno ICON_URL no está definida.");
  process.exit(1);
}

generateIcons(ICON_URL, OUTPUT_DIR);
