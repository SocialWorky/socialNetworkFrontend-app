export interface Config {
  settings?: {
    logoUrl?: string;
    title?: string;
    themeColors?: string;
    privacyPolicy?: string;
    contactEmail?: string;
    faviconUrl?: string;
    loginMethods?: string;
    urlSite?: string;
    description?: string;
    invitationCode?: boolean;
  };
  customCss?: string;
  // Legacy flat structure for backward compatibility
  logoUrl?: string;
  title?: string;
  themeColors?: string;
  privacyPolicy?: string;
  contactEmail?: string;
  faviconUrl?: string;
  loginMethods?: string;
  urlSite?: string;
  description?: string;
  invitationCode?: boolean;
}

export interface ConfigServiceInterface {
  services: {
    // Deprecated
    // logs: {
    //   token: string;
    //   urlApi: string;
    //   enabled: boolean;
    // };
  };
}
