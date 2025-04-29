"use client"

import { useState, useEffect, useCallback } from "react"
import { ChecklistForm } from "@/components/checklist-form"
import { ChecklistComplete } from "@/components/checklist-complete"
import { BottomNavigation } from "@/components/bottom-navigation"
import { MyChecklistsScreen } from "@/components/my-checklists-screen"
import { SettingsScreen } from "@/components/settings-screen"
import { ChecklistTemplates } from "@/components/checklist-templates"
import { VehicleSelection } from "@/components/vehicle-selection"
import { UpdatesScreen } from "@/components/updates-screen"
import { OfflineBanner } from "@/components/offline-banner"
import { ChecklistDetails } from "@/components/checklist-details"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { syncService } from "@/lib/sync-service"
import { offlineStorage } from "@/lib/offline-storage"
import { ErrorFallback } from "@/components/error-fallback"
import { ServiceWorkerUpdater } from "@/components/service-worker-updater"
import { OfflineFallback } from "@/components/offline-fallback"
import { useAuth } from "@/hooks/use-auth"
import { apiService } from "@/lib/api-service"
import { ApiResponseViewer } from "@/components/api-response-viewer"
import { LoadingScreen } from "@/components/loading-screen"
// Importe o serviço de histórico de quilometragem no topo do arquivo
import { kilometerHistory } from "@/lib/kilometer-history"
import { useRouter } from "next/navigation"
import { STORAGE_KEYS } from "@/lib/constants"

export default function DriverChecklistPage() {
  const [activeTab, setActiveTab] = useState<string>("apply-checklist")
  const [step, setStep] = useState<"template" | "vehicle" | "form" | "complete">("template")
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [completedChecklist, setCompletedChecklist] = useState<any>(null)
  const [settingsScreen, setSettingsScreen] = useState<string>("main")
  const [myChecklistsScreen, setMyChecklistsScreen] = useState<"list" | "details">("list")
  const [selectedMyChecklist, setSelectedMyChecklist] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [globalError, setGlobalError] = useState<Error | null>(null)
  const [offlineMode, setOfflineMode] = useState(false)
  const [offlineTemplates, setOfflineTemplates] = useState<any[]>([])
  const [offlineVehicles, setOfflineVehicles] = useState<any[]>([])
  const [offlineChecklists, setOfflineChecklists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isOnline, hasConnectionChanged, isCheckingConnection } = useOnlineStatus()
  const [pendingSyncs, setPendingSyncs] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Função para cachear a página atual
  const cacheCurrentPage = useCallback(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      console.log("Solicitando ao Service Worker para cachear a página atual")
      navigator.serviceWorker.controller.postMessage({
        type: "CACHE_CURRENT_PAGE",
      })
    }
  }, [])

  // Inicializar o armazenamento offline e o serviço de sincronização
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true)

        // Solicitar ao Service Worker para cachear a página atual
        cacheCurrentPage()

        // Desativar explicitamente o modo mockado
        apiService.setMockMode(false)

        // Verificar se temos um client_id válido
        const clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID)
        if (!clientId || clientId.trim() === "") {
          console.warn("Client ID não encontrado. Redirecionando para login...")
          router.push("/login")
          return
        }

        // Configurar o client_id no serviço de API
        apiService.setClientId(clientId)

        // Inicializar o armazenamento offline
        await offlineStorage.init()

        // Verificar sincronizações pendentes
        const pendingSyncs = await offlineStorage.getPendingSyncs()
        setPendingSyncs(pendingSyncs.length)

        // Configurar o listener de eventos de sincronização
        syncService.addEventListener(handleSyncEvent)

        // Carregar dados offline independentemente do estado de conexão
        try {
          // Tentar carregar dados do armazenamento local
          const storedTemplates = await offlineStorage.getAllItems("templates")
          const storedVehicles = await offlineStorage.getAllItems("vehicles")
          const storedChecklists = await offlineStorage.getAllItems("checklists")

          // Atualizar o estado com os dados armazenados localmente
          setOfflineTemplates(storedTemplates)
          setOfflineVehicles(storedVehicles)
          setOfflineChecklists(storedChecklists)

          console.log("Dados carregados do armazenamento local:", {
            templates: storedTemplates.length,
            vehicles: storedVehicles.length,
            checklists: storedChecklists.length,
          })

          // Verificar se é o primeiro carregamento
          const lastSyncTime = syncService.getLastSyncTime()
          const lastSyncType = localStorage.getItem(STORAGE_KEYS.SYNC_TYPE)
          const isFirstLoad = !lastSyncTime || !lastSyncType

          // Se não estiver online, entrar em modo offline imediatamente
          if (!isOnline) {
            setOfflineMode(true)
            console.log("Modo offline ativado durante inicialização")
          }
          // Se estiver online e for o primeiro carregamento ou não tiver dados, forçar sincronização completa
          else if (isFirstLoad || storedTemplates.length === 0 || storedVehicles.length === 0) {
            console.log("Primeiro carregamento ou dados locais insuficientes, forçando sincronização completa...")

            // Desativar explicitamente o modo mockado
            apiService.setMockMode(false)

            // Verificar se o usuário está logado
            const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
            if (userData) {
              // Forçar sincronização completa
              const syncResult = await syncService.forceFullSync()

              console.log("Resultado da sincronização forçada:", syncResult)

              if (syncResult) {
                // Recarregar dados após sincronização bem-sucedida
                const syncedTemplates = await offlineStorage.getAllItems("templates")
                const syncedVehicles = await offlineStorage.getAllItems("vehicles")
                const syncedChecklists = await offlineStorage.getAllItems("checklists")

                setOfflineTemplates(syncedTemplates)
                setOfflineVehicles(syncedVehicles)
                setOfflineChecklists(syncedChecklists)

                console.log("Dados atualizados após sincronização:", {
                  templates: syncedTemplates.length,
                  vehicles: syncedVehicles.length,
                  checklists: syncedChecklists.length,
                })
              }
            }
          }
          // Se estiver online com dados suficientes, verificar se há atualizações incrementais
          else if (isOnline) {
            console.log("Verificando atualizações incrementais...")

            // Verificar se há sincronizações pendentes
            if (pendingSyncs.length > 0) {
              console.log("Sincronizando checklists pendentes...", pendingSyncs.length)
              await syncService.performIncrementalSync()
            } else {
              // Verificar se é necessário fazer sincronização incremental
              await syncService.checkAndSync()
            }

            // Recarregar dados após sincronização
            const updatedTemplates = await offlineStorage.getAllItems("templates")
            const updatedVehicles = await offlineStorage.getAllItems("vehicles")
            const updatedChecklists = await offlineStorage.getAllItems("checklists")

            // Atualizar apenas se houver novos dados
            if (updatedTemplates.length > storedTemplates.length) {
              setOfflineTemplates(updatedTemplates)
            }
            if (updatedVehicles.length > storedVehicles.length) {
              setOfflineVehicles(updatedVehicles)
            }
            if (updatedChecklists.length > storedChecklists.length) {
              setOfflineChecklists(updatedChecklists)
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados offline:", error)
          setOfflineMode(!isOnline)

          // Tentar sincronização forçada mesmo após erro, se estiver online
          if (isOnline) {
            try {
              apiService.setMockMode(false)
              await syncService.forceFullSync()

              // Tentar recarregar dados após sincronização
              const syncedTemplates = await offlineStorage.getAllItems("templates")
              const syncedVehicles = await offlineStorage.getAllItems("vehicles")

              if (syncedTemplates.length > 0) setOfflineTemplates(syncedTemplates)
              if (syncedVehicles.length > 0) setOfflineVehicles(syncedVehicles)

              console.log("Dados recarregados após recuperação de erro")
            } catch (syncError) {
              console.error("Erro na sincronização de recuperação:", syncError)
              setGlobalError(syncError instanceof Error ? syncError : new Error("Erro na sincronização de recuperação"))
            }
          }
        }

        setIsInitialized(true)
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao inicializar o aplicativo:", error)
        setGlobalError(error instanceof Error ? error : new Error("Erro ao inicializar o aplicativo"))
        setIsLoading(false)
      }
    }

    initializeApp()

    // Limpar recursos quando o componente for desmontado
    return () => {
      syncService.removeEventListener(handleSyncEvent)
    }
  }, [isOnline, cacheCurrentPage, router])

  // Adicionar um efeito para recarregar dados quando o usuário mudar
  useEffect(() => {
    // Se temos um usuário logado e o app já está inicializado
    if (user && isInitialized) {
      const loadUserData = async () => {
        console.log("Usuário detectado, verificando dados...")

        try {
          // Desativar explicitamente o modo mockado
          apiService.setMockMode(false)

          // Verificar se já temos dados carregados
          const storedTemplates = await offlineStorage.getAllItems("templates")
          const storedVehicles = await offlineStorage.getAllItems("vehicles")

          // Se não temos dados ou temos poucos, forçar uma sincronização
          if (storedTemplates.length === 0 || storedVehicles.length === 0) {
            console.log("Dados insuficientes, forçando sincronização...")
            await syncService.forceFullSync()

            // Recarregar dados após a sincronização
            const updatedTemplates = await offlineStorage.getAllItems("templates")
            const updatedVehicles = await offlineStorage.getAllItems("vehicles")
            const updatedChecklists = await offlineStorage.getAllItems("checklists")

            setOfflineTemplates(updatedTemplates)
            setOfflineVehicles(updatedVehicles)
            setOfflineChecklists(updatedChecklists)

            console.log("Dados recarregados após sincronização forçada")
          }
          // Se estiver online, verificar integridade dos dados
          else if (isOnline) {
            console.log("Verificando integridade dos dados...")

            // Buscar dados atualizados da API
            const apiData = await apiService.getAllAppData()

            // Verificar integridade dos dados
            await syncService.verifyDataIntegrity(apiData)

            // Recarregar dados após verificação de integridade
            const updatedTemplates = await offlineStorage.getAllItems("templates")
            const updatedVehicles = await offlineStorage.getAllItems("vehicles")
            const updatedChecklists = await offlineStorage.getAllItems("checklists")

            setOfflineTemplates(updatedTemplates)
            setOfflineVehicles(updatedVehicles)
            setOfflineChecklists(updatedChecklists)

            console.log("Dados atualizados após verificação de integridade")
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error)
          setGlobalError(error instanceof Error ? error : new Error("Erro ao carregar dados do usuário"))
        }
      }

      loadUserData()
    }
  }, [user, isInitialized, isOnline])

  // Verificar se os dados foram carregados após o login
  useEffect(() => {
    if (user && isInitialized && !isLoading) {
      const checkDataAfterLogin = async () => {
        try {
          // Desativar explicitamente o modo mockado
          apiService.setMockMode(false)

          // Verificar se já temos dados carregados
          const storedTemplates = await offlineStorage.getAllItems("templates")
          const storedVehicles = await offlineStorage.getAllItems("vehicles")

          console.log("Verificando dados após login:", {
            templatesCount: storedTemplates.length,
            vehiclesCount: storedVehicles.length,
          })

          // Se não temos dados ou temos poucos, forçar uma sincronização completa
          if (storedTemplates.length === 0 || storedVehicles.length === 0) {
            console.log("Dados incompletos após login, forçando sincronização completa...")

            // Remover o timestamp da última sincronização para forçar uma sincronização completa
            localStorage.removeItem("last_sync_time")

            await syncService.forceFullSync()

            // Recarregar dados após a sincronização
            const updatedTemplates = await offlineStorage.getAllItems("templates")
            const updatedVehicles = await offlineStorage.getAllItems("vehicles")

            setOfflineTemplates(updatedTemplates)
            setOfflineVehicles(updatedVehicles)

            console.log("Sincronização completa concluída, dados atualizados:", {
              templatesCount: updatedTemplates.length,
              vehiclesCount: updatedVehicles.length,
            })
          }
        } catch (error) {
          console.error("Erro ao verificar dados após login:", error)
          setGlobalError(error instanceof Error ? error : new Error("Erro ao verificar dados após login"))
        }
      }

      checkDataAfterLogin()
    }
  }, [user, isInitialized, isLoading])

  // Atualizar o modo offline quando o status de conexão mudar
  useEffect(() => {
    if (isInitialized) {
      if (!isOnline) {
        // Se estiver offline, ativar o modo offline imediatamente
        setOfflineMode(true)
        console.log("Modo offline ativado após mudança de conexão")
      } else if (pendingSyncs === 0) {
        // Se estiver online e não houver sincronizações pendentes, desativar o modo offline
        setOfflineMode(false)
        console.log("Modo offline desativado após mudança de conexão")

        // Verificar integridade dos dados quando voltar a ficar online
        const checkDataIntegrity = async () => {
          try {
            console.log("Verificando integridade dos dados após reconexão...")

            // Buscar dados atualizados da API
            const apiData = await apiService.getAllAppData()

            // Verificar integridade dos dados
            await syncService.verifyDataIntegrity(apiData)

            // Recarregar dados após verificação de integridade
            const updatedTemplates = await offlineStorage.getAllItems("templates")
            const updatedVehicles = await offlineStorage.getAllItems("vehicles")
            const updatedChecklists = await offlineStorage.getAllItems("checklists")

            setOfflineTemplates(updatedTemplates)
            setOfflineVehicles(updatedVehicles)
            setOfflineChecklists(updatedChecklists)

            console.log("Dados atualizados após verificação de integridade")
          } catch (error) {
            console.error("Erro ao verificar integridade dos dados:", error)
          }
        }

        checkDataIntegrity()
      }
      // Se houver sincronizações pendentes, mantemos o modo offline até que sejam concluídas
    }
  }, [isOnline, isInitialized, pendingSyncs])

  // Manipular eventos de sincronização
  const handleSyncEvent = (event: any) => {
    console.log("Evento de sincronização:", event)

    if (event.type === "complete") {
      // Atualizar o contador de sincronizações pendentes
      offlineStorage.getPendingSyncs().then((syncs) => {
        setPendingSyncs(syncs.length)

        // Se não houver mais sincronizações pendentes e estiver online, desativar o modo offline
        if (syncs.length === 0 && isOnline) {
          setOfflineMode(false)
          console.log("Modo offline desativado após sincronização")
        }
      })

      // Atualizar a lista de checklists
      setRefreshTrigger((prev) => prev + 1)
    } else if (event.type === "error") {
      console.error("Erro durante a sincronização:", event.message)
      // Não definir um erro global aqui, apenas logar o erro
    }
  }

  // Forçar uma sincronização
  const handleForceSyncNow = () => {
    console.log("handleForceSyncNow chamado na página principal!")
    if (isOnline) {
      // Desativar o modo mockado para garantir que estamos usando a API real
      apiService.setMockMode(false)

      // Chamar forceSyncNow diretamente
      syncService
        .forceSyncNow()
        .then((result) => {
          console.log("Resultado da sincronização forçada:", result)
          // Atualizar a lista de checklists após a sincronização
          if (result) {
            setRefreshTrigger((prev) => prev + 1)

            // Atualizar o contador de sincronizações pendentes
            offlineStorage.getPendingSyncs().then((syncs) => {
              setPendingSyncs(syncs.length)
            })

            // Recarregar dados após a sincronização
            offlineStorage.getAllItems("templates").then((templates) => {
              if (templates.length > 0) {
                setOfflineTemplates(templates)
                console.log("Templates atualizados após sincronização:", templates.length)
              }
            })

            offlineStorage.getAllItems("vehicles").then((vehicles) => {
              if (vehicles.length > 0) {
                setOfflineVehicles(vehicles)
                console.log("Veículos atualizados após sincronização:", vehicles.length)
              }
            })

            offlineStorage.getAllItems("checklists").then((checklists) => {
              if (checklists.length > 0) {
                setOfflineChecklists(checklists)
                console.log("Checklists atualizados após sincronização:", checklists.length)
              }
            })
          }
        })
        .catch((error) => {
          console.error("Erro ao forçar sincronização:", error)
          setGlobalError(error instanceof Error ? error : new Error("Erro ao forçar sincronização"))
        })
    } else {
      console.log("Não é possível sincronizar - dispositivo offline")
    }
  }

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
    setStep("vehicle")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  const handleSelectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setStep("form")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  // Atualizar o método handleSubmitChecklist para lidar com flowSize e flowStep
  const handleSubmitChecklist = async (data: any) => {
    try {
      // Limpar qualquer erro anterior
      setGlobalError(null)

      console.log("Iniciando salvamento do checklist...")

      // Verificar se o armazenamento está inicializado
      if (!isInitialized) {
        console.error("Armazenamento não inicializado. Tentando inicializar novamente...")
        await offlineStorage.init()
      }

      // Garantir que as datas sejam strings ISO
      const submittedAt = new Date().toISOString()

      // Função para limpar objetos não serializáveis
      const sanitizeForStorage = (obj: any): any => {
        if (obj === null || obj === undefined) return obj

        // Se for um array, sanitize cada item
        if (Array.isArray(obj)) {
          return obj.map((item) => sanitizeForStorage(item))
        }

        // Se for um objeto, sanitize cada propriedade
        if (typeof obj === "object" && !(obj instanceof Blob) && !(obj instanceof File)) {
          const sanitized: any = {}
          for (const [key, value] of Object.entries(obj)) {
            // Pular propriedades que começam com _ ou $ (geralmente usadas por React)
            if (!key.startsWith("_") && !key.startsWith("$")) {
              sanitized[key] = sanitizeForStorage(value)
            }
          }
          return sanitized
        }

        // Se for um tipo primitivo ou Blob/File, retorne como está
        return obj
      }

      // Sanitizar os dados do template e veículo
      const sanitizedTemplate = sanitizeForStorage(selectedTemplate)
      const sanitizedVehicle = sanitizeForStorage(selectedVehicle)

      // Sanitizar os dados de resposta
      const sanitizedData = sanitizeForStorage(data)

      // Verificar se estamos continuando um checklist existente
      const continuingChecklistData = localStorage.getItem("continuing_checklist")
      // Get checklistId from localStorage
      const checklistId =
        localStorage.getItem("checklistId") || `checklist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      let currentFlowStep = 1

      if (continuingChecklistData) {
        try {
          const parsedData = JSON.parse(continuingChecklistData)
          //checklistId = parsedData.id
          currentFlowStep = parsedData.flowStep || 1
          console.log(`Continuando checklist existente: ${checklistId}, etapa ${currentFlowStep}`)

          // Limpar os dados após uso
          localStorage.removeItem("continuing_checklist")
        } catch (error) {
          console.error("Erro ao processar dados de checklist em continuação:", error)
        }
      }

      // Determinar flowSize e flowStep
      const flowSize = sanitizedTemplate.flowSize || 1
      const isLastStep = currentFlowStep >= flowSize
      const status = {
        id: isLastStep ? 1 : 2, // Se for a última etapa, status é 1 (Concluído), senão é 2 (Em andamento)
        name: isLastStep ? "Concluído" : "Em Andamento",
      }

      // Criar o objeto de checklist completo com dados sanitizados
      const newChecklist = {
        // Pass checklistId to the newChecklist object
        id: checklistId, // Usar o ID do checklist existente ou o novo ID gerado
        template: sanitizedTemplate,
        vehicle: sanitizedVehicle,
        responses: {
          ...sanitizedData,
          photos: data.photos,
          audios: data.audios,
        },
        submittedAt: submittedAt,
        createdAt: new Date().toISOString(), // Adicionar campo createdAt explicitamente
        synced: false, // Sempre iniciar como não sincronizado para garantir que seja processado
        userId: user?.id || "unknown", // Adicionar ID do usuário
        fromApi: false, // Marcar explicitamente como não vindo da API
        flowSize: flowSize,
        flowStep: currentFlowStep, // Usar a etapa atual (1 ou 2)
        status: status, // Usar o status determinado acima
      }

      console.log("Objeto de checklist sanitizado criado com ID:", checklistId)

      // Salvar localmente
      console.log("Salvando no armazenamento local...")
      const saveResult = await offlineStorage.saveItem("checklists", newChecklist)
      console.log("Resultado do salvamento:", saveResult)

      if (!saveResult) {
        throw new Error("Falha ao salvar no armazenamento local")
      }

      // Atualizar a interface
      setCompletedChecklist(newChecklist)
      setStep("complete")

      // Atualizar a lista de checklists offline
      setOfflineChecklists([...offlineChecklists, newChecklist])

      // Verificar sincronizações pendentes e atualizar contador
      const pendingSyncs = await offlineStorage.getPendingSyncs()
      setPendingSyncs(pendingSyncs.length)

      // Se estiver online, tentar sincronizar imediatamente, mas com um atraso para evitar problemas
      if (isOnline) {
        console.log("Usuário está online, iniciando sincronização imediata...")
        setTimeout(() => {
          // Desativar o modo mockado
          apiService.setMockMode(false)

          // Forçar sincronização imediata
          syncService
            .forceSyncNow()
            .then((result) => {
              console.log("Resultado da sincronização imediata:", result)

              // Se a sincronização foi bem-sucedida, atualizar a interface
              if (result) {
                // Recarregar a lista de checklists
                offlineStorage.getAllItems("checklists").then((checklists) => {
                  setOfflineChecklists(checklists)

                  // Verificar sincronizações pendentes
                  offlineStorage.getPendingSyncs().then((syncs) => {
                    setPendingSyncs(syncs.length)
                  })
                })
              }
            })
            .catch((err) => console.error("Erro na sincronização imediata:", err))
        }, 2000) // Aumentar o atraso para 2 segundos
      }

      // Atualizar a lista de checklists
      setRefreshTrigger((prev) => prev + 1)

      // Cachear a página atual após a navegação
      setTimeout(cacheCurrentPage, 500)

      console.log("Checklist salvo com sucesso!")

      // Salvar a quilometragem no histórico se disponível
      if (data.vehicleKilometer && selectedVehicle?.id) {
        const kmValue = Number(data.vehicleKilometer.replace(/\D/g, ""))
        kilometerHistory.addKilometerRecord({
          vehicleId: selectedVehicle.id,
          kilometer: kmValue,
          timestamp: submittedAt,
          checklistId: checklistId,
        })
      }
      // Clear localStorage after submission
      localStorage.removeItem("checklistId")
    } catch (error) {
      console.error("Erro ao salvar checklist:", error)
      setGlobalError(error instanceof Error ? error : new Error("Erro desconhecido ao salvar checklist"))
    }
  }

  const continueExistingChecklist = (checklist: any) => {
    try {
      // Limpar qualquer erro anterior
      setGlobalError(null)

      // Definir a segunda etapa do checklist
      setActiveTab("apply-checklist")
      setSelectedTemplate(checklist.template)
      setSelectedVehicle(checklist.vehicle)
      setStep("form")

      // Armazenar o checklist existente para uso no formulário
      localStorage.setItem(
        "continuing_checklist",
        JSON.stringify({
          id: checklist.id,
          flowStep: 2,
          previousResponses: checklist.responses,
        }),
      )

      // Cachear a página atual após a navegação
      setTimeout(cacheCurrentPage, 500)

      console.log("Continuando checklist:", checklist.id)
    } catch (error) {
      console.error("Erro ao continuar checklist:", error)
      setGlobalError(error instanceof Error ? error : new Error("Erro ao continuar checklist"))
    }
  }

  const handleStartNew = () => {
    setSelectedTemplate(null)
    setSelectedVehicle(null)
    setCompletedChecklist(null)
    setStep("template")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "apply-checklist") {
      setStep("template")
    } else if (tab === "settings") {
      setSettingsScreen("main")
    } else if (tab === "my-checklists") {
      setMyChecklistsScreen("list")
      setSelectedMyChecklist(null)
    }

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  const handleBackToTemplates = () => {
    setSelectedTemplate(null)
    setStep("template")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  const handleSettingsNavigation = (screen: string) => {
    setSettingsScreen(screen)

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  const handleBackToSettings = () => {
    setSettingsScreen("main")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  // Função para visualizar um checklist da lista "Meus Checklists"
  const handleViewMyChecklist = (checklist: any) => {
    setSelectedMyChecklist(checklist)
    setMyChecklistsScreen("details")

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  // Função para voltar à lista de checklists
  const handleBackToMyChecklists = (checklist?: any, action?: string) => {
    if (checklist && action === "continue") {
      // Se a ação for continuar, vamos para a tela de formulário com o checklist selecionado
      continueExistingChecklist(checklist)
    } else {
      // Comportamento padrão - voltar para a lista
      setMyChecklistsScreen("list")
      setSelectedMyChecklist(null)

      // Cachear a página atual após a navegação
      setTimeout(cacheCurrentPage, 500)
    }
  }

  // Mostrar indicador de carregamento enquanto inicializa
  if (isLoading) {
    return <LoadingScreen />
  }

  if (globalError) {
    return (
      <ErrorFallback
        error={globalError}
        resetErrorBoundary={() => {
          setGlobalError(null)
          // Voltar para a tela de templates
          setStep("template")
        }}
        onCancel={() => {
          setGlobalError(null)
          setStep("template")
        }}
      />
    )
  }

  // Se estiver verificando a conexão por muito tempo, mostrar o fallback
  if (isCheckingConnection && !isInitialized) {
    return <OfflineFallback message="Verificando conexão com o servidor..." onRetry={() => window.location.reload()} />
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Banner de status offline/online */}
      <OfflineBanner pendingSyncs={pendingSyncs} onTrySync={handleForceSyncNow} />

      {/* Atualizador do Service Worker */}
      <ServiceWorkerUpdater />

      {/* Resto do conteúdo... */}
      {activeTab === "apply-checklist" && (
        <>
          {step === "template" && (
            <ChecklistTemplates onSelectTemplate={handleSelectTemplate} templates={offlineTemplates} />
          )}

          {step === "vehicle" && selectedTemplate && (
            <VehicleSelection
              onSelectVehicle={handleSelectVehicle}
              onBack={handleBackToTemplates}
              checklistType={selectedTemplate.title}
              vehicles={offlineVehicles}
            />
          )}

          {step === "form" && selectedTemplate && selectedVehicle && (
            <ChecklistForm
              checklist={{
                ...selectedTemplate,
                vehicle: selectedVehicle.name,
                licensePlate: selectedVehicle.licensePlate,
              }}
              onSubmit={handleSubmitChecklist}
              onCancel={() => setStep("vehicle")}
              offlineMode={offlineMode}
            />
          )}

          {step === "complete" && completedChecklist && (
            <ChecklistComplete
              completedChecklist={{
                ...completedChecklist,
                title: completedChecklist.template.title,
                vehicle: completedChecklist.vehicle.name,
                licensePlate: completedChecklist.vehicle.licensePlate,
                items: completedChecklist.template.items,
              }}
              onStartNew={handleStartNew}
            />
          )}
        </>
      )}

      {activeTab === "my-checklists" && (
        <>
          {myChecklistsScreen === "list" && (
            <MyChecklistsScreen
              onViewChecklist={handleViewMyChecklist}
              key={`my-checklists-${refreshTrigger}`}
              offlineChecklists={offlineChecklists}
            />
          )}

          {myChecklistsScreen === "details" && selectedMyChecklist && (
            <ChecklistDetails checklist={selectedMyChecklist} onBack={handleBackToMyChecklists} />
          )}
        </>
      )}

      {activeTab === "settings" && (
        <>
          {settingsScreen === "main" && (
            <SettingsScreen
              onNavigate={handleSettingsNavigation}
              isOnline={isOnline}
              pendingSyncs={pendingSyncs}
              onSyncNow={handleForceSyncNow}
            />
          )}
          {settingsScreen === "updates" && <UpdatesScreen onBack={handleBackToSettings} />}
          {settingsScreen === "api-debug" && <ApiResponseViewer onBack={handleBackToSettings} />}
        </>
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
