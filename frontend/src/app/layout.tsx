import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maharashtra State Board Question Paper Generator",
  description: "AI-Powered RAG platform to automatically generate Maharashtra State Board style question papers with shuffled sets and answer keys.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#03040c] text-white">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
