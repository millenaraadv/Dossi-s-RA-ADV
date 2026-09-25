import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota server + node_modules mínimos em .next/standalone — é o que o
  // Dockerfile copia para a imagem final, sem precisar do node_modules inteiro.
  output: "standalone",
  experimental: {
    // O proxy.ts (renovação de sessão) roda em toda rota, inclusive
    // /api/imports — por padrão o Next.js bufferiza o corpo da requisição só
    // até 10MB para esse caso, truncando uploads maiores e quebrando o parse
    // do multipart (POST /api/imports acaba em "Erro interno." sem log
    // nenhum específico). O limite de arquivo já validado na rota é 20MB;
    // aqui sobra margem para o overhead do multipart (boundaries, campos).
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
