// Serviço para gerenciar o histórico de quilometragem dos veículos
export interface KilometerRecord {
  vehicleId: string
  timestamp: string
  kilometer: number
  checklistId?: string
}

export class KilometerHistoryService {
  private readonly STORAGE_KEY = "vehicle_kilometer_history"

  // Obter todo o histórico de quilometragem
  getFullHistory(): Record<string, KilometerRecord[]> {
    try {
      const historyData = localStorage.getItem(this.STORAGE_KEY)
      if (!historyData) return {}
      return JSON.parse(historyData)
    } catch (error) {
      console.error("Erro ao obter histórico de quilometragem:", error)
      return {}
    }
  }

  // Obter o histórico de quilometragem de um veículo específico
  getVehicleHistory(vehicleId: string): KilometerRecord[] {
    const history = this.getFullHistory()
    return history[vehicleId] || []
  }

  // Obter a última quilometragem registrada para um veículo
  getLastKilometer(vehicleId: string): number | null {
    const vehicleHistory = this.getVehicleHistory(vehicleId)
    if (vehicleHistory.length === 0) return null

    // Ordenar por timestamp decrescente para garantir que pegamos o mais recente
    const sortedHistory = [...vehicleHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

    return sortedHistory[0].kilometer
  }

  // Adicionar um novo registro de quilometragem
  addKilometerRecord(record: KilometerRecord): boolean {
    try {
      const history = this.getFullHistory()

      // Inicializar o array para este veículo se não existir
      if (!history[record.vehicleId]) {
        history[record.vehicleId] = []
      }

      // Adicionar o novo registro
      history[record.vehicleId].push({
        ...record,
        timestamp: record.timestamp || new Date().toISOString(),
      })

      // Salvar no localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
      return true
    } catch (error) {
      console.error("Erro ao adicionar registro de quilometragem:", error)
      return false
    }
  }

  // Verificar se a nova quilometragem é válida (não menor que a anterior)
  isValidKilometer(vehicleId: string, newKilometer: number): boolean {
    const lastKilometer = this.getLastKilometer(vehicleId)

    // Se não houver registro anterior, qualquer valor é válido
    if (lastKilometer === null) return true

    // Verificar se o novo valor não é menor que o anterior
    return newKilometer >= lastKilometer
  }

  // Obter a diferença entre a nova quilometragem e a última registrada
  getKilometerDifference(vehicleId: string, newKilometer: number): number {
    const lastKilometer = this.getLastKilometer(vehicleId)
    if (lastKilometer === null) return 0
    return newKilometer - lastKilometer
  }
}

// Exportar uma instância singleton para uso em toda a aplicação
export const kilometerHistory = new KilometerHistoryService()
