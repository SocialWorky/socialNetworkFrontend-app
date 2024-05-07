if (require('../../env')) {
  const env = require('../../env')
}

export const environment = {
  PRODUCTION: true,
  API_URL: env.API_URL || 'http://localhost/api/v1',
  BASE_URL: env.BASE_URL || 'http://localhost:4200',
  CLIEN_ID_GOOGLE: env.CLIEN_ID_GOOGLE || 'apps.googleusercontent.com',
  APP_PORT: env.APP_PORT || 4200,
  APP_VERSION: env.APP_VERSION || '1.0.0',
};
