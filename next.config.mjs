/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Gera uma pasta .next/standalone com o servidor e SO as dependencias
   * realmente usadas. E o que deixa a imagem Docker de producao pequena.
   * Na Vercel esta opcao e simplesmente ignorada.
   */
  output: "standalone",

  experimental: {
    /**
     * DESLIGA O CACHE DE NAVEGACAO DO NAVEGADOR.
     *
     * Por padrao o Next guarda por 30s, na memoria do navegador, o
     * resultado das telas ja visitadas. Ao clicar no menu, ele reaproveita
     * essa copia em vez de perguntar ao servidor — e o dono via numeros
     * velhos ate apertar F5.
     *
     * Num sistema de precificacao isso e inaceitavel: custo, margem e
     * lucro precisam refletir o banco no instante em que sao olhados.
     * Com 0, toda navegacao busca os dados de novo.
     */
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
