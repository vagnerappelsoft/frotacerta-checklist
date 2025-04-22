"use client"

import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface OfflineFallbackProps {
  message?: string
  onRetry?: () => void
}

export function OfflineFallback({ message, onRetry }: OfflineFallbackProps) {
  return (
    <div className="container max-w-md mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <WifiOff className="h-6 w-6" />
            <CardTitle>Você está offline</CardTitle>
          </div>
          <CardDescription>
            {message || "Não foi possível conectar ao servidor. Verifique sua conexão com a internet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Você pode continuar usando o aplicativo no modo offline. Suas alterações serão sincronizadas quando a
            conexão for restaurada.
          </p>
        </CardContent>
        {onRetry && (
          <CardFooter>
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={onRetry}>
              Tentar novamente
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
