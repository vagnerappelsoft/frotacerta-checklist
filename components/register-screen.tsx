"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Mail, Lock, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiService } from "@/lib/api-service"
import Link from "next/link"

// Importar o componente Logo
import { Logo } from "@/components/ui/logo"

export function RegisterScreen() {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Validar campos
      if (!formData.username.trim()) {
        throw new Error("Nome de usuário é obrigatório")
      }

      if (!formData.name.trim()) {
        throw new Error("Nome completo é obrigatório")
      }

      if (!formData.email.trim()) {
        throw new Error("E-mail é obrigatório")
      }

      if (!formData.password.trim()) {
        throw new Error("Senha é obrigatória")
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("As senhas não coincidem")
      }

      // Validar formato de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error("Formato de e-mail inválido")
      }

      // Validar força da senha
      if (formData.password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres")
      }

      // Tentar registrar o usuário
      await apiService.registerUser({
        username: formData.username,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "driver", // Papel padrão
      })

      // Mostrar mensagem de sucesso
      setSuccess("Registro realizado com sucesso! Redirecionando para a página de login...")

      // Redirecionar após um breve atraso
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Falha no registro. Verifique seus dados e tente novamente.")
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
          <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center">
            Preencha os dados abaixo para criar sua conta no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    placeholder="Seu nome de usuário"
                    className="pl-9"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Seu nome completo"
                    className="pl-9"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    className="pl-9"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha"
                    className="pl-9"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">A senha deve ter pelo menos 8 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    className="pl-9"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                "Criar Conta"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center w-full">
            <Link href="/login" className="text-sm text-blue-500 hover:text-blue-700 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para o login
            </Link>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Ao criar uma conta, você concorda com os termos de uso e política de privacidade.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
