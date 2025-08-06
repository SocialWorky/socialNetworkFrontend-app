require('dotenv').config();
const fs = require('fs');
const path = './src/index.html';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    return console.log(err);
  }

  let result = data.replace(/__TITLE__/g, process.env.NG_APP_META_TITLE)
                   .replace(/__DESCRIPTION__/g, process.env.NG_APP_META_DESCRIPTION)
                   .replace(/__KEYWORDS__/g, process.env.NG_APP_META_KEYWORDS)
                   .replace(/_IMAGE_/g, process.env.NG_APP_META_IMAGE)
                   .replace(/_URL_/g, process.env.NG_APP_META_URL)
                   .replace(/__OG_SITE_NAME__/g, process.env.NG_APP_META_OG_SITE_NAME)
                   .replace(/OG_URL/g, process.env.NG_APP_META_OG_URL)
                   .replace(/__OG_TITLE__/g, process.env.NG_APP_META_OG_TITLE)
                   .replace(/__OG_DESCRIPTION__/g, process.env.NG_APP_META_OG_DESCRIPTION)
                   .replace(/OG_IMAGE/g, process.env.NG_APP_META_OG_IMAGE)
                   .replace(/__TWITTER_CARD__/g, process.env.NG_APP_META_TWITTER_CARD)
                   .replace(/TWITTER_URL/g, process.env.NG_APP_META_TWITTER_URL)
                   .replace(/__TWITTER_TITLE__/g, process.env.NG_APP_META_TWITTER_TITLE)
                   .replace(/__TWITTER_DESCRIPTION__/g, process.env.NG_APP_META_TWITTER_DESCRIPTION)
                   .replace(/TWITTER_IMAGE/g, process.env.NG_APP_META_TWITTER_IMAGE)
                   .replace(/__PWA_NAME__/g, process.env.NG_APP_PWA_NAME)
                   .replace(/__PWA_SHORT_NAME__/g, process.env.NG_APP_PWA_SHORT_NAME)
                   .replace(/__PWA_BACKGROUND_COLOR__/g, process.env.NG_APP_PWA_BACKGROUND_COLOR || 'ffffff')
                   .replace(/__PWA_THEME_COLOR__/g, process.env.NG_APP_PWA_THEME_COLOR || '000000');

  fs.writeFile(path, result, 'utf8', (err) => {
     if (err) return console.log(err);
     console.log('Meta tags actualizados correctamente');
  });
});
