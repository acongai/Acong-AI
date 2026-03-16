import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Acong",
  description: "AI chat app with a sarcastic, reluctant persona.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} bg-background font-sans text-foreground antialiased`}
      >
        {children}
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
