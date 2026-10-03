import type { Metadata } from "next";
import localFont from "next/font/local";
import { VideoBackground } from "../components/video-background";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CloudIDE",
  description:
    "Cloud GitHub development platform — import a repository and work on it in a browser-based IDE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <VideoBackground />
        {children}
      </body>
    </html>
  );
}
