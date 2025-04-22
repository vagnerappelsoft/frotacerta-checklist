"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorFallbackProps {
  error: Error | string
  resetErrorBoundary: () => void
  onCancel?: () => void
}

export function ErrorFallback({ error, resetErrorBoundary, onCancel }: ErrorFallbackProps) {
  const errorMessage = typeof error === "string" ? error : error.message || "Ocorreu um erro inesperado"

  return (
    <div className="container max-w-md mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>Erro ao Processar Checklist</CardTitle>
          </div>
          <CardDescription>Ocorreu um problema ao salvar ou processar o checklist.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mb-4">
            <p className="font-medium mb-1">Detalhes do erro:</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Isso pode ter ocorrido devido a um problema de armazenamento ou conexão. Você pode tentar novamente ou
            voltar para a tela anterior.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Voltar
            </Button>
          )}
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={resetErrorBoundary}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
