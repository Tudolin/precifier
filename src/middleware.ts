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
     *  - arquivos estaticos do Next e o favicon
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
