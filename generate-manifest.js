require('dotenv').config();
const fs = require('fs');

const manifest = {
  name: process.env.NG_APP_PWA_NAME,
  short_name: process.env.NG_APP_PWA_SHORT_NAME,
  start_url: "/",
  display: "standalone",
  background_color: `#${process.env.NG_APP_PWA_BACKGROUND_COLOR}`, 
  theme_color: `#${process.env.NG_APP_PWA_THEME_COLOR}`,
  icons: [
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-72x72.png`,
      sizes: "72x72",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-96x96.png`,
      sizes: "96x96",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-128x128.png`,
      sizes: "128x128",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-144x144.png`,
      sizes: "144x144",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-192x192.png`,
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-384x384.png`,
      sizes: "384x384",
      type: "image/png"
    },
    {
      src: `assets/icons/icon-${process.env.NG_APP_PWA_NAME}-512x512.png`,
      sizes: "512x512",
      type: "image/png"
    }
  ]
};

fs.writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, 2));
