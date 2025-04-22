"use client"

import { useState, useEffect } from "react"
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

interface MyChecklistsScreenProps {
  onViewChecklist?: (checklist: any) => void
  offlineChecklists?: any[] // Checklists para uso offline
}

export function MyChecklistsScreen({ onViewChecklist, offlineChecklists }: MyChecklistsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [completedChecklists, setCompletedChecklists] = useState<any[]>([])
  const [pendingChecklists, setPendingChecklists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isOnline } = useOnlineStatus()

  // Carregar checklists do armazenamento local
  useEffect(() => {
    const loadChecklists = async () => {
      try {
        setIsLoading(true)

        // Se temos checklists offline fornecidos, usá-los
        if (offlineChecklists) {
          setCompletedChecklists(offlineChecklists)
          setPendingChecklists([])
          setIsLoading(false)
          return
        }

        // Caso contrário, carregar do armazenamento local
        const allChecklists = await offlineStorage.getAllItems<any>("checklists")

        // Separar em concluídos e pendentes
        const completed = allChecklists.filter((checklist) => checklist.submittedAt)
        const pending = [] // Em um app real, você teria checklists pendentes

        // Ordenar por data (mais recentes primeiro)
        completed.sort((a, b) => {
          const dateA = new Date(a.submittedAt).getTime()
          const dateB = new Date(b.submittedAt).getTime()
          return dateB - dateA
        })

        setCompletedChecklists(completed)
        setPendingChecklists(pending)
      } catch (error) {
        console.error("Erro ao carregar checklists:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChecklists()
  }, [offlineChecklists])

  // Filtrar checklists com base na pesquisa
  const filteredCompleted = completedChecklists.filter((checklist) => {
    // Verificar se o checklist tem as propriedades necessárias
    const title = checklist.template?.title || checklist.title || ""
    const vehicleName = checklist.vehicle?.name || checklist.vehicle || ""
    const licensePlate = checklist.vehicle?.licensePlate || checklist.licensePlate || ""

    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const filteredPending = pendingChecklists.filter((checklist) => {
    // Verificar se o checklist tem as propriedades necessárias
    const title = checklist.template?.title || checklist.title || ""
    const vehicleName = checklist.vehicle?.name || checklist.vehicle || ""
    const licensePlate = checklist.vehicle?.licensePlate || checklist.licensePlate || ""

    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Função para contar problemas em um checklist
  const countIssues = (checklist: any) => {
    let count = 0

    if (!checklist.responses) return 0

    Object.entries(checklist.responses).forEach(([key, value]) => {
      // Apenas contar respostas booleanas que são false
      const items = checklist.template?.items || checklist.items || []
      const item = items.find((i: any) => i.id === key)
      if (item && item.type === "boolean" && value === false) {
        count++
      }
    })

    return count
  }

  // Renderizar um checklist concluído
  const renderCompletedChecklist = (checklist: any) => {
    const issuesCount = countIssues(checklist)
    const submittedDate = new Date(checklist.submittedAt)
    const title = checklist.template?.title || checklist.title
    const vehicleName = checklist.vehicle?.name || checklist.vehicle
    const licensePlate = checklist.vehicle?.licensePlate || checklist.licensePlate

    return (
      <Card key={checklist.id} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{title}</CardTitle>
            {issuesCount === 0 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Aprovado
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
          <TabsTrigger value="pending">Pendentes ({filteredPending.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({filteredCompleted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredPending.length > 0 ? (
              <div className="space-y-4 pb-4">
                {filteredPending.map((checklist) => (
                  <Card key={checklist.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    {/* Conteúdo do checklist pendente */}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum checklist pendente encontrado</p>
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
