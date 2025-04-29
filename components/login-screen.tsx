"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"

// Remove the CLIENT_ID import
// import { CLIENT_ID } from "@/lib/constants"
import { apiService } from "@/lib/api-service"

export function LoginScreen() {
  // Remover as credenciais de teste pré-preenchidas
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  // Initialize clientId as empty string instead of using CLIENT_ID
  const [clientId, setClientId] = useState("")

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  // Modificar o handleLogin para armazenar o clientId antes de fazer login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Validar campos
      if (!username.trim()) {
        throw new Error("Nome de usuário é obrigatório")
      }

      if (!password.trim()) {
        throw new Error("Senha é obrigatória")
      }

      if (!clientId.trim()) {
        throw new Error("ID do Cliente é obrigatório")
      }

      // Armazenar o clientId no localStorage para uso pelo hook de autenticação
      localStorage.setItem("client_id", clientId)

      // Configurar o clientId no serviço de API
      apiService.setClientId(clientId)

      // Tentar fazer login
      await login(username, password)

      // Mostrar mensagem de sucesso com indicação de sincronização
      setSuccess("Login realizado com sucesso! Sincronizando dados...")

      // Redirecionar após um atraso maior para permitir a sincronização
      setTimeout(() => {
        router.push("/")
      }, 2500)
    } catch (err: any) {
      setError(err.message || "Falha na autenticação. Verifique suas credenciais.")
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    alert("Por favor, entre em contato com o seu gestor para redefinir sua senha.")
  }

  return (
    <div className="container max-w-md mx-auto p-4 flex items-center justify-center min-h-screen">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <img src="/logo-frota-certa.svg" alt="Frota Certa Logo" className="h-20" />
          </div>
          <CardDescription className="text-center">Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Seu nome de usuário"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    onClick={handleForgotPassword}
                    className="text-xs text-blue-500 hover:text-blue-700"
                    type="button"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Código da Empresa</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientId"
                    placeholder="Código da Empresa"
                    className="pl-9"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Identificador único da sua empresa no sistema</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Sucesso</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button type="submit" className="w-full mt-6 bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {success && success.includes("Sincronizando") ? "Sincronizando dados..." : "Autenticando..."}
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            {isLoading && success && success.includes("Sincronizando") && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs text-center mt-1 text-muted-foreground">Isso pode levar alguns segundos...</p>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-xs text-center text-muted-foreground mt-2">
            Ao entrar, você concorda com os termos de uso e política de privacidade.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
