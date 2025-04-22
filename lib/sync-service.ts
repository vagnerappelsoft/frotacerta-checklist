import { offlineStorage } from "./offline-storage"
import { apiService } from "./api-service"
import { sanitizeForStorage } from "./utils"

// Interface para os eventos de sincronização
interface SyncEvent {
  type: "start" | "progress" | "complete" | "error"
  message: string
  data?: any
}

// Tipo para os callbacks de eventos
type SyncEventCallback = (event: SyncEvent) => void

// Classe para gerenciar a sincronização de dados
export class SyncService {
  private listeners: SyncEventCallback[] = []
  private isSyncing = false
  private autoSyncInterval: NodeJS.Timeout | null = null
  private retryTimeout: NodeJS.Timeout | null = null
  private syncTimeoutId: NodeJS.Timeout | null = null
  private lastSyncTime: Date | null = null
  private retryCount = 0
  private maxRetries = 3

  constructor() {
    // Iniciar verificação automática de sincronização quando online
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)

      // Verificar se há uma sincronização inicial pendente
      this.checkInitialSync()
    }
  }

  // Verificar se precisamos fazer uma sincronização inicial
  private async checkInitialSync() {
    try {
      const lastSync = localStorage.getItem("last_sync_time")
      const needsInitialSync = !lastSync

      if (needsInitialSync && navigator.onLine) {
        console.log("Primeira execução detectada, realizando sincronização inicial...")
        await this.performInitialSync()
      }
    } catch (error) {
      console.error("Erro ao verificar sincronização inicial:", error)

      // If we're using mock data, we can still proceed
      if (apiService.isUsingMockData()) {
        console.log("Usando dados de exemplo devido a erro de conexão com a API")
        await this.loadMockData()
      }
    }
  }

  // Carregar dados de exemplo quando a API não está disponível
  private async loadMockData() {
    try {
      this.dispatchEvent({
        type: "start",
        message: "Carregando dados de exemplo para uso offline",
      })

      // 1. Buscar templates
      const templates = await apiService.getChecklistTemplates()
      for (const template of templates) {
        await offlineStorage.saveItem("templates", sanitizeForStorage(template))
      }

      // 2. Buscar veículos
      const vehicles = await apiService.getVehicles()
      for (const vehicle of vehicles) {
        await offlineStorage.saveItem("vehicles", sanitizeForStorage(vehicle))
      }

      // Atualizar timestamp da última sincronização
      this.updateLastSyncTime()

      this.dispatchEvent({
        type: "complete",
        message: "Dados de exemplo carregados com sucesso",
      })

      return true
    } catch (error) {
      console.error("Erro ao carregar dados de exemplo:", error)
      this.dispatchEvent({
        type: "error",
        message: `Erro ao carregar dados de exemplo: ${error}`,
        data: { error },
      })
      return false
    }
  }

  // Modificar o método performInitialSync para verificar se é o primeiro acesso

  private async performInitialSync() {
    this.dispatchEvent({
      type: "start",
      message: "Realizando sincronização inicial de dados",
    })

    try {
      // Check if we're in mock mode
      if (apiService.isUsingMockData()) {
        return await this.loadMockData()
      }

      // Verificar se é o primeiro acesso (não tem timestamp de última sincronização)
      const isFirstAccess = !localStorage.getItem("last_sync_time")
      console.log(`Sincronização inicial - Primeiro acesso: ${isFirstAccess}`)

      // 1. Buscar templates
      let templates = []
      try {
        // Obter o timestamp da última sincronização
        const lastSyncTime = this.getLastSyncTime()

        // No primeiro acesso, não usar filtro de data para obter todos os dados
        // Após o primeiro acesso, usar o filtro de data para sincronização incremental
        const lastSyncParam =
          !isFirstAccess && lastSyncTime
            ? `UpdatedAt=${encodeURIComponent(lastSyncTime.toLocaleDateString("en-US"))}`
            : ""

        console.log(
          `Buscando templates ${isFirstAccess ? "completos" : "atualizados desde"}: ${lastSyncTime ? lastSyncTime.toLocaleDateString() : "início"}`,
        )

        try {
          templates = await apiService.getChecklistTemplates(lastSyncParam)
          console.log("Templates carregados:", templates.length)

          if (templates.length > 0) {
            console.log("Armazenando templates no storage local...")
            for (const template of templates) {
              await offlineStorage.saveItem("templates", sanitizeForStorage(template))
            }
          } else {
            console.log("Nenhum template novo ou atualizado encontrado")
          }
        } catch (apiError) {
          console.error("Erro na API ao buscar templates:", apiError)

          // If we're in mock mode or the API is unavailable, try to load mock data
          if (apiService.isUsingMockData() || (apiError instanceof Error && apiError.message.includes("404"))) {
            console.log("Tentando carregar templates de exemplo...")
            const { CHECKLIST_TEMPLATES } = await import("@/data/mock-templates")
            templates = CHECKLIST_TEMPLATES || []

            if (templates.length > 0) {
              console.log("Armazenando templates de exemplo no storage local...")
              for (const template of templates) {
                await offlineStorage.saveItem("templates", sanitizeForStorage(template))
              }
            }
          } else {
            throw apiError // Re-throw if it's not a 404 or mock mode
          }
        }
      } catch (templateError) {
        console.error("Erro ao carregar templates:", templateError)
        // Continuar com a sincronização mesmo se falhar ao carregar templates
      }

      // 2. Buscar veículos
      let vehicles = []
      try {
        // Usar o mesmo timestamp da última sincronização
        const lastSyncTime = this.getLastSyncTime()

        // No primeiro acesso, não usar filtro de data para obter todos os dados
        // Após o primeiro acesso, usar o filtro de data para sincronização incremental
        const lastSyncParam =
          !isFirstAccess && lastSyncTime
            ? `UpdatedAt=${encodeURIComponent(lastSyncTime.toLocaleDateString("en-US"))}`
            : ""

        console.log(
          `Buscando veículos ${isFirstAccess ? "completos" : "atualizados desde"}: ${lastSyncTime ? lastSyncTime.toLocaleDateString() : "início"}`,
        )

        try {
          vehicles = await apiService.getVehicles(lastSyncParam)
          console.log("Veículos carregados:", vehicles.length)

          if (vehicles.length > 0) {
            console.log("Armazenando veículos no storage local...")
            for (const vehicle of vehicles) {
              await offlineStorage.saveItem("vehicles", sanitizeForStorage(vehicle))
            }
          } else {
            console.log("Nenhum veículo novo ou atualizado encontrado")
          }
        } catch (apiError) {
          console.error("Erro na API ao buscar veículos:", apiError)

          // If we're in mock mode or the API is unavailable, try to load mock data
          if (apiService.isUsingMockData() || (apiError instanceof Error && apiError.message.includes("404"))) {
            console.log("Tentando carregar veículos de exemplo...")
            const { VEHICLES } = await import("@/data/mock-vehicles")
            vehicles = VEHICLES || []

            if (vehicles.length > 0) {
              console.log("Armazenando veículos de exemplo no storage local...")
              for (const vehicle of vehicles) {
                await offlineStorage.saveItem("vehicles", sanitizeForStorage(vehicle))
              }
            }
          } else {
            throw apiError // Re-throw if it's not a 404 or mock mode
          }
        }
      } catch (vehicleError) {
        console.error("Erro ao carregar veículos:", vehicleError)
        // Continuar com a sincronização mesmo se falhar ao carregar veículos
      }

      // 3. Buscar checklists pendentes
      try {
        const pendingChecklists = await apiService.getPendingChecklists()
        console.log("Checklists pendentes carregados:", pendingChecklists.length)

        if (pendingChecklists.length > 0) {
          for (const checklist of pendingChecklists) {
            await offlineStorage.saveItem("checklists", sanitizeForStorage(checklist))
          }
        }
      } catch (checklistError) {
        console.error("Erro ao carregar checklists pendentes:", checklistError)
        // Continuar com a sincronização mesmo se falhar ao carregar checklists
      }

      // Atualizar timestamp da última sincronização
      this.updateLastSyncTime()

      this.dispatchEvent({
        type: "complete",
        message: "Sincronização inicial concluída com sucesso",
        data: {
          templatesCount: templates.length,
          vehiclesCount: vehicles.length,
        },
      })

      // Reset retry count on success
      this.retryCount = 0

      return true
    } catch (error) {
      console.error("Erro na sincronização inicial:", error)

      // If we've reached max retries, try to use mock data
      if (++this.retryCount >= this.maxRetries) {
        console.log(`Máximo de ${this.maxRetries} tentativas atingido. Tentando usar dados de exemplo...`)
        apiService.setMockMode(true)
        return await this.loadMockData()
      }

      this.dispatchEvent({
        type: "error",
        message: `Erro na sincronização inicial: ${error}`,
        data: { error },
      })

      // Schedule a retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000) // Max 30 seconds
      console.log(`Agendando nova tentativa em ${retryDelay / 1000} segundos...`)

      setTimeout(() => {
        if (navigator.onLine) {
          console.log(`Tentativa ${this.retryCount + 1} de sincronização inicial...`)
          this.performInitialSync()
        }
      }, retryDelay)

      return false
    }
  }

  // Atualizar o timestamp da última sincronização
  private updateLastSyncTime() {
    this.lastSyncTime = new Date()
    localStorage.setItem("last_sync_time", this.lastSyncTime.toISOString())
  }

  // Método para lidar com o evento online
  private handleOnline = () => {
    console.log("Conexão restaurada, verificando sincronizações pendentes...")
    // Tentar sincronizar imediatamente quando ficar online
    this.checkAndSync()

    // Configurar verificação periódica
    this.startAutoSync()
  }

  // Método para lidar com o evento offline
  private handleOffline = () => {
    console.log("Conexão perdida, pausando sincronização...")
    // Parar verificação automática quando offline
    this.stopAutoSync()

    // Limpar qualquer tentativa de retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    // Limpar qualquer timeout de sincronização em andamento
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId)
      this.syncTimeoutId = null
    }

    // Se estiver sincronizando, interromper
    if (this.isSyncing) {
      this.isSyncing = false
      this.dispatchEvent({
        type: "error",
        message: "Sincronização interrompida devido à perda de conexão",
      })
    }
  }

  // Iniciar verificação automática de sincronização
  private startAutoSync(intervalMs = 300000) {
    // 5 minutos por padrão
    this.stopAutoSync() // Garantir que não haja duplicatas

    this.autoSyncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.checkAndSync()
      }
    }, intervalMs)
  }

  // Parar verificação automática
  private stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval)
      this.autoSyncInterval = null
    }
  }

  // Registra um listener para eventos de sincronização
  addEventListener(callback: SyncEventCallback) {
    this.listeners.push(callback)
  }

  // Remove um listener
  removeEventListener(callback: SyncEventCallback) {
    this.listeners = this.listeners.filter((listener) => listener !== callback)
  }

  // Dispara um evento para todos os listeners
  private dispatchEvent(event: SyncEvent) {
    this.listeners.forEach((listener) => listener(event))
  }

  // Verifica se há itens para sincronizar e inicia o processo
  async checkAndSync(): Promise<boolean> {
    if (this.isSyncing || !navigator.onLine) {
      return false
    }

    try {
      this.isSyncing = true
      this.dispatchEvent({ type: "start", message: "Iniciando sincronização" })

      const pendingSyncs = await offlineStorage.getPendingSyncs()

      if (pendingSyncs.length === 0) {
        this.dispatchEvent({ type: "complete", message: "Nada para sincronizar" })
        this.isSyncing = false
        return true
      }

      this.dispatchEvent({
        type: "progress",
        message: `Sincronizando ${pendingSyncs.length} item(s)`,
        data: { total: pendingSyncs.length, current: 0 },
      })

      // Usar um timeout para não bloquear a interface
      this.syncTimeoutId = setTimeout(async () => {
        try {
          for (let i = 0; i < pendingSyncs.length; i++) {
            // Verificar se ainda estamos online
            if (!navigator.onLine) {
              throw new Error("Conexão perdida durante a sincronização")
            }

            const sync = pendingSyncs[i]

            // Processar o item com base no tipo e operação
            await this.processSyncItem(sync)

            // Marcar como sincronizado
            await offlineStorage.markAsSynced(sync.id)

            this.dispatchEvent({
              type: "progress",
              message: `Sincronizando item ${i + 1} de ${pendingSyncs.length}`,
              data: { total: pendingSyncs.length, current: i + 1 },
            })
          }

          // Atualizar timestamp da última sincronização
          this.updateLastSyncTime()

          this.dispatchEvent({
            type: "complete",
            message: `Sincronização concluída: ${pendingSyncs.length} item(s)`,
            data: { total: pendingSyncs.length },
          })

          // Reset retry count on success
          this.retryCount = 0
        } catch (error) {
          console.error("Erro durante a sincronização:", error)
          this.dispatchEvent({
            type: "error",
            message: `Erro na sincronização: ${error}`,
            data: { error },
          })

          // Configurar uma nova tentativa após um tempo com backoff exponencial
          if (navigator.onLine) {
            const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount++), 30000) // Max 30 seconds
            console.log(`Agendando nova tentativa em ${retryDelay / 1000} segundos...`)

            this.retryTimeout = setTimeout(() => {
              console.log("Tentando sincronizar novamente após erro...")
              this.checkAndSync()
            }, retryDelay)
          }
        } finally {
          this.isSyncing = false
          this.syncTimeoutId = null
        }
      }, 0)

      return true
    } catch (error) {
      console.error("Erro ao iniciar sincronização:", error)

      this.dispatchEvent({
        type: "error",
        message: `Erro na sincronização: ${error}`,
        data: { error },
      })

      this.isSyncing = false

      // Configurar uma nova tentativa após um tempo
      if (navigator.onLine) {
        const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount++), 30000) // Max 30 seconds
        console.log(`Agendando nova tentativa em ${retryDelay / 1000} segundos...`)

        this.retryTimeout = setTimeout(() => {
          console.log("Tentando sincronizar novamente após erro...")
          this.checkAndSync()
        }, retryDelay)
      }

      return false
    }
  }

  // Modifique o método processSyncItem para melhorar o tratamento de checklists

  // Processar um item da fila de sincronização
  private async processSyncItem(syncItem: any): Promise<void> {
    const { type, itemId, operation } = syncItem

    try {
      // Obter o item do armazenamento local
      const item = await offlineStorage.getItem(type, itemId)

      if (!item) {
        console.warn(`Item ${itemId} não encontrado no armazenamento local`)
        return
      }

      // Processar com base na operação
      switch (operation) {
        case "create":
        case "update":
          if (type === "checklists") {
            console.log(`Processando sincronização de checklist ${itemId}...`)

            try {
              // Processar uploads de arquivos primeiro
              const processedItem = await this.processFileUploads(item)

              // Enviar checklist para a API
              const result = await apiService.submitChecklist(processedItem)
              console.log(`Checklist ${itemId} enviado com sucesso para a API:`, result)

              // Atualizar o item local para marcar como sincronizado
              item.synced = true
              await offlineStorage.saveItem(type, item)
              console.log(`Checklist ${itemId} marcado como sincronizado localmente`)
            } catch (error) {
              console.error(`Erro ao sincronizar checklist ${itemId}:`, error)
              throw error // Propagar o erro para tratamento adequado
            }
          }
          break

        case "delete":
          // Implementar lógica de exclusão se necessário
          console.log(`Operação de exclusão para ${type} ${itemId} não implementada`)
          break

        default:
          console.warn(`Operação desconhecida: ${operation}`)
      }
    } catch (error) {
      console.error(`Erro ao processar item de sincronização ${syncItem.id}:`, error)
      throw error // Propagar o erro para tratamento adequado
    }
  }

  // Processar uploads de arquivos (fotos e áudios)
  private async processFileUploads(checklist: any): Promise<any> {
    // Clonar o checklist para não modificar o original
    const processedChecklist = { ...checklist }

    // Processar fotos
    if (processedChecklist.responses && processedChecklist.responses.photos) {
      const processedPhotos: Record<string, string[]> = {}

      for (const [key, photos] of Object.entries(processedChecklist.responses.photos)) {
        processedPhotos[key] = []

        for (const photoUrl of photos as string[]) {
          // Verificar se é uma URL de blob local
          if (photoUrl.startsWith("blob:")) {
            try {
              // Buscar o blob
              const response = await fetch(photoUrl)
              const blob = await response.blob()

              // Fazer upload para o servidor
              const serverUrl = await apiService.uploadFile(blob, "photo", {
                checklistId: processedChecklist.id,
                itemId: key,
              })

              // Substituir URL local pela URL do servidor
              processedPhotos[key].push(serverUrl)
            } catch (error) {
              console.error(`Erro ao processar foto ${photoUrl}:`, error)
              // Manter a URL original em caso de erro
              processedPhotos[key].push(photoUrl)
            }
          } else {
            // Já é uma URL do servidor ou outro formato, manter como está
            processedPhotos[key].push(photoUrl)
          }
        }
      }

      processedChecklist.responses.photos = processedPhotos
    }

    // Processar áudios (lógica similar às fotos)
    if (processedChecklist.responses && processedChecklist.responses.audios) {
      const processedAudios: Record<string, string[]> = {}

      for (const [key, audios] of Object.entries(processedChecklist.responses.audios)) {
        processedAudios[key] = []

        for (const audioUrl of audios as string[]) {
          // Verificar se é uma URL de blob local
          if (audioUrl.startsWith("blob:")) {
            try {
              // Buscar o blob
              const response = await fetch(audioUrl)
              const blob = await response.blob()

              // Fazer upload para o servidor
              const serverUrl = await apiService.uploadFile(blob, "audio", {
                checklistId: processedChecklist.id,
                itemId: key,
              })

              // Substituir URL local pela URL do servidor
              processedAudios[key].push(serverUrl)
            } catch (error) {
              console.error(`Erro ao processar áudio ${audioUrl}:`, error)
              // Manter a URL original em caso de erro
              processedAudios[key].push(audioUrl)
            }
          } else {
            // Já é uma URL do servidor ou outro formato, manter como está
            processedAudios[key].push(audioUrl)
          }
        }
      }

      processedChecklist.responses.audios = processedAudios
    }

    return processedChecklist
  }

  // Modifique o método forceSyncNow para ser mais robusto
  async forceSyncNow(): Promise<boolean> {
    if (!navigator.onLine) {
      this.dispatchEvent({
        type: "error",
        message: "Não é possível sincronizar: dispositivo offline",
      })
      return false
    }

    console.log("Forçando sincronização imediata...")

    // Verificar se já está sincronizando
    if (this.isSyncing) {
      console.log("Sincronização já em andamento, aguardando...")
      // Aguardar a sincronização atual terminar antes de iniciar uma nova
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isSyncing) {
            clearInterval(checkInterval)
            resolve(this.checkAndSync())
          }
        }, 500)
      })
    }

    return this.checkAndSync()
  }

  // Força uma sincronização inicial completa (recarrega todos os dados)
  async forceFullSync(): Promise<boolean> {
    if (!navigator.onLine && !apiService.isUsingMockData()) {
      this.dispatchEvent({
        type: "error",
        message: "Não é possível sincronizar: dispositivo offline",
      })
      return false
    }

    // Reset retry count before attempting full sync
    this.retryCount = 0
    return this.performInitialSync()
  }

  // Obter o timestamp da última sincronização
  getLastSyncTime(): Date | null {
    if (!this.lastSyncTime) {
      const storedTime = localStorage.getItem("last_sync_time")
      if (storedTime) {
        this.lastSyncTime = new Date(storedTime)
      }
    }
    return this.lastSyncTime
  }

  // Método para limpar recursos quando o serviço não for mais necessário
  destroy() {
    this.stopAutoSync()

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId)
      this.syncTimeoutId = null
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }

    this.listeners = []
  }
}

// Singleton para uso em toda a aplicação
export const syncService = new SyncService()
