const env = require('env');
const fs = require('fs');
let path = require('path');
const successColor = '\x1b[32m%s\x1b[0m';
const checkSign = '\u{2705}';
const envList = ['local', 'prod'];

envList.forEach(en => {
  const envPath = en !== 'local' ? `.${en}` : '';

  const envFile = `export const environment = {
    production: '${env.PRODUCTION}',
    apiUrl: '${env.API_URL}',
    baseUrl: '${env.BASE_URL}',
    clienIdGoogle: '${env.CLIEN_ID_GOOGLE}',
    appVersion: '${env.APP_VERSION}',
    appPort: '${env.APP_PORT}',
  };
`;

  const targetPath = path.join(__dirname, `./src/environments/environment${envPath}.ts`);
  fs.writeFile(targetPath, envFile, (err) => {
    if (err) {
      console.error(err);
      throw err;
    } else {
      console.log(successColor, `${checkSign} Successfully generated ${en} environment file`);
    }
  });
});