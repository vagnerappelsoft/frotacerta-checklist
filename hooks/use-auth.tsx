"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { apiService } from "@/lib/api-service"
import { syncService } from "@/lib/sync-service"
import { useRouter } from "next/navigation"

// Definir o tipo para o usuário
interface User {
  id: string
  name: string
  role: string
  [key: string]: any // Para campos adicionais que possam vir da API
}

// Definir o tipo para o contexto de autenticação
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<boolean>
}

// Criar o contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provedor de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tokenExpiryTime, setTokenExpiryTime] = useState<number | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const [success, setSuccess] = useState<string | null>(null)

  // Função para calcular o tempo de expiração do token
  const calculateTokenExpiry = (token: string): number => {
    try {
      // Tentar decodificar o token JWT para obter o tempo de expiração
      // Formato do token: header.payload.signature
      const payload = token.split(".")[1]
      if (!payload) return Date.now() + 3600000 // Padrão: 1 hora

      const decodedPayload = JSON.parse(atob(payload))

      // Se o token tiver um campo exp (timestamp de expiração), usá-lo
      if (decodedPayload.exp) {
        return decodedPayload.exp * 1000 // Converter de segundos para milissegundos
      }

      // Caso contrário, definir um tempo padrão (1 hora)
      return Date.now() + 3600000
    } catch (error) {
      console.error("Erro ao decodificar token:", error)
      // Em caso de erro, definir um tempo padrão (1 hora)
      return Date.now() + 3600000
    }
  }

  // Configurar o temporizador para renovação do token
  const setupTokenRefresh = (token: string) => {
    // Limpar qualquer temporizador existente
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    // Calcular o tempo de expiração do token
    const expiryTime = calculateTokenExpiry(token)
    setTokenExpiryTime(expiryTime)

    // Calcular o tempo para renovação (15 minutos antes da expiração)
    const timeUntilRefresh = Math.max(0, expiryTime - Date.now() - 15 * 60 * 1000)

    console.log(
      `Token expira em ${Math.round((expiryTime - Date.now()) / 60000)} minutos. Renovação agendada em ${Math.round(timeUntilRefresh / 60000)} minutos.`,
    )

    // Configurar o temporizador para renovação
    refreshTimerRef.current = setTimeout(() => {
      refreshToken()
    }, timeUntilRefresh)
  }

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token")

        if (token) {
          // Verificar se o token está próximo de expirar
          const expiryTime = calculateTokenExpiry(token)
          setTokenExpiryTime(expiryTime)

          // Se o token estiver a menos de 15 minutos de expirar, renová-lo imediatamente
          if (expiryTime - Date.now() < 15 * 60 * 1000) {
            const refreshed = await refreshToken()
            if (!refreshed) {
              // Se não conseguir renovar, fazer logout
              handleLogout()
              return
            }
          } else {
            // Configurar renovação futura
            setupTokenRefresh(token)
          }

          // Recuperar dados do usuário do localStorage
          const userData = localStorage.getItem("user_data")

          if (userData) {
            setUser(JSON.parse(userData))
          } else {
            // Se não tiver dados do usuário, fazer logout
            handleLogout()
          }
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error)
        handleLogout()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Limpar o temporizador ao desmontar o componente
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [])

  // Função de login
  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true)

    try {
      // Verificar se temos um clientId armazenado
      const clientId = localStorage.getItem("client_id")
      if (clientId) {
        console.log(`Usando clientId armazenado: ${clientId}`)
        apiService.setClientId(clientId)
      }

      // Chamar o serviço de API para fazer login
      const result = await apiService.login(username, password)

      // Configurar renovação do token
      if (result.token) {
        setupTokenRefresh(result.token)
      }

      // Armazenar dados do usuário
      const userData: User = {
        id: result.user.id || "unknown",
        name: result.user.name || username,
        role: result.user.role || "user",
        ...result.user,
      }

      localStorage.setItem("user_data", JSON.stringify(userData))
      setUser(userData)

      // Desabilitar o modo mock após login bem-sucedido
      apiService.setMockMode(false)

      // Verificar se é o primeiro login (não tem timestamp de última sincronização)
      const isFirstLogin = !localStorage.getItem("last_sync_time")

      // Iniciar sincronização inicial após login
      setSuccess(
        isFirstLogin
          ? "Login realizado com sucesso! Carregando dados iniciais..."
          : "Login realizado com sucesso! Sincronizando dados...",
      )

      try {
        console.log(`Iniciando sincronização ${isFirstLogin ? "completa" : "incremental"} após login...`)

        // Forçar uma sincronização completa
        const syncResult = await syncService.forceFullSync()
        console.log("Sincronização inicial concluída com sucesso:", syncResult)

        // Atualizar mensagem de sucesso
        setSuccess("Sincronização concluída! Redirecionando...")
      } catch (syncError) {
        console.error("Erro na sincronização inicial:", syncError)

        // Verificar se é um erro de API ou conexão
        if (
          syncError instanceof Error &&
          (syncError.message.includes("404") ||
            syncError.message.includes("Failed to fetch") ||
            syncError.message.includes("Network"))
        ) {
          console.log("Erro de API ou conexão, continuando com dados locais...")
          setSuccess("Login realizado com sucesso! Usando dados locais...")
        } else {
          // Outro tipo de erro
          setSuccess("Login realizado com sucesso! Redirecionando...")
        }
      }

      // Redirecionar após um breve atraso
      setTimeout(() => {
        router.push("/")
      }, 1500)

      return result
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Função para renovar o token
  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log("Tentando renovar token...")

      // Chamar o serviço de API para renovar o token
      const result = await apiService.refreshToken()

      if (result.token) {
        // Configurar renovação do novo token
        setupTokenRefresh(result.token)

        console.log("Token renovado com sucesso")
        return true
      }

      console.error("Falha ao renovar token: token não retornado")
      return false
    } catch (error) {
      console.error("Erro ao renovar token:", error)

      // Se o erro for de autenticação, fazer logout
      if (error instanceof Error && error.message.includes("401")) {
        handleLogout()
        router.push("/login")
      }

      return false
    }
  }

  // Função de logout
  const handleLogout = () => {
    // Limpar token e dados do usuário
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    setUser(null)

    // Limpar o temporizador de renovação
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  // Valor do contexto
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    refreshToken,
    success,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }

  return context
}
