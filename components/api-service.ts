// components/api-service.ts

// This is a placeholder for the actual API service implementation.
// Replace this with your actual API service code.

// In a real application, you would have methods for making API requests,
// handling authentication, and managing data.

// This example provides a basic structure and some placeholder methods.

// You'll need to adapt this to your specific API and application requirements.

// For example, you might use a library like 'axios' or 'fetch' to make
// HTTP requests.

// You'll also need to define the data structures and types that your
// API uses.

// Here's a basic example:

interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Helper function to build the API URL
const buildApiUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl}/${endpoint}`
}

class ApiService {
  private baseUrl: string
  private authToken: string | null = null
  private useMockData = false // Flag to enable mock data mode

  constructor(baseUrl: string, useMockData = false) {
    this.baseUrl = baseUrl
    this.useMockData = useMockData
  }

  // Method to set the authentication token
  setAuthToken(token: string) {
    this.authToken = token
    localStorage.setItem("auth_token", token)
  }

  // Method to get the authentication token from localStorage
  getAuthToken(): string | null {
    if (this.authToken) {
      return this.authToken
    }
    const token = localStorage.getItem("auth_token")
    return token
  }

  // Generic method to make API requests with authentication
  // Adicionar logs detalhados para depuração das requisições à API

  // Atualizar o método fetchWithAuth para adicionar mais logs
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

  // Example method to get data from an API endpoint
  async getData<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchWithAuth(endpoint)

      if (!response.ok) {
        return { data: null, error: `Request failed with status ${response.status}` }
      }

      const data: T = await response.json()
      return { data: data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  // Example method to post data to an API endpoint
  async postData<T, U>(endpoint: string, body: T): Promise<ApiResponse<U>> {
    try {
      const response = await this.fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return { data: null, error: `Request failed with status ${response.status}` }
      }

      const data: U = await response.json()
      return { data: data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }
}

export default ApiService
