import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "../globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roca Real Estate - 360° Digital Marketing Proposal | Mutant",
  description: "Comprehensive digital marketing proposal for Roca Real Estate by Mutant Digital Agency",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RocaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
