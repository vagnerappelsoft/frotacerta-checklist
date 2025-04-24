export const API_ENDPOINTS = {
  // Autenticação
  login: (clientId: string) => `${clientId}/login`,
  refreshToken: (clientId: string) => `${clientId}/refresh-token`,
  register: (clientId: string) => `${clientId}/register`,
  requestPasswordReset: (clientId: string) => `${clientId}/request-password-reset`,
  resetPassword: (clientId: string) => `${clientId}/reset-password`,

  // Checklists
  checklistModels: (clientId: string) => `${clientId}/checklistmodel`,
  checklistModelDetails: (clientId: string, id: string | number) => `${clientId}/checklistmodel/details?Id=${id}`,
  checklists: (clientId: string) => `${clientId}/checklist`,

  // Veículos
  vehicles: (clientId: string) => `${clientId}/vehicle`,

  // Sincronização de dados
  syncDataApp: (clientId: string, userId: string | number) => `${clientId}/SyncDataApp/${userId}`,

  // Outros endpoints
  healthcheck: (clientId: string) => `${clientId}/healthcheck`,
}
