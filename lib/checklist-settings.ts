// Serviço para gerenciar as configurações de checklist
export interface ChecklistSettings {
  requiredLocations: boolean
  requiredKilometer: boolean
  requiredPhotos: boolean
  requiredAudio: boolean
  requiredObservations: boolean
  // Outras configurações que possam existir
}

class ChecklistSettingsService {
  private settings: ChecklistSettings = {
    requiredLocations: true, // Valor padrão
    requiredKilometer: true, // Valor padrão
    requiredPhotos: false,
    requiredAudio: false,
    requiredObservations: false,
  }

  constructor() {
    this.loadSettings()
  }

  // Carregar configurações do localStorage
  private loadSettings(): void {
    try {
      const storedSettings = localStorage.getItem("checklist_settings")
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de checklist:", error)
    }
  }

  // Salvar configurações no localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem("checklist_settings", JSON.stringify(this.settings))
    } catch (error) {
      console.error("Erro ao salvar configurações de checklist:", error)
    }
  }

  // Obter todas as configurações
  getSettings(): ChecklistSettings {
    return { ...this.settings }
  }

  // Atualizar configurações
  updateSettings(newSettings: Partial<ChecklistSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  // Verificar se a localização é obrigatória
  isLocationRequired(): boolean {
    return this.settings.requiredLocations
  }

  // Verificar se a quilometragem é obrigatória
  isKilometerRequired(): boolean {
    return this.settings.requiredKilometer
  }
}

export const checklistSettings = new ChecklistSettingsService()
