import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserNav } from "@/components/user-nav";
import { Providers } from "@/components/providers";
import { ContextAwareNav } from "@/components/context-aware-nav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isPerfMode = process.env.NEXT_PUBLIC_PERF_MODE === '1';
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {/* Background decorative layers (disabled in perf mode) */}
              {!isPerfMode && (
                <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                  <div className="absolute -top-28 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,theme(colors.primary)/35%,transparent)] blur-3xl" />
                  <div className="absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,theme(colors.chart-3)/28%,transparent)] blur-[80px]" />
                  <div className="absolute top-1/3 left-1/2 h-[280px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-[conic-gradient(from_30deg,theme(colors.accent)/22%,transparent_60%)] blur-3xl" />
                </div>
              )}

              <div className={isPerfMode ? 'min-h-screen bg-background' : "min-h-screen bg-background/80 [background-image:radial-gradient(1200px_600px_at_100%_-10%,color-mix(in_oklab,theme(colors.primary),transparent_85%),transparent),radial-gradient(1000px_500px_at_0%_110%,color-mix(in_oklab,theme(colors.accent),transparent_85%),transparent)]"}>
                {/* Context-aware navigation */}
                <ContextAwareNav />
                
                {/* Main header - visible on mobile, hidden on desktop when nav is shown */}
                <header className={isPerfMode ? 'border-b bg-background md:hidden' : "border-b/60 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30 shadow-[0_10px_30px_-10px_color-mix(in_oklab,theme(colors.primary),transparent_92%)] md:hidden"}>
                  <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <ThemeToggle />
                      <UserNav />
                    </div>
                  </div>
                </header>

                {/* Desktop header in navigation area */}
                <div className="hidden md:block">
                  <div className="md:pl-64">
                    <header className={isPerfMode ? 'border-b bg-background' : "border-b/60 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30 shadow-[0_10px_30px_-10px_color-mix(in_oklab,theme(colors.primary),transparent_92%)]"}>
                      <div className="flex h-14 items-center justify-end px-6">
                        <div className="flex items-center gap-4">
                          <ThemeToggle />
                          <UserNav />
                        </div>
                      </div>
                    </header>
                  </div>
                </div>

                {/* Main content area */}
                <div className="md:pl-64">
                  <main className="container mx-auto max-w-[95%] 2xl:max-w-[88%] px-2 sm:px-4 md:px-8 py-6 md:py-10">
                    <div className={isPerfMode ? 'rounded-2xl border bg-background p-4 md:p-8' : "rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-[0_15px_40px_-20px_color-mix(in_oklab,theme(colors.primary),transparent_88%)] p-4 md:p-8"}>
                      {children}
                    </div>
                  </main>
                </div>
              </div>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
