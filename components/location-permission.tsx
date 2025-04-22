"use client"

import { useState, useEffect } from "react"
import { MapPin, AlertCircle, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useGeolocation } from "@/hooks/use-geolocation"

interface LocationPermissionProps {
  onLocationCaptured: (locationData: {
    latitude: number
    longitude: number
    accuracy: number
    timestamp: number
    address: string | null
  }) => void
  onCancel: () => void
}

export function LocationPermission({ onLocationCaptured, onCancel }: LocationPermissionProps) {
  const [permissionRequested, setPermissionRequested] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const { latitude, longitude, accuracy, timestamp, address, loading, error, getCurrentPosition } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 30000, // 30 segundos
    maximumAge: 0,
    onError: (err) => {
      console.error("Erro de geolocalização:", err.code, err.message)
    },
  })

  // Efeito para tentar novamente automaticamente em caso de erro de timeout
  useEffect(() => {
    if (error && error.includes("expirou") && retryCount < 2 && permissionRequested) {
      const timer = setTimeout(() => {
        console.log("Tentando obter localização novamente após timeout...")
        setRetryCount((prev) => prev + 1)
        getCurrentPosition()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [error, retryCount, permissionRequested, getCurrentPosition])

  const handleRequestLocation = () => {
    setPermissionRequested(true)
    setRetryCount(0)
    getCurrentPosition()
  }

  const handleConfirm = () => {
    if (latitude && longitude && timestamp) {
      onLocationCaptured({
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp,
        address,
      })
    }
  }

  const handleSkipWithCoordinates = () => {
    // Se temos coordenadas mas houve algum erro com o endereço, ainda podemos prosseguir
    if (latitude && longitude && timestamp) {
      onLocationCaptured({
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp,
        address: null,
      })
    } else {
      onCancel()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-500" />
          Localização
        </CardTitle>
        <CardDescription>
          Precisamos da sua localização para registrar onde este checklist foi realizado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!permissionRequested ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm">
                Sua localização será registrada apenas no momento da submissão do checklist e será usada apenas para
                fins de verificação.
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <p>Sua privacidade é importante para nós</p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <p>Sua localização não será compartilhada com terceiros</p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <p>Você pode optar por não compartilhar sua localização</p>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Obtendo sua localização...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, permita o acesso à sua localização quando solicitado pelo navegador
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-blue-500 mt-2">
                Tentativa {retryCount + 1}... Isso pode levar alguns segundos.
              </p>
            )}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao obter localização</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <p className="text-sm">
                Verifique se o GPS está ativado e se você concedeu permissão para acessar sua localização.
              </p>
            </AlertDescription>
          </Alert>
        ) : latitude && longitude ? (
          <div className="space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <Check className="h-4 w-4" />
              <AlertTitle>Localização obtida com sucesso!</AlertTitle>
              <AlertDescription className="text-green-700">
                Sua localização foi capturada e será registrada com este checklist.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Latitude:</div>
                <div className="font-mono">{latitude.toFixed(6)}</div>

                <div className="text-muted-foreground">Longitude:</div>
                <div className="font-mono">{longitude.toFixed(6)}</div>

                <div className="text-muted-foreground">Precisão:</div>
                <div>{accuracy ? `${Math.round(accuracy)} metros` : "Desconhecida"}</div>
              </div>

              {address && (
                <div className="pt-2 border-t text-sm">
                  <div className="text-muted-foreground mb-1">Endereço aproximado:</div>
                  <div>{address}</div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          {error ? "Pular" : "Cancelar"}
        </Button>

        {!permissionRequested ? (
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleRequestLocation}>
            <MapPin className="h-4 w-4 mr-2" />
            Compartilhar Localização
          </Button>
        ) : error ? (
          <div className="space-x-2">
            {latitude && longitude ? (
              <Button variant="outline" onClick={handleSkipWithCoordinates}>
                Usar coordenadas
              </Button>
            ) : null}
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleRequestLocation}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        ) : latitude && longitude ? (
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleConfirm}>
            Confirmar
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
