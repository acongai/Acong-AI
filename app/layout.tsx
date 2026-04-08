import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Acong",
  description: "AI chat app with a sarcastic, reluctant persona.",
};

import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { CharacterProvider } from "@/hooks/useCharacter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${barlow.variable} bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <CharacterProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </CharacterProvider>
        </ThemeProvider>
        <Toaster
          position="top-center"
          richColors
          theme="light"
          toastOptions={{
            classNames: {
              toast: "!border-[#E4E4E4] !bg-white !text-[#111111]",
            },
          }}
        />
      </body>
    </html>
  );
}
