// Adicione esta importação no topo do arquivo
import { dispatchApiError } from "@/components/api-error-handler"

// Adicionar importações do arquivo de configuração
import { API_BASE_URL, CLIENT_ID, API_ENDPOINTS, buildApiUrl } from "@/lib/api-config"

// Serviço para comunicação com a API Frota Certa
export class ApiService {
  private baseUrl: string
  private authToken: string | null = null
  private useMockData = false
  private clientId = "frota-teste" // Cliente padrão, deve ser configurado

  // Atualizar o construtor para usar as configurações
  constructor(baseUrl?: string, clientId?: string) {
    // Se não houver baseUrl, usar a configuração padrão
    this.baseUrl = baseUrl || API_BASE_URL

    // Se o clientId for fornecido, usá-lo
    if (clientId) {
      this.clientId = clientId
    } else {
      this.clientId = CLIENT_ID
    }

    // Se baseUrl estiver vazio ou inválido, usar dados mock
    if (!this.baseUrl || this.baseUrl === "https://api.example.com") {
      console.log("API URL não configurada corretamente. Usando dados de exemplo.")
      this.useMockData = true
    }

    console.log("ApiService inicializado com:", {
      baseUrl: this.baseUrl,
      clientId: this.clientId,
      useMockData: this.useMockData,
    })
  }

  // Configurar o ID do cliente
  setClientId(clientId: string) {
    this.clientId = clientId
    localStorage.setItem("client_id", clientId)
  }

  // Obter o ID do cliente
  getClientId(): string {
    if (!this.clientId || this.clientId === "frota-teste") {
      const storedClientId = localStorage.getItem("client_id")
      if (storedClientId) {
        this.clientId = storedClientId
      }
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
    if (!this.authToken) {
      this.authToken = localStorage.getItem("auth_token")
    }
    return this.authToken
  }

  // Atualizar o método fetchWithAuth para usar a função buildApiUrl
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Se estiver em modo mock, lançar erro específico
    if (this.useMockData) {
      throw new Error("MOCK_MODE")
    }

    const token = this.getAuthToken()

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }

    try {
      // Usar a função buildApiUrl para construir a URL corretamente
      const url = buildApiUrl(this.baseUrl, endpoint)
      console.log("Fazendo requisição para:", url)

      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        // Token expirado ou inválido
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
    // Se estiver em modo mock, retornar dados de exemplo
    if (this.useMockData) {
      console.log("Usando dados de login de exemplo")
      return {
        token: "mock-token-" + Date.now(),
        user: {
          id: "mock-user-1",
          name: "Usuário de Exemplo",
          role: "driver",
        },
      }
    }

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
    // Se estiver em modo mock, retornar dados de exemplo
    if (this.useMockData) {
      console.log("Usando dados de renovação de token de exemplo")
      return {
        token: "mock-token-" + Date.now(),
        user: {
          id: "mock-user-1",
          name: "Usuário de Exemplo",
          role: "driver",
        },
      }
    }

    try {
      const clientId = this.getClientId()
      const token = this.getAuthToken()

      if (!token) {
        throw new Error("Não há token para renovar")
      }

      const response = await fetch(`${this.baseUrl}/${clientId}/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await this.handleApiResponse(response, "Falha ao renovar token")

      // Extrair o novo token
      const newToken = data.token || response.headers.get("Authorization")?.replace("Bearer ", "") || ""

      if (!newToken) {
        throw new Error("Novo token não encontrado na resposta")
      }

      this.setAuthToken(newToken)
      return { token: newToken, user: data.user }
    } catch (error) {
      console.error("Erro ao renovar token:", error)
      throw error
    }
  }

  // Modificar os métodos getChecklistTemplates e getVehicles para aceitar parâmetros de filtro

  // Atualizar o método getChecklistTemplates
  async getChecklistTemplates(additionalParams = ""): Promise<any[]> {
    // Se estiver em modo mock, retornar dados de exemplo
    if (this.useMockData) {
      console.log("Usando dados de modelos de exemplo")
      try {
        // Importar dados de exemplo dinamicamente
        const { CHECKLIST_TEMPLATES } = await import("@/data/mock-templates")
        return CHECKLIST_TEMPLATES || []
      } catch (error) {
        console.error("Erro ao carregar modelos de exemplo:", error)
        return []
      }
    }

    try {
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
      if (error.message === "MOCK_MODE") {
        return this.getChecklistTemplates()
      }
      console.error("Erro ao buscar modelos de checklist:", error)
      // Em caso de erro, retornar um array vazio em vez de propagar o erro
      return []
    }
  }

  // Atualizar o método getVehicles
  async getVehicles(additionalParams = ""): Promise<any[]> {
    // Se estiver em modo mock, retornar dados de exemplo
    if (this.useMockData) {
      console.log("Usando dados de veículos de exemplo")
      try {
        // Importar dados de exemplo dinamicamente
        const { VEHICLES } = await import("@/data/mock-vehicles")
        return VEHICLES || []
      } catch (error) {
        console.error("Erro ao carregar veículos de exemplo:", error)
        return []
      }
    }

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
      return vehicles.map((vehicle: any) => ({
        id: vehicle.id?.toString() || Math.random().toString(36).substring(2, 9),
        name: vehicle.name || vehicle.description || "Veículo sem nome",
        licensePlate: vehicle.plate || vehicle.licensePlate || "Sem placa",
        type: vehicle.type || "Veículo", // Ajuste conforme necessário
        status: vehicle.status || "available", // Ajuste conforme necessário
      }))
    } catch (error: any) {
      if (error.message === "MOCK_MODE") {
        return this.getVehicles()
      }
      console.error("Erro ao buscar veículos:", error)
      // Em caso de erro, retornar um array vazio em vez de propagar o erro
      return []
    }
  }

  // Atualizar o método submitChecklist para usar os endpoints configurados
  async submitChecklist(checklist: any): Promise<any> {
    // Se estiver em modo mock, simular envio bem-sucedido
    if (this.useMockData) {
      console.log("Simulando envio de checklist:", checklist.id)
      return {
        id: checklist.id,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      }
    }

    try {
      // Adaptar o formato do checklist para o formato esperado pela API
      const clientId = this.getClientId()

      // Obter o ID do usuário logado
      const userData = localStorage.getItem("user_data")
      const user = userData ? JSON.parse(userData) : null
      const userId = user?.userId || 1013

      // Usar a data de submissão do checklist ou a data atual
      const submissionDate = checklist.submittedAt || new Date().toISOString()

      // Construir o objeto de checklist no formato da API
      const checklistData = {
        name: checklist.template?.title || checklist.title,
        modelId: Number.parseInt(checklist.template?.id || "0"),
        driverId: userId, // Usar o ID do usuário como driverId também
        StartDate: submissionDate,
        vehicleData: [
          {
            vehicleId: Number.parseInt(checklist.vehicle?.id || "0"),
            flowStep: 1,
            vehicleKm: 0, // Ajuste conforme necessário
          },
        ],
        flowSize: 1, // Ajuste conforme necessário
        checklistType: "mobile", // Ajuste conforme necessário
        userId: userId, // Usar o ID do usuário logado
        infoId: 1, // Ajuste conforme necessário
        flowData: [
          {
            flowStep: 1,
            data: this.formatChecklistItemsForApi(checklist),
          },
        ],
        locations: checklist.responses?.location
          ? [
              {
                flowStep: 1,
                latitude: checklist.responses.location.latitude,
                longitude: checklist.responses.location.longitude,
                accuracy: checklist.responses.location.accuracy || 0,
                address: checklist.responses.location.address || "",
              },
            ]
          : [],
      }

      // Usar o endpoint configurado
      const response = await this.fetchWithAuth(API_ENDPOINTS.checklists(clientId), {
        method: "POST",
        body: JSON.stringify(checklistData),
      })

      const data = await this.handleApiResponse(response, "Falha ao enviar checklist")

      return data
    } catch (error: any) {
      if (error.message === "MOCK_MODE") {
        return this.submitChecklist(checklist)
      }
      console.error("Erro ao enviar checklist:", error)
      throw error
    }
  }

  // Formatar itens do checklist para o formato da API
  private formatChecklistItemsForApi(checklist: any): any[] {
    const items = checklist.template?.items || checklist.items || []
    const responses = checklist.responses || {}

    return items.map((item: any, index: number) => {
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
        photos: this.formatPhotosForApi(responses.photos?.[item.id] || []),
        audios: this.formatAudiosForApi(responses.audios?.[item.id] || []),
      }
    })
  }

  // Formatar fotos para o formato da API
  private formatPhotosForApi(photos: string[]): any[] {
    return photos.map((photo, index) => ({
      caption: `Foto ${index + 1}`,
      photoBase64: this.getBase64FromUrl(photo),
      fileName: `photo_${index + 1}.jpg`,
    }))
  }

  // Formatar áudios para o formato da API
  private formatAudiosForApi(audios: string[]): any[] {
    return audios.map((audio, index) => ({
      caption: `Áudio ${index + 1}`,
      audioBase64: this.getBase64FromUrl(audio),
      fileName: `audio_${index + 1}.mp3`,
    }))
  }

  // Converter URL para Base64 (simplificado)
  private getBase64FromUrl(url: string): string {
    // Em uma implementação real, você precisaria buscar o blob e convertê-lo para base64
    // Esta é uma implementação simplificada para o exemplo
    if (url.startsWith("data:")) {
      return url.split(",")[1] || ""
    }
    return ""
  }

  // Buscar checklists pendentes de sincronização
  async getPendingChecklists(): Promise<any[]> {
    // Se estiver em modo mock, retornar array vazio (sem checklists pendentes)
    if (this.useMockData) {
      console.log("Usando checklists pendentes de exemplo (vazio)")
      return []
    }

    try {
      const clientId = this.getClientId()
      const response = await this.fetchWithAuth(`/${clientId}/checklist?statusId=1`) // Ajuste o statusId conforme necessário

      if (!response.ok) {
        throw new Error("Falha ao buscar checklists pendentes")
      }

      return response.json()
    } catch (error: any) {
      if (error.message === "MOCK_MODE") {
        return this.getPendingChecklists()
      }
      console.error("Erro ao buscar checklists pendentes:", error)
      throw error
    }
  }

  // Upload de arquivo (foto ou áudio)
  async uploadFile(file: Blob, type: "photo" | "audio", metadata: any): Promise<string> {
    // Se estiver em modo mock, retornar uma URL de exemplo
    if (this.useMockData) {
      console.log(`Upload de ${type} simulado com metadados:`, metadata)
      // Gerar uma URL falsa que parece vir de um servidor
      return `https://mock-api.example.com/uploads/${type}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${type === "photo" ? "jpg" : "mp3"}`
    }

    try {
      // Converter o blob para base64
      const base64 = await this.blobToBase64(file)

      // Não há um endpoint específico para upload de arquivos na API Frota Certa
      // Os arquivos são enviados como parte do checklist
      // Retornar a string base64 para uso posterior
      return base64
    } catch (error: any) {
      if (error.message === "MOCK_MODE") {
        return this.uploadFile(file, type, metadata)
      }
      console.error(`Erro ao fazer upload de ${type}:`, error)
      throw error
    }
  }

  // Converter Blob para Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Verificar se estamos usando dados de exemplo
  isUsingMockData(): boolean {
    return this.useMockData
  }

  // Forçar modo de dados de exemplo (útil para testes)
  setMockMode(useMock: boolean): void {
    this.useMockData = useMock
  }

  // Método para registrar um novo usuário
  async registerUser(userData: {
    username: string
    password: string
    name: string
    email: string
    role?: string
  }): Promise<any> {
    // Se estiver em modo mock, simular registro bem-sucedido
    if (this.useMockData) {
      console.log("Simulando registro de usuário:", userData.username)
      return {
        id: `user_${Date.now()}`,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role || "driver",
        createdAt: new Date().toISOString(),
      }
    }

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
    // Se estiver em modo mock, simular solicitação bem-sucedida
    if (this.useMockData) {
      console.log("Simulando solicitação de redefinição de senha para:", email)
      return {
        success: true,
        message: "E-mail de redefinição de senha enviado com sucesso",
      }
    }

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
    // Se estiver em modo mock, simular redefinição bem-sucedida
    if (this.useMockData) {
      console.log("Simulando redefinição de senha com token:", token)
      return {
        success: true,
        message: "Senha redefinida com sucesso",
      }
    }

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
        return "text"
      case 3:
        return "number"
      case 4:
        return "photo"
      case 5:
        return "audio"
      default:
        return "text"
    }
  }
}

// Instância singleton para uso em toda a aplicação
// Use uma string vazia como padrão para acionar o modo de dados de exemplo se nenhuma URL de API for fornecida
export const apiService = new ApiService(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "",
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_CLIENT_ID
    ? process.env.NEXT_PUBLIC_CLIENT_ID
    : "frota-teste",
)
