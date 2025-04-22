"use client"

import { useState } from "react"

export interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  timestamp: number | null
  address: string | null
  loading: boolean
  error: string | null
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  onSuccess?: (position: GeolocationPosition) => void
  onError?: (error: GeolocationPositionError) => void
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 30000, // Aumentado para 30 segundos
  maximumAge: 0,
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    address: null,
    loading: false,
    error: null,
  })

  const mergedOptions = { ...defaultOptions, ...options }

  // Função mais robusta para obter o endereço a partir das coordenadas
  const getAddress = async (latitude: number, longitude: number) => {
    try {
      // Primeiro, tentamos usar a API Nominatim do OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "User-Agent": "VehicleChecklistApp/1.0",
          },
          // Adicionando um timeout para a requisição
          signal: AbortSignal.timeout(5000),
        },
      )

      if (!response.ok) {
        console.warn("Falha ao obter endereço via Nominatim, usando coordenadas como fallback")
        return `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`
      }

      const data = await response.json()
      return data.display_name || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`
    } catch (error) {
      console.warn("Erro ao buscar endereço:", error)
      // Retornar as coordenadas como fallback
      return `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`
    }
  }

  const getCurrentPosition = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocalização não é suportada pelo seu navegador",
      }))
      return
    }

    // Adicionando um timeout manual para garantir que a função não fique presa
    const timeoutId = setTimeout(() => {
      if (state.loading) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Tempo esgotado ao obter localização. Verifique suas permissões e tente novamente.",
        }))
      }
    }, mergedOptions.timeout || 30000)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeoutId)
        const { latitude, longitude, accuracy } = position.coords
        const timestamp = position.timestamp

        // Call onSuccess callback if provided
        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(position)
        }

        try {
          // Get address from coordinates
          const address = await getAddress(latitude, longitude)

          setState({
            latitude,
            longitude,
            accuracy,
            timestamp,
            address,
            loading: false,
            error: null,
          })
        } catch (addressError) {
          console.error("Erro ao obter endereço:", addressError)
          // Ainda retornamos a posição mesmo se falhar ao obter o endereço
          setState({
            latitude,
            longitude,
            accuracy,
            timestamp,
            address: null,
            loading: false,
            error: null,
          })
        }
      },
      (error) => {
        clearTimeout(timeoutId)
        // Call onError callback if provided
        if (mergedOptions.onError) {
          mergedOptions.onError(error)
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: getGeolocationErrorMessage(error),
        }))
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      },
    )
  }

  // Helper function to get user-friendly error messages
  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Permissão para acessar a localização foi negada. Por favor, permita o acesso à localização nas configurações do seu navegador."
      case error.POSITION_UNAVAILABLE:
        return "Informações de localização não estão disponíveis no momento. Verifique se o GPS está ativado."
      case error.TIMEOUT:
        return "A solicitação para obter a localização expirou. Por favor, tente novamente."
      default:
        return `Ocorreu um erro desconhecido ao obter a localização. (Código: ${error.code})`
    }
  }

  return {
    ...state,
    getCurrentPosition,
  }
}
