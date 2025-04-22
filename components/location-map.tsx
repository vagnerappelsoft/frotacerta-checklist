"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface LocationMapProps {
  latitude: number | null
  longitude: number | null
  address: string | null
  className?: string
  interactive?: boolean
  onOpenFullMap?: () => void
}

export function LocationMap({
  latitude,
  longitude,
  address,
  className = "",
  interactive = false,
  onOpenFullMap,
}: LocationMapProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mapRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (latitude && longitude) {
      // Para este exemplo, usamos um placeholder simples
      // Em um app real, você usaria um serviço de mapas como Google Maps, Mapbox, etc.
      const placeholderMapUrl = `/placeholder.svg?height=300&width=600&text=Localização:+${latitude.toFixed(6)},${longitude.toFixed(6)}`

      setMapUrl(placeholderMapUrl)
      setIsLoading(false)
    }
  }, [latitude, longitude])

  const handleMapLoad = () => {
    setIsLoading(false)
  }

  if (!latitude || !longitude) {
    return (
      <Card className={`flex items-center justify-center p-4 h-40 ${className}`}>
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>Localização não disponível</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {mapUrl && (
          <div className="relative">
            {interactive ? (
              <iframe
                ref={mapRef}
                src={mapUrl}
                width="100%"
                height="300"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                onLoad={handleMapLoad}
                title="Mapa de localização"
                className="w-full"
              />
            ) : (
              <div
                className="bg-muted h-40 flex items-center justify-center relative"
                style={{
                  backgroundImage: `url(${mapUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-blue-500 drop-shadow-md" />
                </div>

                {onOpenFullMap && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                    onClick={onOpenFullMap}
                  >
                    Ver mapa completo
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {address && (
          <div className="p-3 bg-white border-t text-sm flex items-start">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
