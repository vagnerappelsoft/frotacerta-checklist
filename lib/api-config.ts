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

// Adicionar logs detalhados para depuração da construção de URLs da API

// Corrigir a função buildApiUrl para garantir que as URLs sejam construídas corretamente:

// Substituir a função buildApiUrl:

// Função para construir URLs da API corretamente
export function buildApiUrl(baseUrl: string, endpoint: string): string {
  // Remover barras extras no início do endpoint e no final da baseUrl
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint

  const finalUrl = `${cleanBaseUrl}/${cleanEndpoint}`
  console.log(`API URL construída: ${finalUrl}`)
  return finalUrl
}

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

  const finalUrl = `${cleanBaseUrl}/${cleanEndpoint}${queryString ? `?${queryString}` : ""}`
  console.log(`API URL com parâmetros construída: ${finalUrl}`)
  return finalUrl
}

// Atualizar os endpoints para garantir que estão corretos:

export const API_ENDPOINTS = {
  // Autenticação
  login: (clientId: string) => `${clientId}/login`,
  refreshToken: (clientId: string) => `${clientId}/refresh-token`,

  // Checklists
  checklistModels: (clientId: string) => `${clientId}/checklistmodel`, // Corrigido para minúsculo
  checklistModelDetails: (clientId: string, id: string | number) => `${clientId}/checklistmodel/details?Id=${id}`,
  checklists: (clientId: string) => `${clientId}/checklist`, // Endpoint para enviar checklists

  // Veículos
  vehicles: (clientId: string) => `${clientId}/vehicle`,

  // Sincronização de dados
  syncDataApp: (clientId: string, userId: string | number) => `${clientId}/SyncDataApp/${userId}`,

  // Outros endpoints
  healthcheck: (clientId: string) => `${clientId}/healthcheck`,
}
