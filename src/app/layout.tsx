import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sproutLands = localFont({
  src: "../../public/fonts/sprout-lands.ttf",
  variable: "--font-pixel",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Nora - a softer way to study",
  description:
    "A cozy pixel-art study app combining evidence-based learning with gentle gamification. Feynman technique, spaced repetition, AI research, and a gentle companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sproutLands.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/sprites/ui/buttons-26x26.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/dialog-box-big.png" as="image" type="image/png" />
        <link rel="preload" href="/sprites/ui/icons.png" as="image" type="image/png" />
        {/* No-flash: apply cursor pack + animation + theme + palette before first paint */}
        { }
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var d=document.documentElement;
d.setAttribute('data-cursor',localStorage.getItem('pixel-cursor-pack')==='travelbook'?'travelbook':'catpaw');
d.setAttribute('data-animations',localStorage.getItem('pixel-animations')==='off'?'off':'on');
var p=localStorage.getItem('pixel-palette');
if(p&&p!==''){
  var palettes={
    ember:{'--background':'#1a1410','--foreground':'#f0e6d2','--pixel-bg-primary':'#1a1410','--pixel-bg-secondary':'#241c14','--pixel-bg-surface':'#2a2018','--pixel-bg-elevated':'#342a1e','--pixel-text-primary':'#f0e6d2','--pixel-text-secondary':'#c4a882','--pixel-text-muted':'#8b7355','--pixel-accent':'#d4a526','--pixel-accent-hover':'#e6b832','--pixel-success':'#7da856','--pixel-warning':'#e6b832','--pixel-error':'#c45a58','--pixel-border':'#3d2817','--pixel-border-light':'#5a3d2e','--pixel-disabled':'#4a3d30','--pixel-sidebar-bg':'#1e1814','--grid-bg-base':'#160f0a','--grid-bg-base-2':'#1f1610'},
    forest:{'--background':'#0d1a12','--foreground':'#d4e8d0','--pixel-bg-primary':'#0d1a12','--pixel-bg-secondary':'#142218','--pixel-bg-surface':'#1a2b1e','--pixel-bg-elevated':'#233824','--pixel-text-primary':'#d4e8d0','--pixel-text-secondary':'#8fb88a','--pixel-text-muted':'#5a8055','--pixel-accent':'#6bc25e','--pixel-accent-hover':'#82d875','--pixel-success':'#7dd87d','--pixel-warning':'#d4b84e','--pixel-error':'#c45a58','--pixel-border':'#2a4a2a','--pixel-border-light':'#3d6a3d','--pixel-disabled':'#2a3d2a','--pixel-sidebar-bg':'#0f1e14','--grid-bg-base':'#0d1a12','--grid-bg-base-2':'#142218'},
    ocean:{'--background':'#0a1420','--foreground':'#cee4f0','--pixel-bg-primary':'#0a1420','--pixel-bg-secondary':'#101e2e','--pixel-bg-surface':'#162838','--pixel-bg-elevated':'#1e3448','--pixel-text-primary':'#cee4f0','--pixel-text-secondary':'#7ab4d4','--pixel-text-muted':'#4a8aaa','--pixel-accent':'#4db8e8','--pixel-accent-hover':'#6dc8f0','--pixel-success':'#5cc8a0','--pixel-warning':'#e6c04e','--pixel-error':'#d45a68','--pixel-border':'#1e3a54','--pixel-border-light':'#2e5a78','--pixel-disabled':'#1e3040','--pixel-sidebar-bg':'#0c1824','--grid-bg-base':'#0a1420','--grid-bg-base-2':'#101e2e'},
    lavender:{'--background':'#14101e','--foreground':'#e4d8f0','--pixel-bg-primary':'#14101e','--pixel-bg-secondary':'#1e1828','--pixel-bg-surface':'#261e34','--pixel-bg-elevated':'#302840','--pixel-text-primary':'#e4d8f0','--pixel-text-secondary':'#aa8ed4','--pixel-text-muted':'#7a5ea0','--pixel-accent':'#a87ee0','--pixel-accent-hover':'#be9af0','--pixel-success':'#7da856','--pixel-warning':'#e0b050','--pixel-error':'#d45a68','--pixel-border':'#3a2850','--pixel-border-light':'#5a4070','--pixel-disabled':'#2e2040','--pixel-sidebar-bg':'#120e1a','--grid-bg-base':'#14101e','--grid-bg-base-2':'#1e1828'},
    rose:{'--background':'#1a0f14','--foreground':'#f0dce4','--pixel-bg-primary':'#1a0f14','--pixel-bg-secondary':'#24151c','--pixel-bg-surface':'#2e1c24','--pixel-bg-elevated':'#3a242e','--pixel-text-primary':'#f0dce4','--pixel-text-secondary':'#d4909a','--pixel-text-muted':'#a06070','--pixel-accent':'#e06888','--pixel-accent-hover':'#f07898','--pixel-success':'#7da856','--pixel-warning':'#e6b832','--pixel-error':'#e04858','--pixel-border':'#4a2030','--pixel-border-light':'#6a3848','--pixel-disabled':'#3a1e28','--pixel-sidebar-bg':'#160d12','--grid-bg-base':'#1a0f14','--grid-bg-base-2':'#24151c'}
  };
  var vars=palettes[p];
  if(vars){Object.keys(vars).forEach(function(k){d.style.setProperty(k,vars[k]);});}
  d.setAttribute('data-theme','dark');
} else {
  d.setAttribute('data-theme',localStorage.getItem('pixel-theme')==='light'?'light':'dark');
  var a=localStorage.getItem('pixel-accent-color');
  if(a){d.style.setProperty('--pixel-accent',a);}
}
}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
