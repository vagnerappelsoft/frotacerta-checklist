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
import { InstallPWAPrompt } from "@/components/install-pwa-prompt"
import { InstallAppScreen } from "@/components/install-app-screen"
import { VEHICLES } from "@/data/mock-vehicles"
import { CHECKLIST_TEMPLATES } from "@/data/mock-templates"
import { ServiceWorkerUpdater } from "@/components/service-worker-updater"
import { OfflineFallback } from "@/components/offline-fallback"
import { useAuth } from "@/hooks/use-auth"

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

          // Se não houver dados armazenados, usar os dados de exemplo
          setOfflineTemplates(storedTemplates.length > 0 ? storedTemplates : CHECKLIST_TEMPLATES)
          setOfflineVehicles(storedVehicles.length > 0 ? storedVehicles : VEHICLES)
          setOfflineChecklists(storedChecklists.length > 0 ? storedChecklists : [])

          // Se não estiver online, entrar em modo offline imediatamente
          if (!isOnline) {
            setOfflineMode(true)
            console.log("Modo offline ativado durante inicialização")
          }
        } catch (error) {
          console.error("Erro ao carregar dados offline:", error)
          // Em caso de erro, usar os dados de exemplo
          setOfflineTemplates(CHECKLIST_TEMPLATES)
          setOfflineVehicles(VEHICLES)
          setOfflineChecklists([])
          setOfflineMode(!isOnline)
        }

        // Tentar sincronizar se estiver online e tiver sincronizações pendentes
        if (isOnline && pendingSyncs.length > 0) {
          syncService.checkAndSync()
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
  }, [isOnline, cacheCurrentPage])

  // Adicionar um efeito para recarregar dados quando o usuário mudar
  useEffect(() => {
    // Se temos um usuário logado e o app já está inicializado
    if (user && isInitialized) {
      const loadUserData = async () => {
        console.log("Usuário detectado, verificando dados...")

        try {
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

            setOfflineTemplates(updatedTemplates.length > 0 ? updatedTemplates : CHECKLIST_TEMPLATES)
            setOfflineVehicles(updatedVehicles.length > 0 ? updatedVehicles : VEHICLES)
            setOfflineChecklists(updatedChecklists)

            console.log("Dados recarregados após sincronização forçada")
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error)
        }
      }

      loadUserData()
    }
  }, [user, isInitialized])

  // Adicionar verificação de dados após o login

  // Adicione este useEffect no componente DriverChecklistPage:
  // Verificar se os dados foram carregados após o login
  useEffect(() => {
    if (user && isInitialized && !isLoading) {
      const checkDataAfterLogin = async () => {
        try {
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

            setOfflineTemplates(updatedTemplates.length > 0 ? updatedTemplates : CHECKLIST_TEMPLATES)
            setOfflineVehicles(updatedVehicles.length > 0 ? updatedVehicles : VEHICLES)

            console.log("Sincronização completa concluída, dados atualizados:", {
              templatesCount: updatedTemplates.length,
              vehiclesCount: updatedVehicles.length,
            })
          }
        } catch (error) {
          console.error("Erro ao verificar dados após login:", error)
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
    }
  }

  // Forçar uma sincronização
  const handleForceSyncNow = () => {
    if (isOnline) {
      syncService.forceSyncNow()
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

  // Modifique o método handleSubmitChecklist para garantir que a sincronização seja iniciada imediatamente quando online

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

      // Criar o objeto de checklist completo com dados sanitizados
      const newChecklist = {
        id: `checklist_${Date.now()}`, // Gerar um ID único
        template: sanitizedTemplate,
        vehicle: sanitizedVehicle,
        responses: sanitizedData,
        submittedAt: submittedAt,
        synced: false, // Sempre iniciar como não sincronizado para garantir que seja processado
        userId: user?.id || "unknown", // Adicionar ID do usuário
      }

      console.log("Objeto de checklist sanitizado criado")

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

      // Se estiver online, tentar sincronizar imediatamente
      if (isOnline) {
        console.log("Usuário está online, iniciando sincronização imediata...")
        setTimeout(() => {
          syncService
            .forceSyncNow()
            .then((result) => console.log("Resultado da sincronização imediata:", result))
            .catch((err) => console.error("Erro na sincronização imediata:", err))
        }, 500) // Pequeno atraso para garantir que o IndexedDB tenha tempo de processar
      }

      // Atualizar a lista de checklists
      setRefreshTrigger((prev) => prev + 1)

      // Cachear a página atual após a navegação
      setTimeout(cacheCurrentPage, 500)

      console.log("Checklist salvo com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar checklist:", error)
      setGlobalError(error instanceof Error ? error : new Error("Erro desconhecido ao salvar checklist"))
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
  const handleBackToMyChecklists = () => {
    setMyChecklistsScreen("list")
    setSelectedMyChecklist(null)

    // Cachear a página atual após a navegação
    setTimeout(cacheCurrentPage, 500)
  }

  // Mostrar indicador de carregamento enquanto inicializa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-500 font-medium">Carregando...</p>
          <p className="text-sm text-slate-500">Inicializando o aplicativo</p>
        </div>
      </div>
    )
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

      {/* Prompt de instalação do PWA */}
      <InstallPWAPrompt />

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
          {settingsScreen === "install-app" && <InstallAppScreen onBack={handleBackToSettings} />}
        </>
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
