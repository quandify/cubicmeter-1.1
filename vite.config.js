import tailwindcss from "tailwindcss";

/** @type {import('vite').UserConfig} */
export default {
  root: "./",
  server: {
    open: true, // opens the app in the default browser on startup
  },
  publicDir: "src",
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
};
