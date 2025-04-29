"use client"

import { useState } from "react"
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

  const filteredChecklists = checklists.filter(
    (checklist) =>
      checklist.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checklist.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checklist.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()),
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
