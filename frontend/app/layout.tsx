import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from './providers';

// 使用本地字体文件，避免构建时访问 Google Fonts（支持完全离线构建）
const pacifico = localFont({
  src: '../public/fonts/pacifico/pacifico.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-pacifico',
});

const geistSans = localFont({
  src: '../public/fonts/geist/geist.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: '../public/fonts/geist-mono/geist-mono.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '协和医疗影像诊断系统',
  description: '专业的医疗影像诊断和管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* Remix Icon CSS - 本地字体，不依赖外网 CDN */}
        <link
          rel="stylesheet"
          href="/fonts/remixicon/remixicon.min.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
