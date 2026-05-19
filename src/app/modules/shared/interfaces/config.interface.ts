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
    subscriptionMode?: boolean;
    verifiedBadgeUrl?: string;
    premiumBadgeUrl?: string;
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
  subscriptionMode?: boolean;
  verifiedBadgeUrl?: string;
  premiumBadgeUrl?: string;
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
