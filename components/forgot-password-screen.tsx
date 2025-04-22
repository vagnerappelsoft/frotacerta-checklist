"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiService } from "@/lib/api-service"
import Link from "next/link"
// Importar o componente Logo
import { Logo } from "@/components/ui/logo"

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Validar e-mail
      if (!email.trim()) {
        throw new Error("E-mail é obrigatório")
      }

      // Validar formato de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error("Formato de e-mail inválido")
      }

      // Enviar solicitação de redefinição de senha
      await apiService.requestPasswordReset(email)

      // Mostrar mensagem de sucesso
      setSuccess(
        "Enviamos um e-mail com instruções para redefinir sua senha. Por favor, verifique sua caixa de entrada.",
      )
      setEmail("")
    } catch (err: any) {
      setError(err.message || "Falha ao solicitar redefinição de senha. Tente novamente mais tarde.")
    } finally {
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
          <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
          <CardDescription className="text-center">
            Informe seu e-mail para receber instruções de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                "Enviar Instruções"
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
