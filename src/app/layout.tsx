import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nora — a softer way to study",
  description:
    "A cozy pixel-art study app combining evidence-based learning with gentle gamification. Feynman technique, spaced repetition, AI research, and your Pokémon companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontSize: "125%" }}
    >
      <head>
        <link rel="preload" href="/sprites/ui/buttons-26x26.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box-big.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/icons.png" as="image" type="image/png" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
