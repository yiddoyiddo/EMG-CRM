import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { ReportingFiltersProvider } from '@/context/ReportingFiltersContext';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReactQueryProvider } from "@/lib/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactQueryProvider>
          <ReportingFiltersProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                <div className="min-h-screen bg-background">
                  <header className="border-b bg-sidebar shadow-sm">
                    <div className="container flex h-16 items-center justify-between px-2 sm:px-4 md:px-6">
                      <Image 
                        src="/logo.png"
                        alt="EMG Logo"
                        width={120}
                        height={120}
                        className="object-contain invert dark:invert-0"
                      />
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="container mx-auto max-w-[95%] 2xl:max-w-[90%] px-2 sm:px-4 md:px-6 py-4 md:py-8">
                    <div className="rounded-lg bg-card shadow-sm border border-border/40 p-4">
                      {children}
                    </div>
                  </main>
                </div>
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </ReportingFiltersProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
