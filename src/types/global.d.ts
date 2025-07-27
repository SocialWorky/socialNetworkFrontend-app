// PWA Cache Utils global functions
declare global {
  interface Window {
    loadPWACacheUtils: () => Promise<any>;
    clearPWACache: () => Promise<void>;
    PWACacheUtils?: any;
  }
}

export {}; 