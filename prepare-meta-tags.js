const fs = require('fs');
const path = require('path');

const envVariables = {
  title: process.env.META_TITLE,
  description: process.env.META_DESCRIPTION,
  ogSiteName: process.env.META_OG_SITE_NAME,
  ogUrl: process.env.META_OG_URL,
  ogTitle: process.env.META_OG_TITLE,
  ogDescription: process.env.META_OG_DESCRIPTION,
  ogImage: process.env.META_OG_IMAGE,
  twitterCard: process.env.META_TWITTER_CARD,
  twitterUrl: process.env.META_TWITTER_URL,
  twitterTitle: process.env.META_TWITTER_TITLE,
  twitterDescription: process.env.META_TWITTER_DESCRIPTION,
  twitterImage: process.env.META_TWITTER_IMAGE
};

const indexPath = path.join(__dirname, 'src', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent
  .replace(/content="" name="title"/, `content="${envVariables.title}" name="title"`)
  .replace(/content="" name="description"/, `content="${envVariables.description}" name="description"`)
  .replace(/content="" property="og:site_name"/, `content="${envVariables.ogSiteName}" property="og:site_name"`)
  .replace(/content="" property="og:url"/, `content="${envVariables.ogUrl}" property="og:url"`)
  .replace(/content="" property="og:title"/, `content="${envVariables.ogTitle}" property="og:title"`)
  .replace(/content="" property="og:description"/, `content="${envVariables.ogDescription}" property="og:description"`)
  .replace(/content="" property="og:image"/, `content="${envVariables.ogImage}" property="og:image"`)
  .replace(/content="" property="twitter:card"/, `content="${envVariables.twitterCard}" property="twitter:card"`)
  .replace(/content="" property="twitter:url"/, `content="${envVariables.twitterUrl}" property="twitter:url"`)
  .replace(/content="" property="twitter:title"/, `content="${envVariables.twitterTitle}" property="twitter:title"`)
  .replace(/content="" property="twitter:description"/, `content="${envVariables.twitterDescription}" property="twitter:description"`)
  .replace(/content="" property="twitter:image"/, `content="${envVariables.twitterImage}" property="twitter:image"`);

fs.writeFileSync(indexPath, indexContent, 'utf8');
