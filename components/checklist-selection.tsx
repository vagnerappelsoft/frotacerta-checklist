"use client"

import { useState, useEffect } from "react"
import { Search, Truck, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChecklistSelectionProps {
  onSelectChecklist: (checklist: any) => void
  checklists: any[] // Receive checklists from props instead of using mock data
}

export function ChecklistSelection({ onSelectChecklist, checklists = [] }: ChecklistSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredChecklists, setFilteredChecklists] = useState<any[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Filter checklists based on search query
  useEffect(() => {
    const filtered = checklists.filter(
      (checklist) =>
        checklist.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checklist.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checklist.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredChecklists(filtered)
  }, [checklists, searchQuery])

  // Handle checklist selection with model isolation
  const handleSelectChecklist = async (checklist: any) => {
    try {
      // Get the model ID from the checklist
      const modelId = checklist.template?.id || checklist.modelId || null

      // If we have a model ID and it's different from the previously selected one
      if (modelId && modelId !== selectedModelId) {
        console.log(`Switching from model ${selectedModelId} to ${modelId}`)

        // Store the current model ID
        setSelectedModelId(modelId)

        // Clear any continuing checklist data that might be from a different model
        const continuingData = localStorage.getItem("continuing_checklist")
        if (continuingData) {
          try {
            const parsedData = JSON.parse(continuingData)
            if (parsedData.modelId !== modelId.toString()) {
              console.log(`Clearing continuing checklist data from different model: ${parsedData.modelId}`)
              localStorage.removeItem("continuing_checklist")
            }
          } catch (e) {
            console.error("Error parsing continuing checklist data:", e)
            localStorage.removeItem("continuing_checklist")
          }
        }

        // Save the selected model ID for reference
        localStorage.setItem("selected_model_id", modelId.toString())
      }

      // Call the parent component's handler
      onSelectChecklist(checklist)
    } catch (error) {
      console.error("Error handling checklist selection:", error)
      // Call the parent component's handler anyway
      onSelectChecklist(checklist)
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Checklists Veiculares</h1>
          <p className="text-muted-foreground">Selecione um checklist para preencher</p>
        </div>
        <Avatar>
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
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

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4 pb-4">
          {filteredChecklists.length > 0 ? (
            filteredChecklists.map((checklist) => (
              <Card key={checklist.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{checklist.title}</CardTitle>
                    <Badge variant={checklist.status === "pending" ? "outline" : "secondary"}>
                      {checklist.status === "pending" ? "Pendente" : "Concluído"}
                    </Badge>
                  </div>
                  <CardDescription>{checklist.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Truck className="mr-2 h-4 w-4" />
                    <span>
                      {checklist.vehicle} ({checklist.licensePlate})
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Vencimento: {new Date(checklist.dueDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => handleSelectChecklist(checklist)}
                  >
                    Iniciar Checklist
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum checklist encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
