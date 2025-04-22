"use client"

import { useState } from "react"
import { Search, Truck, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock data - in a real app this would come from your API
const MOCK_CHECKLISTS = [
  {
    id: "1",
    title: "Inspeção Diária - Caminhão de Entrega",
    description: "Checklist de inspeção diária para caminhões de entrega antes de iniciar a rota",
    vehicle: "Caminhão Mercedes-Benz Atego 2430",
    licensePlate: "ABC1234",
    dueDate: new Date(),
    status: "pending",
    items: [
      { id: "1-1", question: "Nível de óleo do motor está adequado?", type: "boolean" },
      { id: "1-2", question: "Nível de água do radiador está adequado?", type: "boolean" },
      { id: "1-3", question: "Pressão dos pneus está correta?", type: "boolean" },
      { id: "1-4", question: "Luzes funcionando corretamente?", type: "boolean" },
      { id: "1-5", question: "Freios funcionando adequadamente?", type: "boolean" },
      { id: "1-6", question: "Documentos do veículo estão em ordem?", type: "boolean" },
      { id: "1-7", question: "Observações adicionais", type: "text" },
    ],
  },
  {
    id: "2",
    title: "Inspeção Semanal - Van de Distribuição",
    description: "Checklist de inspeção semanal para vans de distribuição",
    vehicle: "Van Fiat Ducato Cargo",
    licensePlate: "DEF5678",
    dueDate: new Date(Date.now() + 86400000), // tomorrow
    status: "pending",
    items: [
      { id: "2-1", question: "Nível de óleo do motor está adequado?", type: "boolean" },
      { id: "2-2", question: "Nível de água do radiador está adequado?", type: "boolean" },
      { id: "2-3", question: "Pressão dos pneus está correta?", type: "boolean" },
      { id: "2-4", question: "Luzes funcionando corretamente?", type: "boolean" },
      { id: "2-5", question: "Freios funcionando adequadamente?", type: "boolean" },
      { id: "2-6", question: "Documentos do veículo estão em ordem?", type: "boolean" },
      { id: "2-7", question: "Estado da suspensão", type: "rating" },
      { id: "2-8", question: "Observações adicionais", type: "text" },
    ],
  },
  {
    id: "3",
    title: "Inspeção Mensal - Frota Completa",
    description: "Checklist de inspeção mensal detalhada para todos os veículos",
    vehicle: "Todos os veículos da frota",
    licensePlate: "Múltiplos",
    dueDate: new Date(Date.now() + 259200000), // 3 days from now
    status: "pending",
    items: [
      { id: "3-1", question: "Sistema de freios", type: "rating" },
      { id: "3-2", question: "Sistema de direção", type: "rating" },
      { id: "3-3", question: "Sistema de suspensão", type: "rating" },
      { id: "3-4", question: "Sistema elétrico", type: "rating" },
      { id: "3-5", question: "Condição dos pneus", type: "rating" },
      { id: "3-6", question: "Nível de fluidos", type: "rating" },
      { id: "3-7", question: "Observações detalhadas", type: "text" },
    ],
  },
]

interface ChecklistSelectionProps {
  onSelectChecklist: (checklist: any) => void
}

export function ChecklistSelection({ onSelectChecklist }: ChecklistSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChecklists = MOCK_CHECKLISTS.filter(
    (checklist) =>
      checklist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checklist.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checklist.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Checklists Veiculares</h1>
          <p className="text-muted-foreground">Selecione um checklist para preencher</p>
        </div>
        <Avatar>
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
          <AvatarFallback>MO</AvatarFallback>
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
                    <span>Vencimento: {checklist.dueDate.toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => onSelectChecklist(checklist)}
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
