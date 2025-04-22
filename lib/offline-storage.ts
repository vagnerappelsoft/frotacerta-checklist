// Interface para os tipos de dados que serão armazenados
interface StorableData {
  id: string
  [key: string]: any
}

// Tipos de dados que podem ser armazenados
type DataType = "checklists" | "templates" | "vehicles" | "settings"

// Classe para gerenciar o armazenamento offline
export class OfflineStorage {
  private dbName: string
  private dbVersion: number
  private db: IDBDatabase | null = null
  private dbInitPromise: Promise<boolean> | null = null

  constructor(dbName = "vehicle_checklist_db", dbVersion = 1) {
    this.dbName = dbName
    this.dbVersion = dbVersion
  }

  // Inicializa o banco de dados
  async init(): Promise<boolean> {
    // Se já temos uma promessa de inicialização em andamento, retorne-a
    if (this.dbInitPromise) {
      return this.dbInitPromise
    }

    // Se o banco de dados já está inicializado, retorne true
    if (this.db) {
      return true
    }

    console.log("Iniciando inicialização do IndexedDB...")

    // Criar uma nova promessa de inicialização
    this.dbInitPromise = new Promise((resolve, reject) => {
      try {
        // Verificar se IndexedDB está disponível
        if (!window.indexedDB) {
          console.error("Seu navegador não suporta IndexedDB. O armazenamento offline não funcionará.")
          this.dbInitPromise = null
          reject(new Error("IndexedDB não suportado"))
          return
        }

        console.log("Abrindo banco de dados:", this.dbName, "versão:", this.dbVersion)
        const request = indexedDB.open(this.dbName, this.dbVersion)

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error
          console.error("Erro ao abrir o banco de dados:", error)
          this.dbInitPromise = null // Resetar a promessa para permitir novas tentativas
          reject(new Error(`Erro ao abrir IndexedDB: ${error?.message || "Desconhecido"}`))
        }

        request.onsuccess = (event) => {
          console.log("Banco de dados aberto com sucesso")
          this.db = (event.target as IDBOpenDBRequest).result

          // Configurar tratamento de erro para o banco de dados
          this.db.onerror = (event) => {
            console.error("Erro no banco de dados:", (event.target as IDBDatabase).error)
          }

          this.dbInitPromise = null // Limpar a promessa, pois a inicialização foi concluída
          resolve(true)
        }

        request.onupgradeneeded = (event) => {
          console.log("Atualizando estrutura do banco de dados...")
          const db = (event.target as IDBOpenDBRequest).result

          // Criar stores para cada tipo de dado
          if (!db.objectStoreNames.contains("checklists")) {
            console.log("Criando store 'checklists'")
            db.createObjectStore("checklists", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("templates")) {
            console.log("Criando store 'templates'")
            db.createObjectStore("templates", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("vehicles")) {
            console.log("Criando store 'vehicles'")
            db.createObjectStore("vehicles", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("settings")) {
            console.log("Criando store 'settings'")
            db.createObjectStore("settings", { keyPath: "id" })
          }

          // Store para controlar sincronização
          if (!db.objectStoreNames.contains("sync_queue")) {
            console.log("Criando store 'sync_queue'")
            const syncStore = db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true })
            syncStore.createIndex("status", "status", { unique: false })
            syncStore.createIndex("timestamp", "timestamp", { unique: false })
          }

          console.log("Estrutura do banco de dados atualizada")
        }
      } catch (error) {
        console.error("Erro ao inicializar IndexedDB:", error)
        this.dbInitPromise = null
        reject(error)
      }
    })

    return this.dbInitPromise
  }

  // Modifique o método saveItem para sempre adicionar à fila de sincronização quando o tipo for "checklists"

  // Salva um item no armazenamento local
  async saveItem<T extends StorableData>(type: DataType, item: T): Promise<boolean> {
    try {
      console.log(`Salvando item no store '${type}':`, item.id)

      if (!this.db) {
        console.log("Banco de dados não inicializado, inicializando...")
        const initResult = await this.init()
        if (!initResult) {
          throw new Error("Falha ao inicializar o banco de dados")
        }
      }

      if (!this.db) {
        throw new Error("Banco de dados ainda não disponível após inicialização")
      }

      // Verificar se o item é serializável
      try {
        // Teste de serialização
        JSON.stringify(item)
      } catch (serializeError) {
        console.error("Erro ao serializar o item:", serializeError)
        throw new Error(`O item não é serializável: ${serializeError.message}`)
      }

      return new Promise((resolve, reject) => {
        try {
          console.log(`Iniciando transação para salvar em '${type}'`)
          const transaction = this.db!.transaction([type], "readwrite")

          transaction.onerror = (event) => {
            const error = transaction.error
            console.error(`Erro na transação:`, error)
            reject(new Error(`Erro na transação: ${error?.message || "Desconhecido"}`))
          }

          const store = transaction.objectStore(type)
          console.log(`Salvando item com ID: ${item.id}`)

          // Criar uma cópia limpa do objeto para evitar problemas de serialização
          const cleanItem = JSON.parse(JSON.stringify(item))
          const request = store.put(cleanItem)

          request.onsuccess = () => {
            console.log(`Item salvo com sucesso no store '${type}'`)

            // Adicionar à fila de sincronização se for um checklist, independentemente do estado de conexão
            // Isso garante que todos os checklists sejam sincronizados, mesmo quando online
            if (type === "checklists") {
              this.addToSyncQueue(type, item.id, "create")
                .then(() => console.log("Checklist adicionado à fila de sincronização"))
                .catch((err) => console.error("Erro ao adicionar à fila de sincronização:", err))
            } else if (!navigator.onLine) {
              // Para outros tipos de dados, adicionar à fila apenas se estiver offline
              this.addToSyncQueue(type, item.id, "create")
                .then(() => console.log("Item adicionado à fila de sincronização"))
                .catch((err) => console.error("Erro ao adicionar à fila de sincronização:", err))
            }

            resolve(true)
          }

          request.onerror = (event) => {
            const error = request.error
            console.error(`Erro ao salvar item no IndexedDB:`, error)
            reject(new Error(`Erro ao salvar: ${error?.message || "Desconhecido"}`))
          }
        } catch (error) {
          console.error(`Erro ao criar transação:`, error)
          reject(error)
        }
      })
    } catch (error) {
      console.error(`Erro ao salvar item:`, error)
      throw error // Propagar o erro para tratamento adequado
    }
  }

  // Obtém um item do armazenamento local
  async getItem<T>(type: DataType, id: string): Promise<T | null> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(null)
          return
        }

        try {
          const transaction = this.db.transaction([type], "readonly")
          const store = transaction.objectStore(type)
          const request = store.get(id)

          request.onsuccess = () => {
            resolve(request.result || null)
          }

          request.onerror = (event) => {
            console.error(`Erro ao obter item do IndexedDB:`, event)
            reject(null)
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject(null)
        }
      })
    } catch (error) {
      console.error(`Erro ao obter item:`, error)
      return null
    }
  }

  // Obtém todos os itens de um tipo
  async getAllItems<T>(type: DataType): Promise<T[]> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject([])
          return
        }

        try {
          const transaction = this.db.transaction([type], "readonly")
          const store = transaction.objectStore(type)
          const request = store.getAll()

          request.onsuccess = () => {
            resolve(request.result || [])
          }

          request.onerror = (event) => {
            console.error(`Erro ao obter todos os itens do IndexedDB:`, event)
            reject([])
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject([])
        }
      })
    } catch (error) {
      console.error(`Erro ao obter todos os itens:`, error)
      return []
    }
  }

  // Remove um item do armazenamento local
  async removeItem(type: DataType, id: string): Promise<boolean> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(false)
          return
        }

        try {
          const transaction = this.db.transaction([type], "readwrite")
          const store = transaction.objectStore(type)
          const request = store.delete(id)

          request.onsuccess = () => {
            // Adicionar à fila de sincronização se estiver offline
            if (!navigator.onLine) {
              this.addToSyncQueue(type, id, "delete")
            }
            resolve(true)
          }

          request.onerror = (event) => {
            console.error(`Erro ao remover item do IndexedDB:`, event)
            reject(false)
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject(false)
        }
      })
    } catch (error) {
      console.error(`Erro ao remover item:`, error)
      return false
    }
  }

  // Adiciona uma operação à fila de sincronização
  private async addToSyncQueue(
    type: DataType,
    itemId: string,
    operation: "create" | "update" | "delete",
  ): Promise<boolean> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(false)
          return
        }

        try {
          const transaction = this.db.transaction(["sync_queue"], "readwrite")
          const store = transaction.objectStore("sync_queue")
          const request = store.add({
            type,
            itemId,
            operation,
            status: "pending",
            timestamp: new Date().toISOString(),
          })

          request.onsuccess = () => {
            resolve(true)
          }

          request.onerror = (event) => {
            console.error(`Erro ao adicionar à fila de sincronização:`, event)
            reject(false)
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject(false)
        }
      })
    } catch (error) {
      console.error(`Erro ao adicionar à fila de sincronização:`, error)
      return false
    }
  }

  // Obtém operações pendentes de sincronização
  async getPendingSyncs(): Promise<any[]> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject([])
          return
        }

        try {
          const transaction = this.db.transaction(["sync_queue"], "readonly")
          const store = transaction.objectStore("sync_queue")
          const index = store.index("status")
          const request = index.getAll("pending")

          request.onsuccess = () => {
            resolve(request.result || [])
          }

          request.onerror = (event) => {
            console.error(`Erro ao obter sincronizações pendentes:`, event)
            reject([])
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject([])
        }
      })
    } catch (error) {
      console.error(`Erro ao obter sincronizações pendentes:`, error)
      return []
    }
  }

  // Marca uma operação como sincronizada
  async markAsSynced(syncId: number): Promise<boolean> {
    try {
      if (!this.db) {
        await this.init()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(false)
          return
        }

        try {
          const transaction = this.db.transaction(["sync_queue"], "readwrite")
          const store = transaction.objectStore("sync_queue")
          const request = store.get(syncId)

          request.onsuccess = () => {
            if (request.result) {
              const item = request.result
              item.status = "synced"
              item.syncedAt = new Date().toISOString()

              const updateRequest = store.put(item)

              updateRequest.onsuccess = () => {
                resolve(true)
              }

              updateRequest.onerror = (event) => {
                console.error(`Erro ao atualizar status de sincronização:`, event)
                reject(false)
              }
            } else {
              console.error(`Item de sincronização não encontrado:`, syncId)
              reject(false)
            }
          }

          request.onerror = (event) => {
            console.error(`Erro ao obter item de sincronização:`, event)
            reject(false)
          }
        } catch (error) {
          console.error(`Erro na transação do IndexedDB:`, error)
          reject(false)
        }
      })
    } catch (error) {
      console.error(`Erro ao marcar como sincronizado:`, error)
      return false
    }
  }

  // Método para limpar todos os dados
  async clearAllData(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.init()
      }

      if (!this.db) {
        throw new Error("Banco de dados não disponível")
      }

      return new Promise((resolve, reject) => {
        try {
          // Lista de todos os stores
          const stores = ["checklists", "templates", "vehicles", "settings", "sync_queue"]
          let completedStores = 0

          for (const storeName of stores) {
            const transaction = this.db!.transaction([storeName], "readwrite")
            const store = transaction.objectStore(storeName)
            const request = store.clear()

            request.onsuccess = () => {
              completedStores++
              if (completedStores === stores.length) {
                console.log("Todos os dados foram limpos com sucesso")
                resolve(true)
              }
            }

            request.onerror = (event) => {
              console.error(`Erro ao limpar store ${storeName}:`, event)
              reject(new Error(`Erro ao limpar dados: ${request.error?.message || "Desconhecido"}`))
            }
          }
        } catch (error) {
          console.error("Erro ao limpar dados:", error)
          reject(error)
        }
      })
    } catch (error) {
      console.error("Erro ao limpar todos os dados:", error)
      return false
    }
  }
}

// Singleton para uso em toda a aplicação
export const offlineStorage = new OfflineStorage()
