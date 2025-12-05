import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { RealtimeManager } from "@/components/RealtimeManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moodz - Light Sync",
  description: "Synchronize your lights with music",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RealtimeManager />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
