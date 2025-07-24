import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { I18nProvider } from '@/components/i18n-provider';

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Atto - Your Personal Tax Assistant",
  description: "Get expert tax advice with our Atto - Your Personal Tax Assistant",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <I18nProvider>
            <ThemeProvider defaultTheme="system" storageKey="atto-theme">
              <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
          </I18nProvider>
        </Suspense>
      </body>
    </html>
  );
}
