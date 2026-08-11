/**
 * Protege TODAS as paginas do sistema.
 * Quem nao estiver logado e mandado para /login automaticamente.
 */
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /**
     * Protege tudo, menos:
     *  - /login              (a propria tela de entrada)
     *  - /api/auth/*         (rotas internas do NextAuth)
     *  - /api/diagnostico    (precisa abrir SEM login, e justamente para
     *                         descobrir por que o login nao funciona;
     *                         nao devolve nenhum valor secreto)
     *  - arquivos estaticos do Next e o favicon
     */
    "/((?!login|api/auth|api/diagnostico|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
