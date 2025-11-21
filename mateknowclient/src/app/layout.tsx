import type { Metadata } from "next";
import localFont from "next/font/local"; // Importamos localFont
import "./globals.css";
import { Providers } from "./providers";

// Configura Google Sans Flex
const googleSans = localFont({
  src: "./fonts/GoogleSansFlex-Variable.ttf", // Asegúrate de tener el archivo aquí
  variable: "--font-google-sans",
  display: "swap",
  // Como es variable, no necesitas definir pesos específicos,
  // pero puedes limitar el rango si quieres.
});

export const metadata: Metadata = {
  title: "MateKnow",
  description: "Plataforma de aprendizaje",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Agregamos la variable al body */}
      <body className={googleSans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}