// Adicione esta importação no topo do arquivo
import { dispatchApiError } from "@/components/api-error-handler"

// Adicionar importações do arquivo de configuração
import { API_BASE_URL, buildApiUrl, API_ENDPOINTS } from "@/lib/api-config"
import { STORAGE_KEYS } from "@/lib/constants"

// Serviço para comunicação com a API Frota Certa
export class ApiService {
  private baseUrl: string
  private authToken: string | null = null
  private useMockData = false
  private clientId = "" // Initialize as empty string

  // Adicionar uma flag para monitorar se já estamos fazendo requisição para getAllAppData
  private isGettingAllAppData = false

  // Atualizar o construtor para usar as configurações
  constructor(baseUrl?: string, clientId?: string) {
    // Se não houver baseUrl, usar a configuração padrão
    this.baseUrl = baseUrl || API_BASE_URL

    // Priorizar clientId do localStorage se disponível
    if (typeof window !== "undefined") {
      const storedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID)
      if (storedClientId && storedClientId.trim() !== "") {
        this.clientId = storedClientId
      } else if (clientId) {
        // Se não houver no localStorage mas for fornecido como parâmetro
        this.clientId = clientId
      }
    } else if (clientId) {
      // Se não estiver no navegador mas for fornecido como parâmetro
      this.clientId = clientId
    }

    console.log("ApiService inicializado com:", {
      baseUrl: this.baseUrl,
      clientId: this.clientId,
      useMockData: this.useMockData,
    })
  }

  // Configurar o ID do cliente
  setClientId(clientId: string) {
    if (!clientId || clientId.trim() === "") {
      // Em produção, nunca usar um valor padrão
      if (process.env.NODE_ENV === "production") {
        console.error("Tentativa de definir clientId vazio em ambiente de produção")
        throw new Error("ID do Cliente é obrigatório")
      } else {
        // Apenas em desenvolvimento, usar um valor padrão com aviso
        console.warn("Tentativa de definir clientId vazio, usando valor temporário apenas para desenvolvimento")
        clientId = "dev-client"
      }
    }

    console.log(`Alterando clientId para: ${clientId}`)
    this.clientId = clientId

    // Salvar no localStorage apenas se for um valor válido
    if (typeof window !== "undefined" && clientId && clientId.trim() !== "") {
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId)

      // Disparar um evento para notificar outros componentes sobre a mudança
      window.dispatchEvent(new CustomEvent("client-id-changed", { detail: clientId }))
    }

    return clientId
  }

  // Obter o ID do cliente
  getClientId(): string {
    // Primeiro, verificar no localStorage
    if (typeof window !== "undefined") {
      const storedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID)

      if (storedClientId && storedClientId.trim() !== "") {
        this.clientId = storedClientId
        return storedClientId
      }
    }

    // Se não encontrou no localStorage e não temos um clientId definido, isso é um erro
    if (!this.clientId || this.clientId.trim() === "") {
      console.error("Client ID não encontrado")
      // Disparar um evento de erro de API para que o usuário seja redirecionado para login
      if (typeof window !== "undefined") {
        dispatchApiError("ID do Cliente não encontrado. Por favor, faça login novamente.", 401, true)
      }
      throw new Error("ID do Cliente não encontrado")
    }

    return this.clientId
  }

  // Configurar token de autenticação
  setAuthToken(token: string) {
    this.authToken = token
    localStorage.setItem("auth_token", token)
  }

  // Recuperar token de autenticação
  getAuthToken(): string | null {
    if (this.authToken) {
      return this.authToken
    }
    const token = localStorage.getItem("auth_token")
    return token
  }

  // Atualizar o método fetchWithAuth para usar a função buildApiUrl
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Se estiver em modo mock, lançar erro específico
    if (this.useMockData) {
      console.log("Modo mock ativado, lançando erro MOCK_MODE")
      throw new Error("MOCK_MODE")
    }

    const token = this.getAuthToken()
    console.log("Token de autenticação:", token ? "Presente" : "Ausente")

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }

    try {
      // Usar a função buildApiUrl para construir a URL corretamente
      const url = buildApiUrl(this.baseUrl, endpoint)
      console.log("Fazendo requisição para:", url)
      console.log("Método:", options.method || "GET")
      console.log("Headers:", JSON.stringify(headers))

      if (options.body) {
        console.log("Body (resumo):", options.body.toString().substring(0, 100) + "...")
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      console.log("Resposta recebida:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
      })

      if (response.status === 401) {
        // Token expirado ou inválido
        console.error("Token expirado ou inválido (401)")
        this.authToken = null
        localStorage.removeItem("auth_token")
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }

      return response
    } catch (error) {
      console.error(`Erro ao acessar ${endpoint}:`, error)
      throw error
    }
  }

  // Substitua o método handleApiResponse existente por este:
  private async handleApiResponse(response: Response, errorMessage: string): Promise<any> {
    if (!response.ok) {
      // Tentar extrair mensagem de erro da resposta
      let errorDetail = ""
      try {
        const errorData = await response.json()
        errorDetail = errorData.message || errorData.error || JSON.stringify(errorData)
      } catch (e) {
        // Se não conseguir extrair JSON, usar o texto da resposta
        try {
          errorDetail = await response.text()
        } catch (textError) {
          errorDetail = `Status: ${response.status}`
        }
      }

      const fullErrorMessage = `${errorMessage}: ${errorDetail}`

      // Verificar se é um erro de autenticação
      const isAuthError = response.status === 401 || response.status === 403

      // Disparar evento de erro de API
      dispatchApiError(fullErrorMessage, response.status, isAuthError)

      throw new Error(fullErrorMessage)
    }

    return response.json()
  }

  // Atualizar o método login para usar os endpoints configurados
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const clientId = this.getClientId()
      // Usar a função buildApiUrl e o endpoint configurado
      const url = buildApiUrl(this.baseUrl, API_ENDPOINTS.login(clientId))
      console.log("Fazendo login em:", url)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: username,
          password: password,
        }),
      })

      const data = await this.handleApiResponse(response, "Falha na autenticação")

      // Extrair o token do cabeçalho de resposta ou do corpo
      const token = data.token || response.headers.get("Authorization")?.replace("Bearer ", "") || ""

      if (!token) {
        throw new Error("Token não encontrado na resposta")
      }

      this.setAuthToken(token)
      return { token, user: data }
    } catch (error) {
      console.error("Erro de login:", error)
      throw error
    }
  }

  // Método para renovar o token de autenticação
  async refreshToken(): Promise<{ token: string; user?: any }> {
    try {
      // Verificar se o dispositivo está online
      const isOnline = typeof navigator !== "undefined" && navigator.onLine

      // Obter o token atual
      const token = this.getAuthToken()

      if (!token) {
        throw new Error("Não há token para renovar")
      }

      // Se estiver offline, simular renovação do token
      if (!isOnline) {
        console.log("Dispositivo offline. Simulando renovação de token...")
        return { token, user: null }
      }

      // Verificar se o endpoint de refresh token está disponível
      // Como não temos o endpoint disponível, vamos usar uma abordagem alternativa

      // Opção 1: Simular renovação do token (usar o mesmo token)
      console.log("Endpoint de refresh token não disponível. Usando token atual como fallback.")

      // Registrar a renovação simulada
      localStorage.setItem("token_refresh_simulated", new Date().toISOString())

      // Retornar o mesmo token como se fosse renovado
      return { token, user: null }

      /* 
      // Opção 2: Quando o endpoint estiver disponível no futuro, descomente este código
      const clientId = this.getClientId();
      const response = await fetch(`${this.baseUrl}/${clientId}/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await this.handleApiResponse(response, "Falha ao renovar token");

      // Extrair o novo token
      const newToken = data.token || response.headers.get("Authorization")?.replace("Bearer ", "") || "";

      if (!newToken) {
        throw new Error("Novo token não encontrado na resposta");
      }

      this.setAuthToken(newToken);
      return { token: newToken, user: data.user };
      */
    } catch (error) {
      console.error("Erro ao renovar token:", error)

      // Se estiver offline, não propagar o erro
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.log("Dispositivo offline. Usando token atual como fallback.")
        const token = this.getAuthToken()
        if (token) {
          return { token, user: null }
        }
      }

      throw error
    }
  }

  // Atualizar o método getChecklistTemplates
  async getChecklistTemplates(additionalParams = ""): Promise<any[]> {
    // Verificar se já temos os dados de SyncDataApp em cache
    const cacheKey = "appData_default_full"
    const cachedData = sessionStorage.getItem(cacheKey)

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        const now = Date.now()

        // Usar cache se tiver menos de 5 minutos
        if (now - timestamp < 5 * 60 * 1000 && data.models && Array.isArray(data.models)) {
          console.log("Usando modelos do cache SyncDataApp em vez de fazer chamada para checklistModel")
          return data.models.map((model: any) => ({
            ...model,
            id: model.id?.toString() || Math.random().toString(36).substring(2, 9),
            title: model.name || "Modelo sem nome",
            description: model.description || "Sem descrição",
          }))
        }
      } catch (e) {
        console.error("Erro ao ler cache:", e)
      }
    }

    try {
      // Se não temos cache ou não podemos usá-lo, fazer a chamada API
      console.log("AVISO: Fazendo chamada para getChecklistTemplates - isso deve ser evitado")

      const clientId = this.getClientId()
      // Usar o endpoint configurado com parâmetros adicionais
      let endpoint = API_ENDPOINTS.checklistModels(clientId)

      // Adicionar parâmetros adicionais se fornecidos
      if (additionalParams) {
        // Check if the endpoint already has query parameters
        if (endpoint.includes("?")) {
          endpoint += additionalParams
            ? `&${additionalParams.startsWith("&") ? additionalParams.substring(1) : additionalParams}`
            : ""
        } else {
          endpoint += additionalParams
            ? `?${additionalParams.startsWith("?") ? additionalParams.substring(1) : additionalParams.startsWith("&") ? additionalParams.substring(1) : additionalParams}`
            : ""
        }
      }

      console.log("Buscando templates com endpoint:", endpoint)

      const response = await this.fetchWithAuth(endpoint)

      const responseData = await this.handleApiResponse(response, "Falha ao buscar modelos de checklist")

      // Log detalhado da resposta para depuração
      console.log("Resposta da API de modelos de checklist:", JSON.stringify(responseData, null, 2))

      // Verificar se a resposta é um array ou se contém um array em alguma propriedade
      let models = responseData

      // Se a resposta não for um array, mas um objeto, tente encontrar o array de modelos
      if (responseData && !Array.isArray(responseData)) {
        // Verificar propriedades comuns que podem conter o array de modelos
        if (responseData.data && Array.isArray(responseData.data)) {
          models = responseData.data
        } else if (responseData.models && Array.isArray(responseData.models)) {
          models = responseData.models
        } else if (responseData.items && Array.isArray(responseData.items)) {
          models = responseData.items
        } else if (responseData.results && Array.isArray(responseData.results)) {
          models = responseData.results
        } else {
          // Se não encontrar um array, retornar um array vazio
          console.warn("Resposta da API não contém um array de modelos reconhecível:", responseData)
          return []
        }
      }

      // Verificar se models é um array antes de usar map
      if (!Array.isArray(models)) {
        console.warn("Dados de modelos não são um array:", models)
        return []
      }

      // Adaptar o formato dos modelos para o formato esperado pelo aplicativo
      return models.map((model: any) => {
        // Log para depuração dos dados originais
        console.log("Modelo original da API:", model)

        // Preservar a estrutura original do grupo
        const group = model.group || null

        return {
          id: model.id?.toString() || Math.random().toString(36).substring(2, 9),
          name: model.name || "Modelo sem nome",
          title: model.name || "Modelo sem nome", // Manter compatibilidade com código existente
          description: model.description || "Sem descrição",
          // Preservar a estrutura completa do grupo
          group: group,
          // Manter campos legados para compatibilidade
          iconName: group?.icon || "icon_1",
          color: group?.color || "color_1",
          estimatedTime: "5-10 min",
          items: Array.isArray(model.items)
            ? model.items.map((item: any) => ({
                id: item.id?.toString() || Math.random().toString(36).substring(2, 9),
                question: item.name || "Pergunta sem texto", // Mapear name para question
                name: item.name || "Pergunta sem texto", // Manter o campo original
                type: this.mapAnswerTypeToAppType(item.answerTypeId || 1),
                requiresPhoto: item.requiredImage || false,
                requiresAudio: item.requiredAudio || false,
                requiresObservation: item.requiredObservation || false,
              }))
            : [],
        }
      })
    } catch (error: any) {
      console.error("Erro ao buscar modelos de checklist:", error)
      // Em caso de erro, retornar um array vazio em vez de propagar o erro
      return []
    }
  }

  // Novo método para obter detalhes de um modelo de checklist específico
  async getChecklistTemplateDetails(templateId: string | number): Promise<any> {
    try {
      const clientId = this.getClientId()
      // Construir o endpoint para detalhes do modelo
      const endpoint = `${clientId}/checklistModel/details?Id=${templateId}&showDeleted=false&sortDir=ASC&pageSize=10&pageNumber=1`

      console.log("Buscando detalhes do modelo com endpoint:", endpoint)

      const response = await this.fetchWithAuth(endpoint)
      const responseData = await this.handleApiResponse(response, `Falha ao buscar detalhes do modelo ${templateId}`)

      // Log detalhado da resposta para depuração
      console.log("Resposta da API de detalhes do modelo:", JSON.stringify(responseData, null, 2))

      // A resposta é um array com um único item
      if (Array.isArray(responseData) && responseData.length > 0) {
        const modelDetails = responseData[0]

        // Adaptar o formato para o esperado pelo aplicativo
        return {
          id: modelDetails.id?.toString() || templateId.toString(),
          name: modelDetails.name || "Modelo sem nome",
          title: modelDetails.name || "Modelo sem nome", // Manter compatibilidade
          description: modelDetails.description || "Sem descrição",
          group: modelDetails.group || null,
          iconName: modelDetails.group?.icon || "icon_1",
          color: modelDetails.group?.color || "color_1",
          estimatedTime: "5-10 min",
          items: Array.isArray(modelDetails.items)
            ? modelDetails.items.map((item: any) => ({
                id: item.id?.toString(),
                question: item.name,
                name: item.name,
                type: this.mapAnswerTypeToAppType(item.answerTypeId),
                requiresPhoto: item.requiredImage || false,
                requiresAudio: item.requiredAudio || false,
                requiresObservation: item.requiredObservation || false,
                answerTypeId: item.answerTypeId,
                answerOptions: item.answer?.answerValues || [],
                answerType: item.answer?.type || "text",
                itemTag: item.itemTag || "",
              }))
            : [],
        }
      } else {
        throw new Error(`Modelo com ID ${templateId} não encontrado`)
      }
    } catch (error: any) {
      console.error(`Erro ao buscar detalhes do modelo ${templateId}:`, error)
      throw error
    }
  }

  // Atualizar o método getVehicles
  async getVehicles(additionalParams = ""): Promise<any[]> {
    try {
      const clientId = this.getClientId()
      // Usar o endpoint configurado com parâmetros adicionais
      let endpoint = API_ENDPOINTS.vehicles(clientId)

      // Adicionar parâmetros adicionais se fornecidos
      if (additionalParams) {
        // Check if the endpoint already has query parameters
        if (endpoint.includes("?")) {
          endpoint += additionalParams
            ? `&${additionalParams.startsWith("&") ? additionalParams.substring(1) : additionalParams}`
            : ""
        } else {
          endpoint += additionalParams
            ? `?${additionalParams.startsWith("?") ? additionalParams.substring(1) : additionalParams.startsWith("&") ? additionalParams.substring(1) : additionalParams}`
            : ""
        }
      }

      console.log("Buscando veículos com endpoint:", endpoint)

      const response = await this.fetchWithAuth(endpoint)

      const responseData = await this.handleApiResponse(response, "Falha ao buscar veículos")

      // Log detalhado da resposta para depuração
      console.log("Resposta da API de veículos:", JSON.stringify(responseData, null, 2))

      // Verificar se a resposta é um array ou se contém um array em alguma propriedade
      let vehicles = responseData

      // Se a resposta não for um array, mas um objeto, tente encontrar o array de veículos
      if (responseData && !Array.isArray(responseData)) {
        // Verificar propriedades comuns que podem conter o array de veículos
        if (responseData.data && Array.isArray(responseData.data)) {
          vehicles = responseData.data
        } else if (responseData.vehicles && Array.isArray(responseData.vehicles)) {
          vehicles = responseData.vehicles
        } else if (responseData.items && Array.isArray(responseData.items)) {
          vehicles = responseData.items
        } else if (responseData.results && Array.isArray(responseData.results)) {
          vehicles = responseData.results
        } else {
          // Se não encontrar um array, retornar um array vazio
          console.warn("Resposta da API não contém um array de veículos reconhecível:", responseData)
          return []
        }
      }

      // Verificar se vehicles é um array antes de usar map
      if (!Array.isArray(vehicles)) {
        console.warn("Dados de veículos não são um array:", vehicles)
        return []
      }

      // Adaptar o formato dos veículos para o formato esperado pelo aplicativo
      const mappedVehicles = vehicles.map((vehicle: any) => {
        // Log individual vehicle data for debugging
        console.log("Vehicle data from API:", vehicle)

        return {
          id: vehicle.id?.toString() || Math.random().toString(36).substring(2, 9),
          name: vehicle.name || vehicle.description || "Veículo sem nome",
          // Ensure we capture the license plate from all possible field names
          licensePlate: vehicle.plate || vehicle.licensePlate || "",
          // Keep the original plate field if it exists
          plate: vehicle.plate || vehicle.licensePlate || "",
          fleetNumber: vehicle.fleetNumber || vehicle.fleet_number || vehicle.fleet || "",
          status: vehicle.status || "available", // Ajuste conforme necessário
        }
      })

      // Log the mapped vehicles for debugging
      console.log("Mapped vehicles:", mappedVehicles)

      return mappedVehicles
    } catch (error: any) {
      console.error("Erro ao buscar veículos:", error)
      // Em caso de erro, retornar um array vazio em vez de propagar o erro
      return []
    }
  }

  // Atualizar o método submitChecklist para usar os endpoints configurados
  async submitChecklist(checklist: any): Promise<any> {
    try {
      // Log para debug
      await this.logChecklistData(checklist)

      // Adaptar o formato do checklist para o formato esperado pela API
      const clientId = this.getClientId()

      // Obter o ID do usuário logado
      const userData = localStorage.getItem("user_data")
      const user = userData ? JSON.parse(userData) : null
      const userId = user?.userId || 1013

      // Usar a data de submissão do checklist ou a data atual
      const submissionDate = checklist.submittedAt || new Date().toISOString()

      // Determinar o flowSize e flowStep
      const flowSize = checklist.template?.flowSize || checklist.flowSize || 1
      const flowStep = checklist.flowStep || 1

      // Obter a quilometragem do veículo (se disponível)
      const vehicleKm = checklist.responses?.vehicleKilometer
        ? Number.parseInt(checklist.responses.vehicleKilometer.replace(/\D/g, ""), 10)
        : 0

      // Verificar e garantir que temos um nome válido para o checklist
      const checklistName = checklist.template?.title || checklist.title || "Checklist sem título"

      // Verificar e garantir que temos um ID de modelo válido
      let modelId = 0
      if (checklist.template?.id) {
        // Tentar converter para número, garantindo que não seja NaN
        const parsedId = Number(checklist.template.id)
        modelId = !isNaN(parsedId) ? parsedId : 0
      }

      // Se não temos um modelId válido, não podemos prosseguir
      if (modelId <= 0) {
        console.error("ModelId inválido ou ausente:", {
          templateId: checklist.template?.id,
          modelId: modelId,
        })
        throw new Error("ModelId inválido ou ausente. Não é possível enviar o checklist.")
      }

      console.log(
        `Preparando checklist para envio: name=${checklistName}, modelId=${modelId}, flowSize=${flowSize}, flowStep=${flowStep}, km=${vehicleKm}`,
      )

      try {
        // Processar os itens do checklist com mídia de forma assíncrona
        const formattedItems = await this.formatChecklistItemsForApi(checklist)

        // Preparar o array de locations
        let locations = []
        if (checklist.responses?.location) {
          locations = [
            {
              flowStep: flowStep,
              latitude: checklist.responses.location.latitude || 0,
              longitude: checklist.responses.location.longitude || 0,
              accuracy: checklist.responses.location.accuracy || 0,
              address: checklist.responses.location.address || "Unknown",
            },
          ]
        } else {
          // Se não houver dados de localização, incluir uma localização padrão
          locations = [
            {
              flowStep: flowStep,
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              address: "Unknown",
            },
          ]
        }

        // Construir o objeto de checklist no formato da API
        const checklistData = {
          name: checklistName, // Usar o nome validado
          modelId: modelId, // Usar o modelId validado
          StartDate: submissionDate,
          createdAt: checklist.createdAt || checklist.submittedAt || submissionDate, // Usar a data de criação efetiva ou a data de submissão como fallback
          vehicleData: [
            {
              vehicleId: Number(checklist.vehicle?.id || "0"),
              flowStep: flowStep,
              vehicleKm: vehicleKm, // Usar a quilometragem informada
            },
          ],
          flowSize: flowSize, // Usar o flowSize do template
          checklistType: "mobile", // Ajuste conforme necessário
          userId: userId, // Usar o ID do usuário logado
          infoId: 1, // Ajuste conforme necessário
          flowData: [
            {
              flowStep: flowStep,
              data: formattedItems,
            },
          ],
          locations: locations, // Incluir o array de locations
        }

        // Adicionar após a construção do objeto checklistData:
        console.log("Enviando checklist para API (detalhado):", {
          endpoint: API_ENDPOINTS.checklists(clientId),
          method: "POST",
          dataSize: JSON.stringify(checklistData).length,
          name: checklistData.name,
          modelId: checklistData.modelId,
          vehicleId: checklistData.vehicleData[0].vehicleId,
          vehicleKm: checklistData.vehicleData[0].vehicleKm,
          itemsCount: checklistData.flowData[0].data.length,
          userId: checklistData.userId,
          locations: checklistData.locations,
        })

        console.log("Enviando checklist para API:", JSON.stringify(checklistData, null, 2))

        // Usar o endpoint configurado
        const response = await this.fetchWithAuth(API_ENDPOINTS.checklists(clientId), {
          method: "POST",
          body: JSON.stringify(checklistData),
        })

        const data = await this.handleApiResponse(response, "Falha ao enviar checklist")

        return data
      } catch (processingError) {
        console.error("Erro ao processar mídia do checklist:", processingError)

        // Tentar enviar sem mídia se houver erro no processamento
        console.log("Tentando enviar checklist sem mídia...")

        // Criar versão simplificada dos itens sem mídia
        const simplifiedItems =
          checklist.template?.items.map((item: any, index: number) => {
            const responses = checklist.responses || {}
            const response = responses[item.id]
            const observation = responses[`${item.id}-observation`]

            return {
              requiredImage: item.requiresPhoto || false,
              requiredAudio: item.requiresAudio || false,
              requiredObservation: item.requiresObservation || false,
              itemId: Number.parseInt(item.id),
              itemName: item.question,
              answer: response?.toString() || "",
              observations: observation || "",
              priority: index + 1,
              photos: [],
              audios: [],
            }
          }) || []

        // Obter a quilometragem do veículo (se disponível)
        const vehicleKm = checklist.responses?.vehicleKilometer
          ? Number.parseInt(checklist.responses.vehicleKilometer.replace(/\D/g, ""), 10)
          : 0

        // Preparar o array de locations
        let locations = []
        if (checklist.responses?.location) {
          locations = [
            {
              flowStep: flowStep,
              latitude: checklist.responses.location.latitude || 0,
              longitude: checklist.responses.location.longitude || 0,
              accuracy: checklist.responses.location.accuracy || 0,
              address: checklist.responses.location.address || "Unknown",
            },
          ]
        } else {
          // Se não houver dados de localização, incluir uma localização padrão
          locations = [
            {
              flowStep: flowStep,
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              address: "Unknown",
            },
          ]
        }

        // Construir objeto de checklist simplificado
        const simplifiedChecklistData = {
          name: checklistName, // Usar o nome validado
          modelId: modelId, // Usar o modelId validado
          driverId: userId,
          StartDate: submissionDate,
          createdAt: checklist.createdAt || checklist.submittedAt || submissionDate, // Usar a data de criação efetiva ou a data de submissão como fallback
          vehicleData: [
            {
              vehicleId: Number.parseInt(checklist.vehicle?.id || "0"),
              flowStep: flowStep,
              vehicleKm: vehicleKm, // Usar a quilometragem informada
            },
          ],
          flowSize: flowSize,
          checklistType: "mobile",
          userId: userId,
          infoId: 1,
          flowData: [
            {
              flowStep: flowStep,
              data: simplifiedItems,
            },
          ],
          locations: locations, // Incluir o array de locations
        }

        console.log("Enviando checklist simplificado para API (sem mídia)")

        const fallbackResponse = await this.fetchWithAuth(API_ENDPOINTS.checklists(clientId), {
          method: "POST",
          body: JSON.stringify(simplifiedChecklistData),
        })

        return this.handleApiResponse(fallbackResponse, "Falha ao enviar checklist simplificado")
      }
    } catch (error: any) {
      console.error("Erro ao enviar checklist:", error)
      throw error
    }
  }

  // Formatar itens do checklist para o formato da API
  private async formatChecklistItemsForApi(checklist: any): Promise<any[]> {
    const items = checklist.template?.items || checklist.items || []
    const responses = checklist.responses || {}

    // Criar um array de promessas para processar cada item
    const itemPromises = items.map(async (item: any, index: number) => {
      const response = responses[item.id]
      const observation = responses[`${item.id}-observation`]

      try {
        // Processar fotos e áudios de forma assíncrona
        const photos = responses.photos?.[item.id] || []
        const audios = responses.audios?.[item.id] || []

        // Formatar fotos e áudios
        const formattedPhotos = await this.processPhotosForApi(photos)
        const formattedAudios = await this.processAudiosForApi(audios)

        return {
          requiredImage: item.requiresPhoto || false,
          requiredAudio: item.requiresAudio || false,
          requiredObservation: item.requiresObservation || false,
          itemId: Number.parseInt(item.id),
          itemName: item.question,
          answer: response?.toString() || "",
          observations: observation || "",
          priority: index + 1,
          photos: formattedPhotos,
          audios: formattedAudios,
        }
      } catch (error) {
        console.error(`Erro ao processar item ${index}:`, error)
        // Retornar item sem mídia em caso de erro
        return {
          requiredImage: item.requiresPhoto || false,
          requiredAudio: item.requiresAudio || false,
          requiredObservation: item.requiresObservation || false,
          itemId: Number.parseInt(item.id),
          itemName: item.question,
          answer: response?.toString() || "",
          observations: observation || "",
          priority: index + 1,
          photos: [],
          audios: [],
        }
      }
    })

    // Aguardar a resolução de todas as promessas de itens
    return Promise.all(itemPromises)
  }

  // Método completamente reescrito para processar fotos para a API
  private async processPhotosForApi(photos: string[]): Promise<any[]> {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return []
    }

    console.log(`Processando ${photos.length} fotos para API`)

    const processedPhotos = []

    for (let i = 0; i < photos.length; i++) {
      try {
        const photo = photos[i]

        // Verificar se a foto é válida
        if (!photo || typeof photo !== "string") {
          console.warn(`Foto ${i} inválida, ignorando`)
          continue
        }

        let base64Data = ""

        // Se já for uma string base64 com prefixo, extrair apenas os dados
        if (photo.startsWith("data:")) {
          base64Data = photo.split(",")[1] || ""
        }
        // Se for uma URL de blob, ignorar
        else if (photo.startsWith("blob:")) {
          console.warn(`Ignorando URL de blob para foto ${i}`)
          continue
        }
        // Se for apenas o base64 sem o prefixo, usar diretamente
        else {
          base64Data = photo
        }

        // Verificar se temos dados base64 válidos
        if (base64Data) {
          console.log(`Foto ${i + 1} processada com sucesso, tamanho: ${base64Data.length} caracteres`)

          processedPhotos.push({
            caption: `Foto ${i + 1}`,
            photoBase64: base64Data,
            fileName: `photo_${i + 1}.jpg`,
          })
        }
      } catch (error) {
        console.error(`Erro ao processar foto ${i}:`, error)
        // Continuar com a próxima foto
      }
    }

    console.log(`Total de ${processedPhotos.length} fotos processadas com sucesso`)
    return processedPhotos
  }

  // Método completamente reescrito para processar áudios para a API
  private async processAudiosForApi(audios: string[]): Promise<any[]> {
    if (!audios || !Array.isArray(audios) || audios.length === 0) {
      return []
    }

    const processedAudios = []

    for (let i = 0; i < audios.length; i++) {
      try {
        const audio = audios[i]

        // Verificar se o áudio é válido
        if (!audio || typeof audio !== "string") {
          console.warn(`Áudio ${i} inválido, ignorando`)
          continue
        }

        let base64Data = ""

        // Se já for uma string base64, extrair apenas os dados
        if (audio.startsWith("data:")) {
          base64Data = audio.split(",")[1] || ""

          processedAudios.push({
            caption: `Áudio ${i + 1}`,
            audioBase64: base64Data,
            fileName: `audio_${i + 1}.mp3`,
          })
        }
        // Se for uma URL de blob, ignorar e continuar com os próximos áudios
        // As URLs de blob são temporárias e podem não estar mais disponíveis
        else if (audio.startsWith("blob:")) {
          console.warn(
            `Ignorando URL de blob para áudio ${i} - URLs de blob são temporárias e podem não estar disponíveis`,
          )
          continue
        }
        // Outros formatos de URL - ignorar
        else {
          console.warn(`Formato de áudio ${i} não reconhecido, ignorando`)
          continue
        }
      } catch (error) {
        console.error(`Erro ao processar áudio ${i}:`, error)
        // Continuar com o próximo áudio
        continue
      }
    }

    return processedAudios
  }

  // Converter Blob para Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = (error) => {
        console.error("Erro ao converter blob para base64:", error)
        reject(error)
      }
      reader.readAsDataURL(blob)
    })
  }

  // Buscar checklists pendentes de sincronização
  async getPendingChecklists(): Promise<any[]> {
    try {
      const clientId = this.getClientId()
      const response = await this.fetchWithAuth(`/${clientId}/checklist?statusId=1`) // Ajuste o statusId conforme necessário

      if (!response.ok) {
        throw new Error("Falha ao buscar checklists pendentes")
      }

      return response.json()
    } catch (error: any) {
      console.error("Erro ao buscar checklists pendentes:", error)
      throw error
    }
  }

  // Upload de arquivo (foto ou áudio)
  async uploadFile(file: Blob, type: "photo" | "audio", metadata: any): Promise<string> {
    try {
      // Converter o blob para base64
      const base64 = await this.blobToBase64(file)

      // Não há um endpoint específico para upload de arquivos na API Frota Certa
      // Os arquivos são enviados como parte do checklist
      // Retornar a string base64 para uso posterior
      return base64
    } catch (error: any) {
      console.error(`Erro ao fazer upload de ${type}:`, error)
      throw error
    }
  }

  // Verificar se estamos usando dados de exemplo
  isUsingMockData(): boolean {
    return this.useMockData
  }

  // Forçar modo de dados de exemplo (útil para testes)
  setMockMode(useMock: boolean): void {
    // Always set to false regardless of the parameter
    this.useMockData = false
    console.log("Mock mode disabled: Using only API data")
  }

  // Método para registrar um novo usuário
  async registerUser(userData: {
    username: string
    password: string
    name: string
    email: string
    role?: string
  }): Promise<any> {
    try {
      const clientId = this.getClientId()
      const response = await fetch(`${this.baseUrl}/${clientId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      return this.handleApiResponse(response, "Falha ao registrar usuário")
    } catch (error) {
      console.error("Erro ao registrar usuário:", error)
      throw error
    }
  }

  // Método para solicitar redefinição de senha
  async requestPasswordReset(email: string): Promise<any> {
    try {
      const clientId = this.getClientId()
      const response = await fetch(`${this.baseUrl}/${clientId}/request-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      return this.handleApiResponse(response, "Falha ao solicitar redefinição de senha")
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error)
      throw error
    }
  }

  // Método para redefinir a senha
  async resetPassword(token: string, newPassword: string): Promise<any> {
    try {
      const clientId = this.getClientId()
      const response = await fetch(`${this.baseUrl}/${clientId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      })

      return this.handleApiResponse(response, "Falha ao redefinir senha")
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      throw error
    }
  }

  private mapAnswerTypeToAppType(answerTypeId: number): string {
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
        return "select" // Changed from "audio" to "select" to properly handle OK/Não OK options
      default:
        return "text"
    }
  }

  private getAnswerValuesFromItem(item: any): string[] {
    // Check if the item has answer options
    if (item.answerOptions && Array.isArray(item.answerOptions)) {
      return item.answerOptions
    }

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

  // Method to fetch all data in a single request - this is the main data source for the app
  // It fetches vehicles, models, and checklists from the SyncDataApp endpoint
  async getAllAppData(userId?: string | number, updatedAt?: string): Promise<any> {
    // Verificar se já existe uma requisição em andamento
    if (this.isGettingAllAppData) {
      console.log("Requisição getAllAppData já em andamento, usando dados em cache ou aguardando...")

      // Tentar usar dados em cache se disponíveis
      const cacheKey = `appData_${userId || "default"}_${updatedAt || "full"}`
      const cachedData = sessionStorage.getItem(cacheKey)

      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData)
          console.log("Usando dados em cache para getAllAppData enquanto outra requisição está em andamento")
          return data
        } catch (e) {
          console.error("Erro ao ler cache:", e)
          // Se houver erro ao ler o cache, continue com a requisição normal
        }
      }

      // Se não houver cache, aguardar um pouco e tentar novamente
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Verificar novamente se a requisição ainda está em andamento
      if (this.isGettingAllAppData) {
        console.log("Requisição ainda em andamento, retornando dados vazios para evitar loop")
        return {
          totalItems: 0,
          vehicles: [],
          models: [],
          checklists: [],
        }
      }
    }

    // Adicionar um mecanismo de cache para evitar requisições repetidas
    const cacheKey = `appData_${userId || "default"}_${updatedAt || "full"}`
    const cachedData = sessionStorage.getItem(cacheKey)

    // Se temos dados em cache recentes (menos de 5 minutos), use-os
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        const now = Date.now()
        // Usar cache se tiver menos de 5 minutos
        if (now - timestamp < 5 * 60 * 1000) {
          console.log("Usando dados em cache para getAllAppData")
          return data
        }
      } catch (e) {
        console.error("Erro ao ler cache:", e)
        // Se houver erro ao ler o cache, continue com a requisição normal
      }
    }

    try {
      // Marcar que uma requisição está em andamento
      this.isGettingAllAppData = true

      // Obter o ID do usuário logado se não for fornecido
      if (!userId) {
        const userData = localStorage.getItem("user_data")
        const user = userData ? JSON.parse(userData) : null

        // Verificar todas as possíveis propriedades que podem conter o ID do usuário
        userId = user?.userId || user?.id || user?.user_id || user?.driverId || null

        // Se ainda não encontrou o ID, verificar se há um objeto aninhado
        if (!userId && user?.user) {
          userId = user.user.id || user.user.userId || user.user.user_id || null
        }

        // Log para depuração
        console.log("Dados do usuário encontrados:", user)
        console.log("ID do usuário extraído:", userId)

        // Se não encontrou um ID válido, usar um valor padrão ou lançar um erro
        if (!userId) {
          console.warn("ID do usuário não encontrado nos dados armazenados. Usando valor padrão.")
          userId = 1 // Valor padrão como último recurso
        }
      }

      const clientId = this.getClientId()
      // Usar o endpoint de sincronização completa com o userId como parte do caminho
      let endpoint = API_ENDPOINTS.syncDataApp(clientId, userId)

      // Adicionar showDeleted=false para evitar ambiguidade na coluna deleted_at
      endpoint += endpoint.includes("?") ? "&showDeleted=false" : "?showDeleted=false"

      // Adicionar parâmetro updatedAt para sincronização incremental, se fornecido
      if (updatedAt) {
        // Log para depuração
        console.log("Adicionando parâmetro updatedAt:", updatedAt)

        endpoint += endpoint.includes("?")
          ? `&updatedAt=${encodeURIComponent(updatedAt)}`
          : `?updatedAt=${encodeURIComponent(updatedAt)}`
      }

      console.log(`Buscando todos os dados com endpoint: ${endpoint}`)

      const response = await this.fetchWithAuth(endpoint)

      // Log para depuração da resposta HTTP
      console.log("Resposta HTTP:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
      })

      const responseData = await this.handleApiResponse(response, "Falha ao buscar dados completos da aplicação")

      // Log detalhado da resposta para depuração
      console.log(
        "Resposta da API de sincronização completa:",
        `Total de itens: ${responseData.totalItems || "N/A"}, ` +
          `Veículos: ${responseData.vehicles?.length || 0}, ` +
          `Modelos: ${responseData.models?.length || 0}, ` +
          `Checklists: ${responseData.checklists?.length || 0}`,
      )

      // Process the models to ensure they have the correct structure
      if (responseData.models && Array.isArray(responseData.models)) {
        responseData.models = responseData.models.map((model: any) => {
          // Ensure each model has the correct fields
          return {
            ...model,
            title: model.name || "Modelo sem nome",
            description: model.description || "Sem descrição",
            items: Array.isArray(model.items)
              ? model.items.map((item: any) => {
                  // Process each item to have the correct fields
                  return {
                    ...item,
                    id: item.id?.toString() || Math.random().toString(36).substring(2, 9),
                    question: item.name || "Pergunta sem texto",
                    type: this.mapAnswerTypeToAppType(item.answerTypeId || 1),
                    requiresPhoto: item.requiredImage || false,
                    requiresImage: item.requiredImage || false,
                    requiresAudio: item.requiredAudio || false,
                    requiresObservation: item.requiredObservation || false,
                    answerValues: this.getAnswerValuesFromItem(item),
                  }
                })
              : [],
          }
        })
      }

      // Armazenar os dados em cache
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: responseData,
            timestamp: Date.now(),
          }),
        )
      } catch (e) {
        console.error("Erro ao armazenar em cache:", e)
        // Ignorar erros de armazenamento em cache
      }

      return responseData
    } catch (error: any) {
      console.error("Erro ao buscar dados completos:", error)

      // Verificar se é o erro específico de coluna ambígua
      const errorMessage = error.message || ""
      if (
        errorMessage.includes("Column 'deleted_at' in where clause is ambiguous") ||
        (error.response &&
          error.response.data &&
          error.response.data.errorMessage &&
          error.response.data.errorMessage.includes("Column 'deleted_at' in where clause is ambiguous"))
      ) {
        console.warn("Detectado erro de coluna ambígua 'deleted_at', retornando dados vazios como fallback")

        // Retornar estrutura vazia como fallback
        return {
          totalItems: 0,
          vehicles: [],
          models: [],
          checklists: [],
          errorInfo: {
            message: "Erro no servidor: coluna deleted_at ambígua",
            originalError: error.message,
          },
        }
      }

      // Para outros tipos de erro, propagar normalmente
      throw error
    } finally {
      // Remover o flag de requisição em andamento
      this.isGettingAllAppData = false
    }
  }

  private getAnswerValuesFromItem(item: any): string[] {
    // Check if the item has answer options
    if (item.answerOptions && Array.isArray(item.answerOptions)) {
      return item.answerOptions
    }

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

  // Adicione um método para enviar fotos com o prefixo correto

  async submitPhotoWithPrefix(photoData: string): Promise<string> {
    // Verificar se já tem o prefixo
    if (photoData.startsWith("data:image/jpeg;base64,")) {
      return photoData
    }

    // Verificar se é um base64 válido
    if (/^[A-Za-z0-9+/=]+$/.test(photoData)) {
      // Adicionar o prefixo
      return `data:image/jpeg;base64,${photoData}`
    }

    // Se não for um formato reconhecido, retornar como está
    console.warn("Formato de foto não reconhecido")
    return photoData
  }

  // Adicione este método para debug
  async logChecklistData(checklist: any): Promise<void> {
    console.log("Verificando dados do checklist antes do envio:")

    // Verificar se há fotos
    const responses = checklist.responses || {}
    const photos = responses.photos || {}

    let totalPhotos = 0
    for (const itemId in photos) {
      const itemPhotos = photos[itemId] || []
      totalPhotos += itemPhotos.length
      console.log(`Item ${itemId}: ${itemPhotos.length} fotos`)

      // Verificar primeira foto de cada item (apenas para debug)
      if (itemPhotos.length > 0) {
        const firstPhoto = itemPhotos[0]
        const isBase64WithPrefix = firstPhoto.startsWith("data:")
        const isBase64WithoutPrefix = /^[A-Za-z0-9+/=]+$/.test(firstPhoto)
        const isBlob = firstPhoto.startsWith("blob:")

        console.log(`  Primeira foto: ${firstPhoto.substring(0, 30)}... (${firstPhoto.length} caracteres)`)
        console.log(
          `  Tipo: ${isBase64WithPrefix ? "base64 com prefixo" : isBase64WithoutPrefix ? "base64 sem prefixo" : isBlob ? "blob URL" : "desconhecido"}`,
        )
      }
    }

    console.log(`Total de fotos no checklist: ${totalPhotos}`)
  }

  // Add these methods to your apiService class

  // Method to fetch only checklists

  private getUserIdFromStorage(): string | null {
    const userData = localStorage.getItem("user_data")
    const user = userData ? JSON.parse(userData) : null
    return user?.userId || user?.id || user?.user_id || user?.driverId || null
  }
}

// Create a singleton instance of the ApiService class
export const apiService = new ApiService()
