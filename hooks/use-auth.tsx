"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { apiService } from "@/lib/api-service"
import { syncService } from "@/lib/sync-service"
import { useRouter } from "next/navigation"
import { offlineStorage } from "@/lib/offline-storage"
import { STORAGE_KEYS } from "@/lib/constants"
import { ClientDataManager } from "@/lib/client-data-manager"

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
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

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
          const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)

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

  const handleClientTransition = async (newClientId: string): Promise<void> => {
    try {
      // Check if client ID has changed
      const previousClientId = localStorage.getItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID)

      if (previousClientId && previousClientId !== newClientId) {
        console.log(`Client transition detected: ${previousClientId} -> ${newClientId}`)

        // Clear all data from previous client
        await ClientDataManager.clearAllData()

        // Update stored client ID
        localStorage.setItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID, newClientId)
        localStorage.setItem(STORAGE_KEYS.CURRENT_CLIENT_ID, newClientId)

        // Reset any auth state
        setUser(null)
        setIsLoading(true)
      }
    } catch (error) {
      console.error("Error during client transition:", error)
    }
  }

  // Atualizar a interface
  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true)

    try {
      // Verificar se temos um clientId armazenado
      const clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID)

      // Se não temos um clientId válido, usar o fornecido pelo usuário na tela de login
      // Este valor deve ter sido definido no componente LoginScreen
      if (!clientId || clientId.trim() === "") {
        throw new Error("ID do Cliente não fornecido. Por favor, faça login novamente.")
      }

      console.log(`Usando clientId: ${clientId}`)
      apiService.setClientId(clientId)

      // Desativar explicitamente o modo mockado
      apiService.setMockMode(false)

      // Chamar o serviço de API para fazer login
      const result = await apiService.login(username, password)

      // Configurar renovação do token
      if (result.token) {
        setupTokenRefresh(result.token)
      }

      // Extrair o ID do usuário da resposta
      const userId = result.user?.id || result.user?.userId || result.id || result.userId
      console.log("ID do usuário extraído da resposta de login:", userId)

      // Armazenar dados do usuário
      const userData: User = {
        id: userId || "unknown",
        userId: userId || "unknown", // Adicionar explicitamente o userId
        name: result.user?.name || result.name || username,
        role: result.user?.role || result.role || "user",
        ...result.user,
      }

      console.log("Dados do usuário a serem armazenados:", userData)
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
      setUser(userData)

      // Verificar se é o primeiro login (não tem timestamp de última sincronização)
      const isFirstLogin = !localStorage.getItem(STORAGE_KEYS.LAST_SYNC)

      // Iniciar sincronização inicial após login
      setSuccess(
        isFirstLogin
          ? "Login realizado com sucesso! Carregando dados iniciais..."
          : "Login realizado com sucesso! Sincronizando dados...",
      )

      // Definir um flag para evitar sincronizações duplicadas
      const syncInProgress = localStorage.getItem(STORAGE_KEYS.SYNC_IN_PROGRESS)

      if (!syncInProgress) {
        try {
          // Marcar que uma sincronização está em andamento
          localStorage.setItem(STORAGE_KEYS.SYNC_IN_PROGRESS, "true")

          console.log(`Iniciando sincronização ${isFirstLogin ? "completa" : "incremental"} após login...`)

          // Buscar todos os dados da API
          const allData = await apiService.getAllAppData(userId)

          // Armazenar os dados localmente
          if (allData) {
            // Armazenar veículos
            if (allData.vehicles && Array.isArray(allData.vehicles)) {
              console.log(`Armazenando ${allData.vehicles.length} veículos localmente...`)
              for (const vehicle of allData.vehicles) {
                // Garantir que o veículo tenha um ID como string
                const formattedVehicle = {
                  ...vehicle,
                  id: vehicle.id?.toString() || `vehicle_${Math.random().toString(36).substring(2, 9)}`,
                  fromApi: true, // Marcar como vindo da API
                }
                await offlineStorage.saveItem("vehicles", formattedVehicle)
              }
            }

            // Armazenar modelos de checklist
            if (allData.models && Array.isArray(allData.models)) {
              console.log(`Armazenando ${allData.models.length} modelos de checklist localmente...`)
              for (const model of allData.models) {
                // Garantir que o modelo tenha um ID como string e campos necessários
                const formattedModel = {
                  ...model,
                  id: model.id?.toString() || `model_${Math.random().toString(36).substring(2, 9)}`,
                  title: model.name || "Modelo sem nome",
                  description: model.description || "Sem descrição",
                  fromApi: true, // Marcar como vindo da API
                }
                await offlineStorage.saveItem("templates", formattedModel)
              }
            }

            // Armazenar checklists
            if (allData.checklists && Array.isArray(allData.checklists)) {
              console.log(`Armazenando ${allData.checklists.length} checklists localmente...`)
              for (const checklist of allData.checklists) {
                // Adaptar o formato do checklist para o formato esperado pelo aplicativo
                const formattedChecklist = {
                  id: checklist.id?.toString() || `checklist_${Math.random().toString(36).substring(2, 9)}`,
                  title: checklist.name || "Checklist sem título",
                  template: {
                    id: checklist.model?.id?.toString() || "",
                    title: checklist.model?.name || checklist.name || "Modelo sem nome",
                    items: syncService.extractChecklistItems(checklist),
                  },
                  vehicle: syncService.extractVehicleInfo(checklist),
                  responses: syncService.extractResponses(checklist),
                  submittedAt: checklist.startDate || new Date().toISOString(),
                  synced: true, // Marcar como sincronizado, pois veio da API
                  userId: checklist.user?.id || userId || "unknown",
                  fromApi: true, // Marcar como vindo da API
                }
                await offlineStorage.saveItem("checklists", formattedChecklist)
              }
            }

            // Verificar integridade dos dados após sincronização
            if (navigator.onLine) {
              await syncService.verifyDataIntegrity(allData)
            }
          }

          // Atualizar o timestamp da última sincronização
          const now = new Date()
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString())
          localStorage.setItem(STORAGE_KEYS.SYNC_TYPE, "full")

          console.log("Sincronização inicial concluída com sucesso")
          setSuccess("Sincronização concluída! Redirecionando...")

          // Remover o flag de sincronização em andamento
          localStorage.removeItem(STORAGE_KEYS.SYNC_IN_PROGRESS)
        } catch (syncError) {
          console.error("Erro na sincronização inicial:", syncError)

          // Remover o flag de sincronização em andamento mesmo em caso de erro
          localStorage.removeItem(STORAGE_KEYS.SYNC_IN_PROGRESS)

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
      } else {
        console.log("Sincronização já em andamento, pulando sincronização duplicada")
        setSuccess("Login realizado com sucesso! Sincronização já em andamento...")
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

      // Verificar se o dispositivo está online
      const isOnline = typeof navigator !== "undefined" && navigator.onLine

      // Se estiver offline, simular renovação bem-sucedida
      if (!isOnline) {
        console.log("Dispositivo offline. Simulando renovação de token bem-sucedida.")

        // Estender a validade do token atual
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
        if (token) {
          // Configurar renovação do token atual
          setupTokenRefresh(token)
          return true
        }
        return false
      }

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

      // Se o erro for de autenticação e estiver online, fazer logout
      if (error instanceof Error && error.message.includes("401") && navigator.onLine) {
        handleLogout()
        router.push("/login")
        return false
      }

      // Se estiver offline, simular renovação bem-sucedida
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.log("Erro ao renovar token, mas dispositivo está offline. Continuando operação.")
        return true
      }

      return false
    }
  }

  // Função de logout
  const handleLogout = () => {
    // Limpar token e dados do usuário
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
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
