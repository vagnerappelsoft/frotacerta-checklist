"use client"

import { useState, useEffect } from "react"

export function useOnlineStatus() {
  // Inicializar com o estado atual de conexão
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)

  // Inicializar com um valor que indica se já detectamos uma mudança de estado
  const [hasConnectionChanged, setHasConnectionChanged] = useState(false)

  // Adicionar um estado para rastrear se a verificação de conectividade foi concluída
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)

  useEffect(() => {
    // Função para verificar a conectividade real fazendo uma solicitação de rede
    const checkRealConnectivity = async () => {
      if (typeof navigator === "undefined") return

      // Se o navegador já diz que estamos offline, não precisamos verificar mais
      if (!navigator.onLine) {
        setIsOnline(false)
        return
      }

      setIsCheckingConnection(true)

      try {
        // Tentar buscar um recurso pequeno com um timestamp para evitar cache
        const timestamp = new Date().getTime()
        const response = await fetch(`/manifest.json?_=${timestamp}`, {
          method: "HEAD",
          cache: "no-store",
          // Definir um timeout curto para não bloquear a interface
          signal: AbortSignal.timeout(3000),
        })

        // Se a resposta for bem-sucedida, estamos realmente online
        setIsOnline(response.ok)
      } catch (error) {
        // Se houver um erro na solicitação, provavelmente estamos offline
        console.log("Erro ao verificar conectividade real:", error)
        setIsOnline(false)
      } finally {
        setIsCheckingConnection(false)
      }
    }

    // Função para atualizar o estado online
    const handleOnline = () => {
      console.log("Evento online detectado")
      // Quando detectamos que estamos online, verificamos a conectividade real
      checkRealConnectivity()
      setHasConnectionChanged(true)
    }

    // Função para atualizar o estado offline
    const handleOffline = () => {
      console.log("Evento offline detectado")
      setIsOnline(false)
      setHasConnectionChanged(true)
      setIsCheckingConnection(false)
    }

    // Registrar os event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Verificar o estado inicial de conexão
    checkRealConnectivity()

    // Configurar uma verificação periódica de conectividade
    const intervalId = setInterval(checkRealConnectivity, 30000) // A cada 30 segundos

    // Limpar os event listeners quando o componente for desmontado
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(intervalId)
    }
  }, [])

  // Adicionar um efeito para verificar o client_id quando a conexão for restaurada
  useEffect(() => {
    // Função para verificar o client_id quando a conexão for restaurada
    const checkClientIdOnReconnect = () => {
      if (isOnline && localStorage.getItem("check_client_id_on_reconnect") === "true") {
        console.log("Conexão restaurada. Verificando client_id...")
        localStorage.removeItem("check_client_id_on_reconnect")

        // Verificar se temos um client_id válido
        const clientId = localStorage.getItem("client_id")
        if (!clientId || clientId.trim() === "" || clientId === "offline-client") {
          console.warn("Client ID inválido após reconexão. Redirecionando para login.")
          // Disparar evento de erro de API para redirecionar para login
          // dispatchApiError("ID do Cliente inválido após reconexão. Por favor, faça login novamente.", 401, true)
        }
      }
    }

    // Verificar quando a conexão mudar de offline para online
    if (hasConnectionChanged && isOnline) {
      checkClientIdOnReconnect()
    }
  }, [isOnline, hasConnectionChanged])

  return {
    isOnline,
    hasConnectionChanged,
    isCheckingConnection,
  }
}
