// Constants for the application

// Application name
export const APP_NAME = "Frota Certa Checklist"

// Application version
export const APP_VERSION = "1.0.0"

// Default timeout for API requests (in milliseconds)
export const API_TIMEOUT = 30000

// Maximum number of retries for API requests
export const MAX_API_RETRIES = 3

// Default page size for paginated requests
export const DEFAULT_PAGE_SIZE = 20

// Maximum number of items to display in lists
export const MAX_LIST_ITEMS = 100

// Minimum password length
export const MIN_PASSWORD_LENGTH = 8

// Maximum file size for uploads (in bytes)
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Supported file types for uploads
export const SUPPORTED_FILE_TYPES = ["image/jpeg", "image/png", "audio/mp3", "audio/wav"]

// Default animation duration (in milliseconds)
export const ANIMATION_DURATION = 300

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  CLIENT_ID: "client_id",
  CURRENT_CLIENT_ID: "current_client_id",
  PREVIOUS_CLIENT_ID: "previous_client_id",
  LAST_SYNC: "last_sync_time",
  SYNC_TYPE: "last_sync_type",
  SYNC_IN_PROGRESS: "sync_in_progress",
  CONTINUING_CHECKLIST: "continuing_checklist",
  CHECKLIST_ID: "checklistId",
}

// Sync intervals (in milliseconds)
export const SYNC_INTERVALS = {
  BACKGROUND: 5 * 60 * 1000, // 5 minutes
  FORCE: 30 * 60 * 1000, // 30 minutes
  RETRY: 30 * 1000, // 30 seconds
}

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: "Erro de conexão. Verifique sua internet e tente novamente.",
  SERVER: "Erro no servidor. Por favor, tente novamente mais tarde.",
  AUTH: "Erro de autenticação. Por favor, faça login novamente.",
  VALIDATION: "Erro de validação. Verifique os dados informados.",
  UNKNOWN: "Ocorreu um erro inesperado. Por favor, tente novamente.",
}

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: "Login realizado com sucesso!",
  SYNC: "Sincronização concluída com sucesso!",
  SAVE: "Dados salvos com sucesso!",
  SUBMIT: "Checklist enviado com sucesso!",
}
