/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
    "./src/**/*.component.{html,ts,scss}",
  ],
  theme: {
    extend: {
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
  // Optimizaciones para producción
  corePlugins: {
    // Deshabilitar plugins no utilizados
    preflight: true,
    container: false,
    accessibility: false,
  },
  // Configuración de safelist para clases que deben mantenerse
  safelist: [
    // Clases que deben mantenerse aunque no se detecten
    'dark-mode',
    'content-worky',
    'worky-module-container',
    'loader',
    'fadeIn',
    'fast',
    'filled',
    'worky-50',
    'worky-100',
    'worky-chip',
    'nav-link',
    'badge-notification',
    'link-preview',
    'link-preview-content',
    'link-preview-info',
    'no-select-text',
    'markdown',
    'link-preview-youtube',
    'red-color',
    'green-color',
    'blue-color',
    'yellow-color',
    'navy-color',
    'white-color',
    'bg-red-color',
    'bg-green-color',
    'bg-blue-color',
    'bg-yellow-color',
    'bg-navy-color',
    'mobil-content-app',
    'floating-button',
    'content-fields',
    'dragging-global',
    'extra-mat-tooltip',
    'modal-open',
    'modal-backdrop',
    'accessible-loading',
    'loading-wrapper',
    'loading-content',
    'safe-bottom',
    'fixed-top'
  ]
}

