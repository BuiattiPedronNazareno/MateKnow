import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const googleSans = localFont({
  src: "./fonts/GoogleSansFlex-Variable.ttf",
  variable: "--font-google-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MateKnow",
  description: "Plataforma de aprendizaje",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={googleSans.variable}>
        <Providers>{children}</Providers>

        <Script id="mathjax-config" strategy="beforeInteractive">
          {`
            window.MathJax = {
              startup: {
                typeset: true
              },
              tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']]
              },
              options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
                ignoreHtmlClass: 'mathjax_ignore', // <--- AGREGA ESTA LÍNEA
                processHtmlClass: 'mathjax_process'
              }
            };
          `}
        </Script>

        <Script
          id="mathjax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}