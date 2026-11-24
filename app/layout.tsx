import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "DebateMe AI",
  description: "Write a quick claim, evidence, and reasoning. Get graded.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
