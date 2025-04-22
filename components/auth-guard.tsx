"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Ignorar verificação se estiver carregando
    if (isLoading) return

    // Se não estiver autenticado e não estiver na página de login, redirecionar para login
    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router, pathname])

  // Mostrar indicador de carregamento enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não estiver autenticado e não estiver na página de login, não renderizar nada
  if (!isAuthenticated && pathname !== "/login") {
    return null
  }

  // Caso contrário, renderizar os filhos
  return <>{children}</>
}
