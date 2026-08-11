import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Preço Certo | Casa de Massas",
  description: "Controle simples de custos, lucro e preço dos seus pratos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b65c22",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        {/* Avisos de sucesso e erro (toasts) grandes e faceis de ler */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
          toastOptions={{ style: { fontSize: "1rem" } }}
        />
      </body>
    </html>
  );
}
