"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiService } from "@/lib/api-service"
import Link from "next/link"
// Importar o componente Logo
import { Logo } from "@/components/ui/logo"

interface ResetPasswordScreenProps {
  token: string
}

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Validar campos
      if (!password.trim()) {
        throw new Error("Nova senha é obrigatória")
      }

      if (password !== confirmPassword) {
        throw new Error("As senhas não coincidem")
      }

      // Validar força da senha
      if (password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres")
      }

      // Enviar solicitação de redefinição de senha
      await apiService.resetPassword(token, password)

      // Mostrar mensagem de sucesso
      setSuccess("Senha redefinida com sucesso! Redirecionando para a página de login...")

      // Redirecionar após um breve atraso
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Falha ao redefinir senha. Tente novamente mais tarde.")
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4 flex items-center justify-center min-h-screen">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Logo width={80} height={90} />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Redefinir Senha</CardTitle>
          <CardDescription className="text-center">Crie uma nova senha para sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua nova senha"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">A senha deve ter pelo menos 8 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
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
                  Processando...
                </>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-blue-500 hover:text-blue-700 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
