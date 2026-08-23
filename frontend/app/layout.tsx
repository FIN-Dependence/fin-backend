import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINDEPENDENCE | 첫 독립 금융 AI",
  description: "첫 독립에 필요한 금융환경을 저장하고, 빠진 준비를 발견하는 청년 금융자립 AI",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "FINDEPENDENCE | 첫 독립 금융 AI",
    description: "첫 독립, 빠진 금융 준비를 AI가 찾아드립니다.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "FINDEPENDENCE 서비스 소개" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FINDEPENDENCE | 첫 독립 금융 AI",
    description: "첫 독립, 빠진 금융 준비를 AI가 찾아드립니다.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
