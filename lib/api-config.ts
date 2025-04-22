// Configurações da API Frota Certa

// URL base da API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-checklist.frotacerta.com.br"

// ID do cliente (tenant)
export const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || "frota-teste"

// Credenciais de teste
export const TEST_CREDENTIALS = {
  username: "motorista_teste",
  password: "Mototeste123!",
}

// Função para construir URLs da API corretamente
export function buildApiUrl(baseUrl: string, endpoint: string): string {
  // Remover barras extras no início do endpoint e no final da baseUrl
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint

  return `${cleanBaseUrl}/${cleanEndpoint}`
}

// Adicionar parâmetros padrão para as requisições à API

// Adicione esta função para construir URLs com parâmetros de paginação e ordenação
export function buildApiUrlWithParams(baseUrl: string, endpoint: string, params: Record<string, string> = {}): string {
  // Remover barras extras no início do endpoint e no final da baseUrl
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint

  // Parâmetros padrão para todas as requisições
  const defaultParams: Record<string, string> = {
    showDeleted: "false",
    sortDir: "ASC",
    pageSize: "100",
    pageNumber: "1",
  }

  // Mesclar parâmetros padrão com os fornecidos
  const allParams = { ...defaultParams, ...params }

  // Construir a string de query
  const queryString = Object.entries(allParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&")

  return `${cleanBaseUrl}/${cleanEndpoint}${queryString ? `?${queryString}` : ""}`
}

// Atualizar os endpoints para usar a nova função
export const API_ENDPOINTS = {
  // Autenticação
  login: (clientId: string) => `${clientId}/login`,
  refreshToken: (clientId: string) => `${clientId}/refresh-token`,
  register: (clientId: string) => `${clientId}/register`,
  requestPasswordReset: (clientId: string) => `${clientId}/request-password-reset`,
  resetPassword: (clientId: string) => `${clientId}/reset-password`,

  // Checklists
  checklistModels: (clientId: string) => `${clientId}/checklistmodel`, // Changed to lowercase 'm'
  checklists: (clientId: string) => `${clientId}/checklist`,

  // Veículos
  vehicles: (clientId: string) => `${clientId}/vehicle`,

  // Outros endpoints
  healthcheck: (clientId: string) => `${clientId}/healthcheck`,
}
