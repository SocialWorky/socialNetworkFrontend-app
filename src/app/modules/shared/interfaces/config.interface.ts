export interface Config {
  logoUrl?: string;
  title?: string;
  themeColors?: string;
  privacyPolicy?: string;
  customCss?: string;
  contactEmail?: string;
  faviconUrl?: string;
  loginMethods?: string;
  urlSite?: string;
  description?: string;
  invitationCode?: boolean;
}

export interface ConfigServiceInterface {
  services: {
    logs: {
      token: string;
      urlApi: string;
      enabled: boolean;
    };
  };
}
