import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"
import { AuthProvider } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth-guard"
import { ApiErrorHandler } from "@/components/api-error-handler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Checklist Veicular",
  description: "Aplicativo de checklist veicular para motoristas",
  themeColor: "#f97316",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Checklist Veicular",
  },
  formatDetection: {
    telephone: false,
  },
    generator: 'v0.dev'
}

// Adicionar um console.log para mostrar as variáveis de ambiente disponíveis
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Log das variáveis de ambiente para debug
  if (typeof window !== "undefined") {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)
    console.log("Client ID:", process.env.NEXT_PUBLIC_CLIENT_ID)
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Checklist Veicular" />
        <meta name="apple-mobile-web-app-title" content="Checklist Veicular" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <ApiErrorHandler />
            <AuthGuard>{children}</AuthGuard>
          </ThemeProvider>
        </AuthProvider>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('Service Worker registrado com sucesso:', registration.scope);
                      
                      // Verificar atualizações do service worker
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        console.log('Novo Service Worker instalando...');
                        
                        newWorker.addEventListener('statechange', function() {
                          console.log('Service Worker estado:', newWorker.state);
                        });
                      });
                      
                      // Verificar atualizações periodicamente
                      setInterval(function() {
                        registration.update();
                        console.log('Verificando atualizações do Service Worker...');
                      }, 60 * 60 * 1000); // A cada hora
                    })
                    .catch(function(err) {
                      console.error('Falha ao registrar Service Worker:', err);
                    });
                });
                
                // Lidar com atualizações do service worker
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  console.log('Novo Service Worker ativado, recarregando para atualizar...');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
