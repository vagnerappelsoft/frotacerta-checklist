// Nome do cache
const CACHE_NAME = "checklist-veicular-v5"

// Lista de recursos essenciais para o funcionamento offline
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-384x384.png",
  "/icon-512x512.png",
]

// Lista de padrões de URL a serem ignorados no cache
const IGNORE_PATTERNS = [/\/api\//, /chrome-extension:\/\//, /\/socket.io\//]

// Função para verificar se uma URL deve ser ignorada
const shouldIgnoreUrl = (url) => {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(url))
}

// Função para cachear todos os recursos da página atual
const cacheCurrentPage = async () => {
  try {
    const cache = await caches.open(CACHE_NAME)

    // Obter todos os recursos carregados na página
    const resources = Array.from(
      new Set(
        performance
          .getEntriesByType("resource")
          .map((r) => new URL(r.name, self.location.origin).pathname)
          .filter((pathname) => !shouldIgnoreUrl(pathname)),
      ),
    )

    console.log("[Service Worker] Recursos a serem cacheados:", resources)

    // Adicionar recursos ao cache
    await Promise.all(
      resources.map(async (resource) => {
        try {
          // Verificar se o recurso já está no cache
          const cacheResponse = await cache.match(resource)
          if (cacheResponse) {
            console.log(`[Service Worker] Recurso já em cache: ${resource}`)
            return
          }

          const response = await fetch(resource, { cache: "no-store" })
          if (response.ok) {
            await cache.put(resource, response)
            console.log(`[Service Worker] Recurso cacheado: ${resource}`)
          }
        } catch (err) {
          console.error(`[Service Worker] Falha ao cachear recurso: ${resource}`, err)
        }
      }),
    )

    // Adicionar também os recursos essenciais
    await Promise.all(
      CORE_ASSETS.map(async (asset) => {
        try {
          // Verificar se o recurso já está no cache
          const cacheResponse = await cache.match(asset)
          if (cacheResponse) {
            return
          }

          const response = await fetch(asset, { cache: "no-store" })
          if (response.ok) {
            await cache.put(asset, response)
            console.log(`[Service Worker] Recurso essencial cacheado: ${asset}`)
          }
        } catch (err) {
          console.error(`[Service Worker] Falha ao cachear recurso essencial: ${asset}`, err)
        }
      }),
    )

    console.log("[Service Worker] Recursos da página atual cacheados")
  } catch (err) {
    console.error("[Service Worker] Erro ao cachear recursos da página:", err)
  }
}

// Função para pré-cachear recursos essenciais
const precacheEssentialResources = async () => {
  try {
    const cache = await caches.open(CACHE_NAME)
    console.log("[Service Worker] Pré-cacheando recursos essenciais")

    // Adicionar recursos essenciais ao cache
    await cache.addAll(CORE_ASSETS)

    // Adicionar também os dados de exemplo para uso offline
    const mockDataFiles = ["/data/mock-templates.ts", "/data/mock-vehicles.ts", "/data/mock-checklists.ts"]

    await Promise.all(
      mockDataFiles.map(async (file) => {
        try {
          const response = await fetch(file, { cache: "no-store" })
          if (response.ok) {
            await cache.put(file, response)
            console.log(`[Service Worker] Dados de exemplo cacheados: ${file}`)
          }
        } catch (err) {
          console.error(`[Service Worker] Falha ao cachear dados de exemplo: ${file}`, err)
        }
      }),
    )

    console.log("[Service Worker] Pré-cache concluído")
  } catch (err) {
    console.error("[Service Worker] Erro ao pré-cachear recursos:", err)
  }
}

// Instalar o service worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Instalando Service Worker...")
  event.waitUntil(
    precacheEssentialResources().then(() => {
      console.log("[Service Worker] Instalação concluída, forçando ativação")
      return self.skipWaiting()
    }),
  )
})

// Ativar o service worker
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Ativando Service Worker...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Removendo cache antigo:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("[Service Worker] Reivindicando clientes")
        return self.clients.claim()
      })
      .then(() => {
        // Após ativação, tentar cachear recursos da página atual
        return cacheCurrentPage()
      }),
  )
})

// Interceptar requisições
self.addEventListener("fetch", (event) => {
  // Ignorar requisições para APIs ou outros domínios
  if (shouldIgnoreUrl(event.request.url) || event.request.method !== "GET") {
    return
  }

  console.log("[Service Worker] Interceptando requisição:", event.request.url)

  event.respondWith(
    // Estratégia: Cache First, Network Fallback
    caches
      .match(event.request)
      .then((cachedResponse) => {
        // Se encontrou no cache, retorna a resposta cacheada
        if (cachedResponse) {
          console.log("[Service Worker] Retornando do cache:", event.request.url)

          // Atualizar o cache em segundo plano (stale-while-revalidate)
          if (navigator.onLine) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                    console.log("[Service Worker] Cache atualizado em segundo plano:", event.request.url)
                  })
                }
              })
              .catch(() => {
                // Ignorar erros na atualização em segundo plano
              })
          }

          return cachedResponse
        }

        // Se não encontrou no cache, tenta buscar da rede
        console.log("[Service Worker] Não encontrado no cache, buscando da rede:", event.request.url)
        return fetch(event.request)
          .then((networkResponse) => {
            // Se a resposta da rede não for válida, retorna um erro
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
              console.log("[Service Worker] Resposta da rede inválida:", event.request.url)
              return networkResponse
            }

            // Clona a resposta para poder armazená-la no cache
            const responseToCache = networkResponse.clone()

            // Armazena a resposta no cache para uso futuro
            caches.open(CACHE_NAME).then((cache) => {
              console.log("[Service Worker] Cacheando novo recurso:", event.request.url)
              cache.put(event.request, responseToCache)
            })

            return networkResponse
          })
          .catch((error) => {
            console.error("[Service Worker] Erro ao buscar da rede:", error)

            // Se for uma página HTML, retorna a página offline
            if (event.request.headers.get("Accept")?.includes("text/html")) {
              console.log("[Service Worker] Retornando página principal para navegação offline")
              return caches.match("/")
            }

            // Para outros recursos, retorna um erro
            return new Response("Erro de rede. Verifique sua conexão.", {
              status: 408,
              headers: { "Content-Type": "text/plain" },
            })
          })
      }),
  )
})

// Responder a mensagens do cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_CURRENT_PAGE") {
    console.log("[Service Worker] Recebido pedido para cachear página atual")
    cacheCurrentPage()
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
