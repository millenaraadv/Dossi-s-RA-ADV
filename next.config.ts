import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota server + node_modules mínimos em .next/standalone — é o que o
  // Dockerfile copia para a imagem final, sem precisar do node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
