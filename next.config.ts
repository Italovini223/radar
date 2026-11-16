import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents/partialPrefetching (padrão do create-next-app nesta versão)
  // foram desligados: o Radar é um app 100% de estado no navegador, sem dados de
  // servidor para cachear, e exigiriam Suspense em volta do shell inteiro.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
