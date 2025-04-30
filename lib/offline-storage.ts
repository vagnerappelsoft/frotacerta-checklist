// Interface para os tipos de dados que serão armazenados
interface StorableData {
  id: string
  [key: string]: any
}

// Tipos de dados que podem ser armazenados
type DataType =
  | "checklists"
  | "templates"
  | "vehicles"
  | "settings"
  | "sync_queue"
  | "checklist_progress"
  | "model_data"

// Classe para gerenciar o armazenamento offline
export class OfflineStorage {
  private dbName: string
  private dbVersion: number
  private db: IDBDatabase | null = null
  private dbInitPromise: Promise<boolean> | null = null
  private syncQueueCache: Map<string, boolean> = new Map() // Cache para evitar duplicação na fila de sincronização

  constructor(dbName = "vehicle_checklist_db", dbVersion = 2) {
    // Increased version number to trigger upgrade
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

    console.log("Starting IndexedDB initialization...")

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

        console.log("Opening database:", this.dbName, "version:", this.dbVersion)
        const request = indexedDB.open(this.dbName, this.dbVersion)

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error
          console.error("Error opening database:", error)
          this.dbInitPromise = null // Resetar a promessa para permitir novas tentativas
          reject(new Error(`Error opening IndexedDB: ${error?.message || "Unknown"}`))
        }

        request.onsuccess = (event) => {
          console.log("Database opened successfully")
          this.db = (event.target as IDBOpenDBRequest).result

          // Configurar tratamento de erro para o banco de dados
          this.db.onerror = (event) => {
            console.error("Database error:", (event.target as IDBDatabase).error)
          }

          this.dbInitPromise = null // Limpar a promessa, pois a inicialização foi concluída
          resolve(true)
        }

        request.onupgradeneeded = (event) => {
          console.log("Upgrading database structure...")
          const db = (event.target as IDBOpenDBRequest).result

          // Criar stores para cada tipo de dado
          if (!db.objectStoreNames.contains("checklists")) {
            console.log("Creating store 'checklists'")
            db.createObjectStore("checklists", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("templates")) {
            console.log("Creating store 'templates'")
            db.createObjectStore("templates", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("vehicles")) {
            console.log("Creating store 'vehicles'")
            db.createObjectStore("vehicles", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("settings")) {
            console.log("Creating store 'settings'")
            db.createObjectStore("settings", { keyPath: "id" })
          }

          // Store para controlar sincronização
          if (!db.objectStoreNames.contains("sync_queue")) {
            console.log("Creating store 'sync_queue'")
            const syncStore = db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true })
            syncStore.createIndex("status", "status", { unique: false })
            syncStore.createIndex("timestamp", "timestamp", { unique: false })
            syncStore.createIndex("itemId", "itemId", { unique: false })
            syncStore.createIndex("type_itemId", ["type", "itemId"], { unique: false })
          }

          // Add new stores for model-specific data
          if (!db.objectStoreNames.contains("checklist_progress")) {
            console.log("Creating store 'checklist_progress'")
            db.createObjectStore("checklist_progress", { keyPath: "id" })
          }

          if (!db.objectStoreNames.contains("model_data")) {
            console.log("Creating store 'model_data'")
            const modelStore = db.createObjectStore("model_data", { keyPath: "id" })
            modelStore.createIndex("modelId", "modelId", { unique: false })
          }

          console.log("Database structure updated")
        }
      } catch (error) {
        console.error("Error initializing IndexedDB:", error)
        this.dbInitPromise = null
        reject(error)
      }
    })

    return this.dbInitPromise
  }

  // Modifique o método saveItem para verificar a flag fromApi

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

          // Verificar se o item já existe e se é um checklist já sincronizado
          if (type === "checklists") {
            const getRequest = store.get(item.id)

            getRequest.onsuccess = async () => {
              const existingItem = getRequest.result

              // Verificar se o item já está na fila de sincronização
              const cacheKey = `${type}_${item.id}`
              const isInSyncQueue = this.syncQueueCache.get(cacheKey)

              // Verificar se o item veio da API (não deve ser sincronizado novamente)
              const isFromApi = item.fromApi === true

              // Log detalhado para depuração
              console.log(
                `Item ${item.id} - Já na fila: ${isInSyncQueue}, Da API: ${isFromApi}, Já sincronizado: ${existingItem?.synced}`,
              )

              // Se o item já existe e está marcado como sincronizado, e o novo item também está marcado como sincronizado,
              // ou se o item veio da API, não adicione à fila de sincronização novamente
              const shouldAddToSyncQueue = !(
                (existingItem && existingItem.synced === true && item.synced === true) ||
                isInSyncQueue ||
                isFromApi
              )

              // Criar uma cópia limpa do objeto para evitar problemas de serialização
              const cleanItem = JSON.parse(JSON.stringify(item))
              const putRequest = store.put(cleanItem)

              putRequest.onsuccess = () => {
                console.log(`Item salvo com sucesso no store '${type}'`)

                // Adicionar à fila de sincronização apenas se necessário
                if (type === "checklists" && shouldAddToSyncQueue) {
                  console.log(`Adicionando checklist ${item.id} à fila de sincronização`)

                  // Verificar se o item já está na fila
                  this.getPendingSyncs().then(async (syncs) => {
                    const alreadyInQueue = syncs.some(
                      (entry) => entry.type === type && entry.itemId === item.id && entry.status === "pending",
                    )

                    if (!alreadyInQueue) {
                      this.addToSyncQueue(type, item.id, "create")
                        .then(() => {
                          console.log("Checklist adicionado à fila de sincronização")
                          // Marcar como adicionado ao cache
                          this.syncQueueCache.set(cacheKey, true)
                        })
                        .catch((err) => console.error("Erro ao adicionar à fila de sincronização:", err))
                    } else {
                      console.log(`Checklist ${item.id} já está na fila de sincronização, não adicionando novamente`)
                    }
                  })
                } else {
                  console.log(`Checklist ${item.id} NÃO adicionado à fila de sincronização porque:`)
                  if (isInSyncQueue) console.log("- Já está na fila de sincronização")
                  if (isFromApi) console.log("- Veio da API")
                  if (existingItem && existingItem.synced === true && item.synced === true)
                    console.log("- Já está sincronizado")
                }

                resolve(true)
              }

              putRequest.onerror = (event) => {
                const error = putRequest.error
                console.error(`Erro ao salvar item no IndexedDB:`, error)
                reject(new Error(`Erro ao salvar: ${error?.message || "Desconhecido"}`))
              }
            }

            getRequest.onerror = (event) => {
              console.error(`Erro ao verificar item existente:`, event)
              reject(new Error(`Erro ao verificar item existente: ${getRequest.error?.message || "Desconhecido"}`))
            }
          } else {
            // Para outros tipos de dados, verificar se veio da API
            const isFromApi = item.fromApi === true

            // Criar uma cópia limpa do objeto para evitar problemas de serialização
            const cleanItem = JSON.parse(JSON.stringify(item))
            const request = store.put(cleanItem)

            request.onsuccess = () => {
              console.log(`Item salvo com sucesso no store '${type}'`)

              // Verificar se o item já está na fila de sincronização
              const cacheKey = `${type}_${item.id}`
              const isInSyncQueue = this.syncQueueCache.get(cacheKey)

              // Para outros tipos de dados, adicionar à fila apenas se estiver offline e não for da API
              if (!navigator.onLine && !isInSyncQueue && !isFromApi) {
                this.addToSyncQueue(type, item.id, "create")
                  .then(() => {
                    console.log("Item adicionado à fila de sincronização")
                    // Marcar como adicionado ao cache
                    this.syncQueueCache.set(cacheKey, true)
                  })
                  .catch((err) => console.error("Erro ao adicionar à fila de sincronização:", err))
              } else if (isFromApi) {
                console.log(`Item ${item.id} não adicionado à fila porque veio da API`)
              }

              resolve(true)
            }

            request.onerror = (event) => {
              const error = request.error
              console.error(`Erro ao salvar item no IndexedDB:`, error)
              reject(new Error(`Erro ao salvar: ${error?.message || "Desconhecido"}`))
            }
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
          // Primeiro, verificar se já existe uma entrada para este item na fila
          const transaction = this.db.transaction(["sync_queue"], "readwrite")
          const store = transaction.objectStore("sync_queue")
          const index = store.index("type_itemId")
          const request = index.getAll([type, itemId])

          request.onsuccess = () => {
            const existingEntries = request.result

            // Se já existe uma entrada pendente para este item, não adicionar novamente
            if (existingEntries && existingEntries.length > 0) {
              const pendingEntries = existingEntries.filter((entry) => entry.status === "pending")
              if (pendingEntries.length > 0) {
                console.log(`Item ${type}/${itemId} já está na fila de sincronização, não adicionando novamente`)
                resolve(true)
                return
              }
            }

            // Se não existe, adicionar à fila
            const addRequest = store.add({
              type,
              itemId,
              operation,
              status: "pending",
              timestamp: new Date().toISOString(),
            })

            addRequest.onsuccess = () => {
              console.log(`Item ${type}/${itemId} adicionado à fila de sincronização`)
              resolve(true)
            }

            addRequest.onerror = (event) => {
              console.error(`Erro ao adicionar à fila de sincronização:`, event)
              reject(false)
            }
          }

          request.onerror = (event) => {
            console.error(`Erro ao verificar fila de sincronização:`, event)
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
                // Remover do cache de sincronização
                const cacheKey = `${item.type}_${item.itemId}`
                this.syncQueueCache.delete(cacheKey)

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
                // Limpar o cache de sincronização
                this.syncQueueCache.clear()
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

  // Método para buscar um checklist específico por ID
  async getChecklistById(checklistId: string) {
    try {
      if (!this.db) {
        await this.init()
      }

      const transaction = this.db!.transaction(["checklists"], "readonly")
      const store = transaction.objectStore("checklists")

      return new Promise((resolve, reject) => {
        const request = store.get(checklistId)

        request.onsuccess = (event) => {
          const checklist = request.result
          resolve(checklist || null)
        }

        request.onerror = (event) => {
          console.error("Erro ao buscar checklist por ID:", event)
          reject(new Error("Falha ao buscar checklist do armazenamento local"))
        }
      })
    } catch (error) {
      console.error("Erro ao acessar o banco de dados:", error)
      return null
    }
  }

  // Add a method to get an item by ID
  async getItemById<T>(type: DataType, id: string): Promise<T | null> {
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
          // Check if the object store exists
          if (!this.db.objectStoreNames.contains(type)) {
            console.error(`Object store '${type}' does not exist`)
            resolve(null)
            return
          }

          const transaction = this.db.transaction([type], "readonly")
          const store = transaction.objectStore(type)
          const request = store.get(id)

          request.onsuccess = () => {
            resolve(request.result || null)
          }

          request.onerror = (event) => {
            console.error(`Error getting item from IndexedDB:`, event)
            reject(null)
          }
        } catch (error) {
          console.error(`Error in IndexedDB transaction:`, error)
          reject(null)
        }
      })
    } catch (error) {
      console.error(`Error getting item:`, error)
      return null
    }
  }
}

// Singleton para uso em toda a aplicação
export const offlineStorage = new OfflineStorage()
