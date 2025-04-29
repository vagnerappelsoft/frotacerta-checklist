import { apiService } from "@/lib/api-service"
import { offlineStorage } from "@/lib/offline-storage"

class SyncService {
  private listeners: ((event: any) => void)[] = []
  public isSyncing = false
  private lastSyncTime: Date | null = null
  private retryCount = 0
  private readonly maxRetries = 3
  private syncInProgress: Set<string> = new Set() // Controle de itens em sincronização

  constructor() {
    // Verificar se estamos no navegador antes de acessar localStorage
    if (typeof window !== "undefined") {
      this.lastSyncTime = this.getLastSyncTime()
    }
  }

  addEventListener(listener: (event: any) => void) {
    this.listeners.push(listener)
  }

  removeEventListener(listener: (event: any) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  dispatchEvent(event: any) {
    this.listeners.forEach((listener) => listener(event))
  }

  getLastSyncTime(): Date | null {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return null
    }

    const time = localStorage.getItem("last_sync_time")
    return time ? new Date(time) : null
  }

  setLastSyncTime(time: Date) {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return
    }

    this.lastSyncTime = time
    localStorage.setItem("last_sync_time", time.toISOString())
  }

  // Modificar o método performInitialSync para processar corretamente os checklists da API
  // Modifique o método performInitialSync para suportar sincronização incremental com timestamp
  // Modifique o método performInitialSync para garantir que o timestamp seja usado corretamente
  async performInitialSync(useTimestamp = false): Promise<boolean> {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return false
    }

    if (this.isSyncing || !navigator.onLine) {
      return false
    }

    try {
      this.isSyncing = true

      // Determinar se é uma sincronização inicial ou incremental
      const lastSyncTime = this.getLastSyncTime()
      const isInitialSync = !useTimestamp || !lastSyncTime

      if (isInitialSync) {
        this.dispatchEvent({ type: "start", message: "Iniciando sincronização completa" })
      } else {
        this.dispatchEvent({ type: "start", message: "Iniciando sincronização incremental" })
      }

      // Verificar se já existe uma sincronização recente (menos de 5 minutos)
      const now = new Date()

      // Se não for a primeira sincronização e a última foi recente, pular
      if (!isInitialSync && lastSyncTime && now.getTime() - lastSyncTime.getTime() < 5 * 60 * 1000) {
        console.log("Sincronização recente detectada, pulando sincronização")
        this.dispatchEvent({ type: "complete", message: "Sincronização já realizada recentemente" })
        this.isSyncing = false
        return true
      }

      // Verificar se já existe uma requisição em andamento para getAllAppData
      const appDataRequestInProgress = localStorage.getItem("app_data_request_in_progress")
      if (appDataRequestInProgress) {
        console.log("Requisição getAllAppData já em andamento, pulando sincronização duplicada")
        this.dispatchEvent({ type: "complete", message: "Sincronização já em andamento" })
        this.isSyncing = false
        return true
      }

      // Marcar que uma requisição está em andamento
      localStorage.setItem("app_data_request_in_progress", "true")

      try {
        // Obter o timestamp formatado para a API, se for sincronização incremental
        const updatedAtParam = useTimestamp && lastSyncTime ? lastSyncTime.toISOString() : undefined

        console.log(
          `Iniciando sincronização ${isInitialSync ? "completa" : "incremental"} ${updatedAtParam ? `com timestamp: ${updatedAtParam}` : "sem timestamp"}`,
        )

        // Chamar a API com o timestamp, se disponível
        const allData = await apiService.getAllAppData(undefined, updatedAtParam)

        // Log para depuração da resposta da API
        console.log("Resposta da API getAllAppData:", {
          totalItems: allData.totalItems,
          vehiclesCount: allData.vehicles?.length || 0,
          modelsCount: allData.models?.length || 0,
          checklistsCount: allData.checklists?.length || 0,
        })

        const totalItems =
          (allData.vehicles?.length || 0) + (allData.models?.length || 0) + (allData.checklists?.length || 0)

        this.dispatchEvent({
          type: "progress",
          message: `Sincronizando ${totalItems} item(s)`,
          data: { total: totalItems, current: 0 },
        })

        // Processar veículos
        if (allData.vehicles && Array.isArray(allData.vehicles)) {
          for (let i = 0; i < allData.vehicles.length; i++) {
            // Garantir que o veículo tenha um ID como string
            const vehicle = {
              ...allData.vehicles[i],
              id: allData.vehicles[i].id?.toString() || `vehicle_${i}`,
              fromApi: true, // Marcar como vindo da API
            }
            await offlineStorage.saveItem("vehicles", vehicle)
            this.dispatchEvent({
              type: "progress",
              message: `Sincronizando veículo ${i + 1} de ${allData.vehicles.length}`,
              data: { total: totalItems, current: i + 1 },
            })
          }
        }

        // Processar modelos de checklist
        if (allData.models && Array.isArray(allData.models)) {
          for (let i = 0; i < allData.models.length; i++) {
            // Garantir que o modelo tenha um ID como string e campos necessários
            const model = {
              ...allData.models[i],
              id: allData.models[i].id?.toString() || `model_${i}`,
              title: allData.models[i].name || "Modelo sem nome",
              description: allData.models[i].description || "Sem descrição",
              fromApi: true, // Marcar como vindo da API
            }
            await offlineStorage.saveItem("templates", model)
            this.dispatchEvent({
              type: "progress",
              message: `Sincronizando modelo ${i + 1} de ${allData.models.length}`,
              data: { total: totalItems, current: allData.vehicles.length + i + 1 },
            })
          }
        }

        // Processar checklists
        if (allData.checklists && Array.isArray(allData.checklists)) {
          for (let i = 0; i < allData.checklists.length; i++) {
            // Adaptar o formato do checklist para o formato esperado pelo aplicativo
            const checklist = {
              id: allData.checklists[i].id?.toString() || `checklist_${i}`,
              title: allData.checklists[i].name || "Checklist sem título",
              template: {
                id: allData.checklists[i].model?.id?.toString() || "",
                title: allData.checklists[i].model?.name || allData.checklists[i].name || "Modelo sem nome",
                items: this.extractChecklistItems(allData.checklists[i]),
                flowSize: allData.checklists[i].flowSize || 1, // Adicionar flowSize
              },
              vehicle: this.extractVehicleInfo(allData.checklists[i]),
              responses: this.extractResponses(allData.checklists[i]),
              submittedAt: allData.checklists[i].startDate || new Date().toISOString(),
              synced: true, // Marcar como sincronizado, pois veio da API
              userId: allData.checklists[i].user?.id || "unknown",
              flowSize: allData.checklists[i].flowSize || 1, // Adicionar flowSize
              flowStep: allData.checklists[i].flowStep || 1, // Adicionar flowStep
              status: allData.checklists[i].status || { id: 1 }, // Adicionar status
              fromApi: true, // Marcar como vindo da API
            }

            await offlineStorage.saveItem("checklists", checklist)
            this.dispatchEvent({
              type: "progress",
              message: `Sincronizando checklist ${i + 1} de ${allData.checklists.length}`,
              data: {
                total: totalItems,
                current: allData.vehicles.length + allData.models.length + i + 1,
              },
            })
          }
        }

        // Verificar integridade dos dados após sincronização
        if (this.isOnline()) {
          await this.verifyDataIntegrity(allData)
        }

        // Atualizar o timestamp da última sincronização
        this.setLastSyncTime(new Date())

        // Registrar o tipo de sincronização realizada
        localStorage.setItem("last_sync_type", isInitialSync ? "full" : "incremental")

        this.dispatchEvent({
          type: "complete",
          message: isInitialSync ? "Sincronização completa concluída" : "Sincronização incremental concluída",
        })

        this.retryCount = 0
        return true
      } finally {
        // Remover o flag de requisição em andamento
        localStorage.removeItem("app_data_request_in_progress")
      }
    } catch (error) {
      console.error("Erro durante a sincronização:", error)
      this.dispatchEvent({ type: "error", message: `Erro na sincronização: ${error}` })
      return false
    } finally {
      this.isSyncing = false
    }
  }

  // Nova função para verificar a integridade dos dados
  async verifyDataIntegrity(apiData: any): Promise<void> {
    console.log("Verificando integridade dos dados...")
    this.dispatchEvent({ type: "progress", message: "Verificando integridade dos dados" })

    try {
      // 1. Verificar integridade dos modelos de checklist (templates)
      await this.verifyTemplatesIntegrity(apiData.models || [])

      // 2. Verificar integridade dos veículos
      await this.verifyVehiclesIntegrity(apiData.vehicles || [])

      // 3. Verificar integridade dos checklists
      await this.verifyChecklistsIntegrity(apiData.checklists || [])

      console.log("Verificação de integridade concluída com sucesso")
      this.dispatchEvent({ type: "progress", message: "Verificação de integridade concluída" })
    } catch (error) {
      console.error("Erro ao verificar integridade dos dados:", error)
      this.dispatchEvent({ type: "error", message: `Erro ao verificar integridade: ${error}` })
    }
  }

  // Verificar integridade dos modelos de checklist
  private async verifyTemplatesIntegrity(apiTemplates: any[]): Promise<void> {
    console.log("Verificando integridade dos modelos de checklist...")

    // Obter todos os modelos armazenados localmente
    const localTemplates = await offlineStorage.getAllItems("templates")

    // Criar um mapa dos modelos da API para facilitar a busca
    const apiTemplatesMap = new Map()
    apiTemplates.forEach((template) => {
      apiTemplatesMap.set(template.id.toString(), template)
    })

    // Verificar modelos locais que não existem mais na API
    const templatesToDelete = localTemplates.filter(
      (localTemplate) => !apiTemplatesMap.has(localTemplate.id.toString()) && localTemplate.fromApi === true,
    )

    // Excluir modelos que não existem mais na API
    if (templatesToDelete.length > 0) {
      console.log(`Excluindo ${templatesToDelete.length} modelos que não existem mais na API`)

      for (const template of templatesToDelete) {
        console.log(`Excluindo modelo: ${template.id} - ${template.title || template.name}`)
        await offlineStorage.removeItem("templates", template.id)
      }

      this.dispatchEvent({
        type: "progress",
        message: `${templatesToDelete.length} modelos obsoletos foram removidos`,
      })
    }
  }

  // Verificar integridade dos veículos
  private async verifyVehiclesIntegrity(apiVehicles: any[]): Promise<void> {
    console.log("Verificando integridade dos veículos...")

    // Obter todos os veículos armazenados localmente
    const localVehicles = await offlineStorage.getAllItems("vehicles")

    // Criar um mapa dos veículos da API para facilitar a busca
    const apiVehiclesMap = new Map()
    apiVehicles.forEach((vehicle) => {
      apiVehiclesMap.set(vehicle.id.toString(), vehicle)
    })

    // Verificar veículos locais que não existem mais na API
    const vehiclesToDelete = localVehicles.filter(
      (localVehicle) => !apiVehiclesMap.has(localVehicle.id.toString()) && localVehicle.fromApi === true,
    )

    // Excluir veículos que não existem mais na API
    if (vehiclesToDelete.length > 0) {
      console.log(`Excluindo ${vehiclesToDelete.length} veículos que não existem mais na API`)

      for (const vehicle of vehiclesToDelete) {
        console.log(`Excluindo veículo: ${vehicle.id} - ${vehicle.name}`)
        await offlineStorage.removeItem("vehicles", vehicle.id)
      }

      this.dispatchEvent({
        type: "progress",
        message: `${vehiclesToDelete.length} veículos obsoletos foram removidos`,
      })
    }
  }

  // Verificar integridade dos checklists
  private async verifyChecklistsIntegrity(apiChecklists: any[]): Promise<void> {
    console.log("Verificando integridade dos checklists...")

    // Obter todos os modelos e veículos para verificação de referências
    const localTemplates = await offlineStorage.getAllItems("templates")
    const localVehicles = await offlineStorage.getAllItems("vehicles")

    // Criar mapas para facilitar a busca
    const templatesMap = new Map()
    localTemplates.forEach((template) => {
      templatesMap.set(template.id.toString(), template)
    })

    const vehiclesMap = new Map()
    localVehicles.forEach((vehicle) => {
      vehiclesMap.set(vehicle.id.toString(), vehicle)
    })

    // Obter todos os checklists armazenados localmente
    const localChecklists = await offlineStorage.getAllItems("checklists")

    // Verificar checklists com referências inválidas
    const checklistsWithInvalidRefs = localChecklists.filter((checklist) => {
      // Verificar se o modelo de checklist ainda existe
      const templateId = checklist.template?.id?.toString()
      const templateExists = templateId ? templatesMap.has(templateId) : false

      // Verificar se o veículo ainda existe
      const vehicleId = checklist.vehicle?.id?.toString()
      const vehicleExists = vehicleId ? vehiclesMap.has(vehicleId) : false

      // Se o checklist veio da API e o modelo ou veículo não existe mais, marcar para exclusão
      if (checklist.fromApi === true) {
        return !templateExists || !vehicleExists
      }

      // Para checklists criados localmente, verificar apenas se não estão sincronizados
      // Se não estiver sincronizado e tiver referências inválidas, marcar para exclusão
      if (!checklist.synced) {
        return !templateExists || !vehicleExists
      }

      // Se estiver sincronizado, não marcar para exclusão mesmo com referências inválidas
      return false
    })

    // Excluir checklists com referências inválidas
    if (checklistsWithInvalidRefs.length > 0) {
      console.log(`Excluindo ${checklistsWithInvalidRefs.length} checklists com referências inválidas`)

      for (const checklist of checklistsWithInvalidRefs) {
        console.log(`Excluindo checklist: ${checklist.id} - ${checklist.title || checklist.template?.title}`)
        await offlineStorage.removeItem("checklists", checklist.id)
      }

      this.dispatchEvent({
        type: "progress",
        message: `${checklistsWithInvalidRefs.length} checklists com referências inválidas foram removidos`,
      })
    }
  }

  // Função auxiliar para verificar se o dispositivo está online
  private isOnline(): boolean {
    return typeof navigator !== "undefined" && navigator.onLine
  }

  // Adicionar métodos auxiliares para extrair informações dos checklists da API
  // Adicione os métodos extractChecklistItems, extractVehicleInfo e extractResponses como públicos
  // para que possam ser usados no hook de autenticação

  // Altere de private para public
  public extractChecklistItems(apiChecklist: any): any[] {
    // If the checklist has flowData with data items, extract from there
    if (
      apiChecklist.flowData &&
      Array.isArray(apiChecklist.flowData) &&
      apiChecklist.flowData.length > 0 &&
      apiChecklist.flowData[0].data &&
      Array.isArray(apiChecklist.flowData[0].data)
    ) {
      return apiChecklist.flowData[0].data.map((item: any) => ({
        id: item.itemId?.toString() || "",
        question: item.itemName || "Pergunta sem texto",
        type: this.mapAnswerTypeToAppType(item.answerTypeId),
        requiresPhoto: item.requiredImage || false,
        requiredImage: item.requiredImage || false,
        requiresAudio: item.requiredAudio || false,
        requiredAudio: item.requiredAudio || false,
        requiresObservation: item.requiredObservation || false,
        requiredObservation: item.requiredObservation || false,
        answerTypeId: item.answerTypeId, // Ensure answerTypeId is passed
        answerValues: this.getAnswerValuesFromItem(item),
        fromApi: true, // Marcar como vindo da API
      }))
    }

    // If there are items directly in the model
    if (apiChecklist.model?.items && Array.isArray(apiChecklist.model.items)) {
      return apiChecklist.model.items.map((item: any) => ({
        id: item.id?.toString() || "",
        question: item.name || "Pergunta sem texto",
        type: this.mapAnswerTypeToAppType(item.answerTypeId),
        requiresPhoto: item.requiredImage || false,
        requiredImage: item.requiredImage || false,
        requiresAudio: item.requiredAudio || false,
        requiredAudio: item.requiredAudio || false,
        requiresObservation: item.requiredObservation || false,
        requiredObservation: item.requiredObservation || false,
        answerTypeId: item.answerTypeId, // Ensure answerTypeId is passed
        answerValues: this.getAnswerValuesFromItem(item),
        fromApi: true, // Marcar como vindo da API
      }))
    }

    // If we don't have any of the above, return empty array
    return []
  }

  // Altere de private para public
  public extractVehicleInfo(apiChecklist: any): any {
    // Extrair informações do veículo do checklist
    if (
      apiChecklist.vehicleData &&
      Array.isArray(apiChecklist.vehicleData) &&
      apiChecklist.vehicleData.length > 0 &&
      apiChecklist.vehicleData[0].vehicle
    ) {
      const vehicleData = apiChecklist.vehicleData[0]
      return {
        id: vehicleData.vehicle.id?.toString() || "",
        name: vehicleData.vehicle.name || "Veículo sem nome",
        licensePlate: vehicleData.vehicle.plate || "Sem placa",
      }
    }

    // Se não tiver informações do veículo, retornar objeto vazio
    return {
      id: "",
      name: "Veículo não especificado",
      licensePlate: "Sem placa",
    }
  }

  // Altere de private para public
  public extractResponses(apiChecklist: any): any {
    // Extrair respostas do checklist
    const responses: any = {}

    if (
      apiChecklist.flowData &&
      Array.isArray(apiChecklist.flowData) &&
      apiChecklist.flowData.length > 0 &&
      apiChecklist.flowData[0].data &&
      Array.isArray(apiChecklist.flowData[0].data)
    ) {
      // Inicializar estruturas para fotos e áudios
      responses.photos = {}
      responses.audios = {}

      apiChecklist.flowData[0].data.forEach((item: any) => {
        // Converter a resposta para o formato esperado pelo aplicativo
        if (item.answer === "true") {
          responses[item.itemId] = true
        } else if (item.answer === "false") {
          responses[item.itemId] = false
        } else {
          responses[item.itemId] = item.answer
        }

        // Se tiver observações, adicionar
        if (item.observations) {
          responses[`${item.itemId}-observation`] = item.observations
        }

        // Processar fotos
        if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
          // Criar array para as fotos deste item se ainda não existir
          if (!responses.photos[item.itemId]) {
            responses.photos[item.itemId] = []
          }

          // Adicionar URLs de fotos (em um app real, estas seriam URLs para as imagens no servidor)
          item.photos.forEach((photo: any) => {
            if (photo.photoBase64) {
              // Em um app real, você usaria a URL da imagem no servidor
              // Aqui estamos simulando com um data URL
              const dataUrl = `data:image/jpeg;base64,${photo.photoBase64}`
              responses.photos[item.itemId].push(dataUrl)
            }
          })
        }

        // Processar áudios
        if (item.audios && Array.isArray(item.audios) && item.audios.length > 0) {
          // Criar array para os áudios deste item se ainda não existir
          if (!responses.audios[item.itemId]) {
            responses.audios[item.itemId] = []
          }

          // Adicionar URLs de áudios (em um app real, estas seriam URLs para os áudios no servidor)
          item.audios.forEach((audio: any) => {
            if (audio.audioBase64) {
              // Em um app real, você usaria a URL do áudio no servidor
              // Aqui estamos simulando com um data URL
              const dataUrl = `data:audio/mp3;base64,${audio.audioBase64}`
              responses.audios[item.itemId].push(dataUrl)
            }
          })
        }
      })
    }

    return responses
  }

  // Altere de private para public
  public mapAnswerTypeToAppType(answerTypeId: any): string {
    // Se o item tiver um tipo de resposta específico, usá-lo
    if (answerTypeId) {
      switch (answerTypeId) {
        case 1:
          return "boolean"
        case 2:
          return "condition"
        case 3:
          return "fuel"
        case 4:
          return "text"
        case 5:
          return "select" // Changed from "audio" to "select"
        default:
          return "text"
      }
    }

    return "text" // Fallback para texto
  }

  // Add this new helper method for answer values
  // Altere de private para public
  public getAnswerValuesFromItem(item: any): string[] {
    // If the item has answer.answerValues, use those
    if (item.answer && item.answer.answerValues && Array.isArray(item.answer.answerValues)) {
      return item.answer.answerValues
    }

    // If the item has answerValues directly, use those
    if (item.answerValues && Array.isArray(item.answerValues)) {
      return item.answerValues
    }

    // Default values by answer type
    switch (item.answerTypeId) {
      case 1: // Sim/Não
        return ["Sim", "Não"]
      case 2: // Bom/Regular/Ruim
        return ["Ótimo", "Bom", "Regular", "Ruim"]
      case 3: // Litragem
        return ["Cheio", "1/4", "1/2", "3/4", "Vazio"]
      case 5: // OK/Não OK
        return ["OK", "Não OK"]
      default:
        return []
    }
  }

  // Melhore o método performIncrementalSync para lidar melhor com erros durante a sincronização
  async performIncrementalSync(): Promise<boolean> {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return false
    }

    if (this.isSyncing || !navigator.onLine) {
      return false
    }

    try {
      this.isSyncing = true
      this.dispatchEvent({ type: "start", message: "Iniciando sincronização incremental" })

      const pendingSyncs = await offlineStorage.getPendingSyncs()
      this.dispatchEvent({
        type: "progress",
        message: `Sincronizando ${pendingSyncs.length} item(s)`,
        data: { total: pendingSyncs.length, current: 0 },
      })

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < pendingSyncs.length; i++) {
        const sync = pendingSyncs[i]

        try {
          // Verificar se este item já está sendo sincronizado
          const syncKey = `${sync.type}_${sync.itemId}`
          if (this.syncInProgress.has(syncKey)) {
            console.log(`Item ${syncKey} já está sendo sincronizado, pulando...`)
            continue
          }

          // Marcar como em sincronização
          this.syncInProgress.add(syncKey)

          if (sync.type === "checklists") {
            const checklist = await offlineStorage.getItem("checklists", sync.itemId)

            if (!checklist) {
              console.warn(`Checklist ${sync.itemId} não encontrado, marcando como sincronizado`)
              await offlineStorage.markAsSynced(sync.id)
              this.syncInProgress.delete(syncKey)
              continue
            }

            if (sync.operation === "create" || sync.operation === "update") {
              try {
                console.log(`Sincronizando checklist ${sync.itemId}...`)

                // Verificar se o checklist já está marcado como sincronizado
                if (checklist.synced) {
                  console.log(`Checklist ${sync.itemId} já está marcado como sincronizado, pulando...`)
                  await offlineStorage.markAsSynced(sync.id)
                  this.syncInProgress.delete(syncKey)
                  continue
                }

                // Desativar explicitamente o modo mockado
                if (typeof apiService.setMockMode === "function") {
                  apiService.setMockMode(false)
                }

                // Adicionar logs detalhados antes de enviar
                console.log(`Enviando checklist ${sync.itemId} para API:`, {
                  templateId: checklist.template?.id,
                  vehicleId: checklist.vehicle?.id,
                  flowStep: checklist.flowStep || 1,
                  hasResponses: !!checklist.responses,
                  responseKeys: checklist.responses ? Object.keys(checklist.responses).length : 0,
                })

                const result = await apiService.submitChecklist(checklist)

                console.log(`Resultado do envio do checklist ${sync.itemId}:`, result)

                // Atualizar o checklist como sincronizado
                checklist.synced = true
                await offlineStorage.saveItem("checklists", checklist)
                successCount++

                console.log(`Checklist ${sync.itemId} marcado como sincronizado com sucesso`)
              } catch (submitError) {
                console.error(`Erro ao enviar checklist ${sync.itemId}:`, submitError)

                // Verificar se o erro é relacionado a problemas de rede
                const errorMessage = submitError instanceof Error ? submitError.message : String(submitError)
                const isNetworkError =
                  errorMessage.includes("Failed to fetch") ||
                  errorMessage.includes("Network") ||
                  errorMessage.includes("CORS") ||
                  errorMessage.includes("timeout")

                if (isNetworkError) {
                  // Para erros de rede, não marcar como sincronizado para tentar novamente mais tarde
                  console.log(`Erro de rede ao sincronizar checklist ${sync.itemId}, será tentado novamente mais tarde`)
                  this.syncInProgress.delete(syncKey)
                  throw submitError
                } else {
                  // Para outros erros, marcar como sincronizado para evitar tentativas repetidas
                  console.warn(`Marcando checklist ${sync.itemId} como sincronizado apesar do erro: ${errorMessage}`)
                  checklist.synced = true
                  await offlineStorage.saveItem("checklists", checklist)
                  errorCount++
                }
              }
            } else if (sync.operation === "delete") {
              // Não há suporte para exclusão na API, então apenas removemos localmente
              console.log("Exclusão de checklist não suportada na API, removendo localmente")
            }
          }

          // Marcar como sincronizado
          await offlineStorage.markAsSynced(sync.id)

          // Remover da lista de sincronização em andamento
          this.syncInProgress.delete(syncKey)

          this.dispatchEvent({
            type: "progress",
            message: `Sincronizado ${i + 1} de ${pendingSyncs.length}`,
            data: { total: pendingSyncs.length, current: i + 1 },
          })
        } catch (error) {
          console.error(`Erro ao sincronizar item ${sync.itemId}:`, error)
          this.dispatchEvent({
            type: "error",
            message: `Erro ao sincronizar item ${sync.itemId}: ${error}`,
          })

          // Remover da lista de sincronização em andamento mesmo em caso de erro
          const syncKey = `${sync.type}_${sync.itemId}`
          this.syncInProgress.delete(syncKey)
          errorCount++

          // Se houver um erro, incrementar o contador de tentativas e tentar novamente mais tarde
          this.retryCount++
          if (this.retryCount >= this.maxRetries) {
            console.warn("Número máximo de tentativas atingido. Abortando sincronização.")
            this.dispatchEvent({
              type: "error",
              message: "Número máximo de tentativas atingido. Abortando sincronização.",
            })
            break
          }
        }
      }

      this.setLastSyncTime(new Date())

      // Mensagem de conclusão com detalhes sobre sucessos e erros
      const completionMessage =
        errorCount > 0
          ? `Sincronização concluída: ${successCount} item(s) com sucesso, ${errorCount} com erro`
          : "Sincronização incremental concluída"

      this.dispatchEvent({ type: "complete", message: completionMessage })
      this.retryCount = 0
      return true
    } catch (error) {
      console.error("Erro durante a sincronização incremental:", error)
      this.dispatchEvent({ type: "error", message: `Erro na sincronização incremental: ${error}` })
      return false
    } finally {
      this.isSyncing = false
      // Limpar a lista de sincronização em andamento
      this.syncInProgress.clear()
    }
  }

  // Implementação do método checkAndSync
  // Modifique o método checkAndSync para usar a lógica de timestamp
  async checkAndSync(): Promise<boolean> {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return false
    }

    // Se já estiver sincronizando ou estiver offline, não fazer nada
    if (this.isSyncing || !navigator.onLine) {
      return false
    }

    try {
      // Verificar se há sincronizações pendentes
      const pendingSyncs = await offlineStorage.getPendingSyncs()

      // Se houver sincronizações pendentes, fazer sincronização incremental
      if (pendingSyncs.length > 0) {
        return this.performIncrementalSync()
      } else {
        // Se não houver sincronizações pendentes, verificar se é necessário fazer sincronização
        const lastSyncTime = this.getLastSyncTime()
        const now = new Date()
        const lastSyncType = localStorage.getItem("last_sync_type")

        // Verificar se já houve uma sincronização completa anteriormente
        const hasCompletedFullSync = lastSyncType === "full"

        // Condições para sincronização completa:
        // 1. Nunca sincronizou antes
        // 2. A última sincronização foi há mais de 24 horas
        // 3. Nunca fez uma sincronização completa
        if (!lastSyncTime || now.getTime() - lastSyncTime.getTime() > 24 * 60 * 60 * 1000 || !hasCompletedFullSync) {
          return this.performInitialSync(false) // Sincronização completa
        }
        // Condições para sincronização incremental:
        // 1. Já fez uma sincronização completa
        // 2. A última sincronização foi há mais de 15 minutos
        else if (hasCompletedFullSync && now.getTime() - lastSyncTime.getTime() > 15 * 60 * 1000) {
          return this.performInitialSync(true) // Sincronização incremental com timestamp
        }

        // Se não precisar sincronizar, retornar true
        return true
      }
    } catch (error) {
      console.error("Erro ao verificar sincronização:", error)
      return false
    }
  }

  // Implementação do método forceSyncNow
  // Modifique o método forceSyncNow para usar a lógica de timestamp
  async forceSyncNow(): Promise<boolean> {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return false
    }

    // Se já estiver sincronizando ou estiver offline, não fazer nada
    if (this.isSyncing || !navigator.onLine) {
      console.log("Não é possível sincronizar: já está sincronizando ou está offline")
      return false
    }

    console.log("Método forceSyncNow chamado!")

    try {
      // Desativar explicitamente o modo mockado para garantir que estamos usando a API real
      const apiServiceInstance = (window as any).apiService || apiService
      if (apiServiceInstance) {
        console.log("Desativando modo mockado")
        apiServiceInstance.setMockMode(false)
      }

      // Verificar se há sincronizações pendentes
      const pendingSyncs = await offlineStorage.getPendingSyncs()
      console.log(`Verificando sincronizações pendentes: ${pendingSyncs.length} encontradas`)

      // Disparar evento de início de sincronização
      this.dispatchEvent({
        type: "start",
        message:
          pendingSyncs.length > 0
            ? `Iniciando sincronização de ${pendingSyncs.length} item(s)`
            : "Iniciando sincronização",
      })

      // Se houver sincronizações pendentes, fazer sincronização incremental
      if (pendingSyncs.length > 0) {
        console.log("Executando sincronização incremental para itens pendentes")
        return this.performIncrementalSync()
      } else {
        // Verificar se já houve uma sincronização completa
        const lastSyncType = localStorage.getItem("last_sync_type")
        const hasCompletedFullSync = lastSyncType === "full"

        // Obter o timestamp da última sincronização
        const lastSyncTime = this.getLastSyncTime()

        // Log para depuração
        console.log("Forçando sincronização com timestamp:", lastSyncTime ? lastSyncTime.toISOString() : "nenhum")
        console.log("Tipo da última sincronização:", lastSyncType || "nenhuma")

        // Se já fez uma sincronização completa, fazer incremental com timestamp
        if (hasCompletedFullSync) {
          console.log("Executando sincronização incremental com timestamp")
          // Garantir que o timestamp seja passado, mesmo que seja null
          return this.performInitialSync(true) // Sincronização incremental
        } else {
          console.log("Executando sincronização completa (primeira vez)")
          // Se nunca fez uma sincronização completa, fazer completa
          return this.performInitialSync(false) // Sincronização completa
        }
      }
    } catch (error) {
      console.error("Erro ao forçar sincronização:", error)
      this.dispatchEvent({ type: "error", message: `Erro ao forçar sincronização: ${error}` })
      return false
    }
  }

  // Implementação do método forceFullSync
  // Modifique o método forceFullSync para registrar o tipo de sincronização
  async forceFullSync(): Promise<boolean> {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") {
      return false
    }

    // Verificar se já existe uma sincronização em andamento
    const syncInProgress = localStorage.getItem("sync_in_progress")
    if (syncInProgress) {
      console.warn("Já existe uma sincronização em andamento. Aguardando conclusão...")
      return false
    }

    // Forçar uma sincronização completa, independentemente do estado atual
    if (this.isSyncing) {
      console.warn("Já existe uma sincronização em andamento. Aguarde a conclusão.")
      return false
    }

    if (!navigator.onLine) {
      console.warn("Dispositivo offline. Não é possível realizar sincronização completa.")
      this.dispatchEvent({
        type: "error",
        message: "Dispositivo offline. Não é possível realizar sincronização completa.",
      })
      return false
    }

    try {
      // Marcar que uma sincronização está em andamento
      localStorage.setItem("sync_in_progress", "true")

      // Remover o timestamp da última sincronização para forçar uma sincronização completa
      localStorage.removeItem("last_sync_time")
      this.lastSyncTime = null

      // Realizar sincronização completa
      const result = await this.performInitialSync(false)

      // Se a sincronização foi bem-sucedida, registrar como sincronização completa
      if (result) {
        localStorage.setItem("last_sync_type", "full")
      }

      // Remover o flag de sincronização em andamento
      localStorage.removeItem("sync_in_progress")

      return result
    } catch (error) {
      console.error("Erro ao forçar sincronização completa:", error)
      this.dispatchEvent({ type: "error", message: `Erro ao forçar sincronização completa: ${error}` })

      // Remover o flag de sincronização em andamento mesmo em caso de erro
      localStorage.removeItem("sync_in_progress")

      return false
    }
  }
}

export const syncService = new SyncService()
