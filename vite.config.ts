import { defineConfig, type Plugin } from "vite";

// Content Security Policy — locks down what the page may load/run. Only self +
// Google Analytics (gtag.js from googletagmanager, beacons to *.google-analytics)
// are allowed; everything else is blocked. 'unsafe-inline' is required for the
// inline gtag/consent snippet and Phaser's injected canvas styles.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

// Inject the CSP <meta> into the BUILT index.html only. In dev it's skipped so
// Vite's HMR websocket + injected client scripts keep working. (GitHub Pages
// can't set real HTTP headers, so <meta> is how we ship CSP there.)
function cspMeta(): Plugin {
  return {
    name: "inject-csp-meta",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

// Survive the Sprint — static web build, deployable to Netlify / Vercel / GitHub Pages.
// `base: "./"` keeps asset paths relative so the build works from any subpath.
export default defineConfig({
  base: "./",
  plugins: [cspMeta()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
