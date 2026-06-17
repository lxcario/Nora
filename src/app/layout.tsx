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
    >
      <head>
        <link rel="preload" href="/sprites/ui/buttons-26x26.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box-big.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/icons.png" as="image" type="image/png" />
        {/* No-flash: apply cursor pack + animation + theme + accent before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;d.setAttribute('data-cursor',localStorage.getItem('pixel-cursor-pack')==='catpaw'?'catpaw':'travelbook');d.setAttribute('data-animations',localStorage.getItem('pixel-animations')==='off'?'off':'on');d.setAttribute('data-theme',localStorage.getItem('pixel-theme')==='light'?'light':'dark');var a=localStorage.getItem('pixel-accent-color');if(a){d.style.setProperty('--pixel-accent',a);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
