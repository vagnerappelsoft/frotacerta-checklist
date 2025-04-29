"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, CheckCircle, AlertCircle, Clock, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { offlineStorage } from "@/lib/offline-storage"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { apiService } from "@/lib/api-service"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface MyChecklistsScreenProps {
  onViewChecklist?: (checklist: any, action?: string) => void
  offlineChecklists?: any[] // Checklists for offline use
}

export function MyChecklistsScreen({ onViewChecklist, offlineChecklists }: MyChecklistsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [completedChecklists, setCompletedChecklists] = useState<any[]>([])
  const [pendingChecklists, setPendingChecklists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"api" | "local" | "props" | null>(null)
  const { isOnline } = useOnlineStatus()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Helper function to get the most relevant date from a checklist
  const getRelevantDate = useCallback((checklist: any): number => {
    // Try different date fields in order of preference
    if (checklist.submittedAt) {
      return new Date(checklist.submittedAt).getTime()
    }
    if (checklist.finishDate) {
      return new Date(checklist.finishDate).getTime()
    }
    if (checklist.startDate) {
      return new Date(checklist.startDate).getTime()
    }
    if (checklist.createdAt) {
      return new Date(checklist.createdAt).getTime()
    }
    // If no valid date is found, use current time as fallback
    return Date.now()
  }, [])

  // Function to count issues in a checklist
  const countIssues = useCallback((checklist: any) => {
    let count = 0

    if (!checklist || !checklist.responses) return 0

    // Get the items from the template or directly from the checklist
    const items = checklist.template?.items || checklist.items || []

    // Check each response against its corresponding item
    Object.entries(checklist.responses).forEach(([key, value]) => {
      // Skip special fields like photos, audios, location, etc.
      if (
        key === "photos" ||
        key === "audios" ||
        key === "location" ||
        key === "vehicleKilometer" ||
        key.includes("-observation")
      ) {
        return
      }

      // Find the corresponding item
      const item = items.find((i: any) => i.id === key)

      // Count issues based on item type
      if (item) {
        if (item.type === "boolean" && value === false) {
          count++
        } else if (item.type === "condition" && (value === "Regular" || value === "Ruim")) {
          count++
        } else if (item.type === "select" && value === "Não OK") {
          count++
        }
      }
    })

    return count
  }, [])

  // Function to normalize checklist data from different sources
  const normalizeChecklistData = useCallback((checklist: any) => {
    // Create a deep copy to avoid modifying the original
    const normalizedChecklist = JSON.parse(JSON.stringify(checklist))

    // Ensure template data is properly structured
    if (!normalizedChecklist.template && normalizedChecklist.model) {
      normalizedChecklist.template = {
        id: normalizedChecklist.model.id,
        title: normalizedChecklist.model.name || normalizedChecklist.name,
        name: normalizedChecklist.model.name || normalizedChecklist.name,
        items: normalizedChecklist.model.items || [],
      }
    }

    // Ensure vehicle data is properly structured
    if (!normalizedChecklist.vehicle && normalizedChecklist.vehicleData && normalizedChecklist.vehicleData.length > 0) {
      normalizedChecklist.vehicle = {
        id: normalizedChecklist.vehicleData[0].vehicleId,
        name: normalizedChecklist.vehicleData[0].vehicle?.name || "Veículo não especificado",
        licensePlate: normalizedChecklist.vehicleData[0].vehicle?.plate || "Sem placa",
      }
    }

    // Ensure status is properly structured
    if (!normalizedChecklist.status) {
      // Determine status based on flowSize and flowStep
      const flowSize = normalizedChecklist.flowSize || 1
      const flowStep = normalizedChecklist.flowStep || 1

      normalizedChecklist.status = {
        id: flowStep >= flowSize ? 1 : 2, // 1 = Completed, 2 = In Progress
        name: flowStep >= flowSize ? "Concluído" : "Em Andamento",
      }
    }

    return normalizedChecklist
  }, [])

  // Function to refresh data
  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      console.log("Refreshing checklists data...")

      // If we're online, try to fetch from API first
      if (isOnline) {
        try {
          console.log("Attempting to fetch checklists from API...")
          apiService.setMockMode(false)

          // Use the dedicated checklists endpoint instead
          const apiChecklists = await apiService.getChecklists()

          // Processar API checklists - não tratar lista vazia como erro
          console.log(`Retrieved ${apiChecklists.length} checklists from API`)

          // Process API checklists
          const apiChecklistsNormalized = apiChecklists.map(normalizeChecklistData)

          console.log("Normalized API checklists:", apiChecklistsNormalized.length)

          // Save to local storage with API flag
          for (const checklist of apiChecklistsNormalized) {
            // Mark as coming from API to avoid re-syncing
            checklist.fromApi = true
            await offlineStorage.saveItem("checklists", checklist)
          }

          // Separate completed and pending checklists
          const completed = apiChecklistsNormalized.filter(
            (checklist) =>
              checklist.status?.id === 1 ||
              (checklist.submittedAt && (!checklist.flowSize || checklist.flowSize === 1)),
          )

          const pending = apiChecklistsNormalized.filter(
            (checklist) =>
              checklist.status?.id === 2 || (checklist.flowSize > 1 && checklist.flowStep < checklist.flowSize),
          )

          // Sort by date
          completed.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))
          pending.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))

          setCompletedChecklists(completed)
          setPendingChecklists(pending)
          setDataSource("api")
          setIsLoading(false)
          setIsRefreshing(false)
          return
        } catch (apiError) {
          console.error("Error fetching from API:", apiError)
          // Continue to fallback options
        }
      }

      // If API fetch failed or we're offline, try using provided props
      if (offlineChecklists && offlineChecklists.length > 0) {
        console.log("Using provided offline checklists:", offlineChecklists.length)

        // Normalize and process the checklists
        const normalizedChecklists = offlineChecklists.map(normalizeChecklistData)

        // Separate completed and pending
        const completed = normalizedChecklists.filter(
          (checklist) =>
            checklist.status?.id === 1 || (checklist.submittedAt && (!checklist.flowSize || checklist.flowSize === 1)),
        )

        const pending = normalizedChecklists.filter(
          (checklist) =>
            checklist.status?.id === 2 || (checklist.flowSize > 1 && checklist.flowStep < checklist.flowSize),
        )

        // Sort by date
        completed.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))
        pending.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))

        setCompletedChecklists(completed)
        setPendingChecklists(pending)
        setDataSource("props")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      // Last resort: load from local storage
      console.log("Fetching checklists from local storage...")
      const localChecklists = await offlineStorage.getAllItems<any>("checklists")
      console.log("Local storage checklists:", localChecklists.length)

      if (localChecklists.length > 0) {
        // Normalize and process the checklists
        const normalizedChecklists = localChecklists.map(normalizeChecklistData)

        // Separate completed and pending
        const completed = normalizedChecklists.filter(
          (checklist) =>
            checklist.status?.id === 1 || (checklist.submittedAt && (!checklist.flowSize || checklist.flowSize === 1)),
        )

        const pending = normalizedChecklists.filter(
          (checklist) =>
            checklist.status?.id === 2 || (checklist.flowSize > 1 && checklist.flowStep < checklist.flowSize),
        )

        // Sort by date
        completed.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))
        pending.sort((a, b) => getRelevantDate(b) - getRelevantDate(a))

        setCompletedChecklists(completed)
        setPendingChecklists(pending)
        setDataSource("local")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      // If we get here, we couldn't load any data
      setCompletedChecklists([])
      setPendingChecklists([])
      setError("Não foi possível carregar os checklists. Tente novamente mais tarde.")
      setDataSource(null)
    } catch (error) {
      console.error("Error loading checklists:", error)
      setError("Erro ao carregar checklists: " + (error instanceof Error ? error.message : "Erro desconhecido"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isOnline, offlineChecklists, normalizeChecklistData, getRelevantDate])

  // Load checklists on component mount and when refreshTrigger changes
  useEffect(() => {
    refreshData()
  }, [refreshData, refreshTrigger])

  // Filter and sort checklists based on search query
  const filteredCompleted = completedChecklists
    .filter((checklist) => {
      // Check if the checklist has the necessary properties
      const title = checklist.template?.title || checklist.title || checklist.name || ""
      const vehicleName = checklist.vehicle?.name || checklist.vehicle || ""
      const licensePlate = checklist.vehicle?.licensePlate || checklist.vehicle?.plate || checklist.licensePlate || ""

      return (
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    // Ensure filtered checklists are also sorted
    .sort((a, b) => getRelevantDate(b) - getRelevantDate(a))

  const filteredPending = pendingChecklists.filter((checklist) => {
    // Check if the checklist has the necessary properties
    const title = checklist.template?.title || checklist.title || checklist.name || ""
    const vehicleName = checklist.vehicle?.name || checklist.vehicle || ""
    const licensePlate = checklist.vehicle?.licensePlate || checklist.vehicle?.plate || checklist.licensePlate || ""

    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Render a completed checklist
  const renderCompletedChecklist = (checklist: any) => {
    const issuesCount = countIssues(checklist)

    // Get the most relevant date
    let submittedDate
    try {
      if (checklist.submittedAt) {
        submittedDate = new Date(checklist.submittedAt)
      } else if (checklist.finishDate) {
        submittedDate = new Date(checklist.finishDate)
      } else if (checklist.startDate) {
        submittedDate = new Date(checklist.startDate)
      } else if (checklist.createdAt) {
        submittedDate = new Date(checklist.createdAt)
      } else {
        submittedDate = new Date() // Fallback to current date
      }

      // Check if the date is valid
      if (isNaN(submittedDate.getTime())) {
        submittedDate = new Date() // Fallback to current date
      }
    } catch (error) {
      submittedDate = new Date() // Fallback to current date
    }

    // Extract checklist title with fallbacks
    const title =
      checklist.template?.title ||
      checklist.template?.name ||
      checklist.model?.name ||
      checklist.name ||
      checklist.title ||
      "Checklist sem título"

    // Extract vehicle information with fallbacks
    const vehicleData = checklist.vehicleData && checklist.vehicleData.length > 0 ? checklist.vehicleData[0] : null

    const vehicleName =
      checklist.vehicle?.name || vehicleData?.vehicle?.name || checklist.vehicle || "Veículo não especificado"

    const licensePlate =
      checklist.vehicle?.licensePlate ||
      checklist.vehicle?.plate ||
      checklist.licensePlate ||
      vehicleData?.vehicle?.plate ||
      "Sem placa"

    return (
      <Card key={checklist.id} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{title}</CardTitle>
            {issuesCount === 0 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Concluído
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="mr-1 h-3 w-3" />
                {issuesCount} Problema{issuesCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <CardDescription>
            {vehicleName} ({licensePlate})
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>
              Concluído em:{" "}
              {submittedDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Badge variant={checklist.synced ? "outline" : "secondary"} className="text-xs">
              {checklist.synced ? "Sincronizado" : "Pendente de sincronização"}
            </Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => onViewChecklist && onViewChecklist(checklist)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render a pending checklist
  const renderPendingChecklist = (checklist: any) => {
    // Extract checklist title with fallbacks
    const title =
      checklist.template?.title ||
      checklist.template?.name ||
      checklist.model?.name ||
      checklist.name ||
      checklist.title ||
      "Checklist sem título"

    // Extract vehicle information with fallbacks
    const vehicleData = checklist.vehicleData && checklist.vehicleData.length > 0 ? checklist.vehicleData[0] : null

    const vehicleName =
      checklist.vehicle?.name || vehicleData?.vehicle?.name || checklist.vehicle || "Veículo não especificado"

    const licensePlate =
      checklist.vehicle?.licensePlate ||
      checklist.vehicle?.plate ||
      checklist.licensePlate ||
      vehicleData?.vehicle?.plate ||
      "Sem placa"

    // Get the start date
    let startDate
    try {
      if (checklist.startDate) {
        startDate = new Date(checklist.startDate)
      } else if (checklist.createdAt) {
        startDate = new Date(checklist.createdAt)
      } else if (checklist.submittedAt) {
        startDate = new Date(checklist.submittedAt)
      } else {
        startDate = new Date() // Fallback to current date
      }

      // Check if the date is valid
      if (isNaN(startDate.getTime())) {
        startDate = new Date() // Fallback to current date
      }
    } catch (error) {
      startDate = new Date() // Fallback to current date
    }

    return (
      <Card key={checklist.id} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Etapa {checklist.flowStep || 1} de {checklist.flowSize || 2}
            </Badge>
          </div>
          <CardDescription>
            {vehicleName} ({licensePlate})
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>
              Iniciado em:{" "}
              {startDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onViewChecklist && onViewChecklist(checklist, "continue")}
          >
            <Eye className="h-4 w-4 mr-2" />
            Continuar Checklist
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Checklists</h1>
            <p className="text-muted-foreground">Histórico e pendências</p>
          </div>
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Data source indicator */}
      {dataSource && !isLoading && (
        <div className="mb-4">
          <Badge variant="outline" className="text-xs">
            {dataSource === "api" ? "Dados da API" : dataSource === "local" ? "Dados locais" : "Dados fornecidos"}
          </Badge>
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant={error.includes("Não há checklists disponíveis") ? "default" : "destructive"} className="mb-4">
          <AlertTitle>
            {error.includes("Não há checklists disponíveis") ? "Informação" : "Erro ao carregar checklists"}
          </AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar checklist ou veículo..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="completed" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Em Andamento ({filteredPending.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({filteredCompleted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredPending.length > 0 ? (
              <div className="space-y-4 pb-4">{filteredPending.map(renderPendingChecklist)}</div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum checklist em andamento</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="completed">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredCompleted.length > 0 ? (
              <div className="space-y-4 pb-4">{filteredCompleted.map(renderCompletedChecklist)}</div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum checklist concluído encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete um checklist na seção "Aplicar Checklist" para vê-lo aqui.
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
