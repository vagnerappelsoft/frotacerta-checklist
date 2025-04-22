"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiService } from "@/lib/api-service"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export function ApiLoginTest() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setTokenInfo(null)
    setIsLoading(true)

    try {
      // Tentar fazer login
      const result = await apiService.login(username, password)

      setSuccess("Login realizado com sucesso!")
      setTokenInfo(JSON.stringify(result, null, 2))
    } catch (err: any) {
      setError(err.message || "Falha na autenticação")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Teste de Login na API</CardTitle>
        <CardDescription>Teste a autenticação com a API Frota Certa</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              required
            />
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

          {tokenInfo && (
            <div className="mt-4 p-3 bg-slate-50 rounded-md">
              <Label className="mb-2 block">Informações do Token:</Label>
              <pre className="text-xs overflow-auto max-h-40 p-2 bg-slate-100 rounded">{tokenInfo}</pre>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              "Testar Login"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
