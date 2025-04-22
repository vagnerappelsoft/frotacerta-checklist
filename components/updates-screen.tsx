"use client"

import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Dados de exemplo para as atualizações
const UPDATES = [
  {
    version: "1.2.0",
    date: "15/06/2023",
    isLatest: true,
    changes: [
      {
        type: "new",
        description: "Adicionado suporte para funcionamento offline",
      },
      {
        type: "new",
        description: "Novos tipos de resposta com botões visuais",
      },
      {
        type: "new",
        description: "Adicionada página de últimas atualizações",
      },
      {
        type: "improved",
        description: "Melhorada a sincronização de dados com o servidor",
      },
      {
        type: "fixed",
        description: "Corrigido problema com upload de fotos em conexões lentas",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "01/05/2023",
    isLatest: false,
    changes: [
      {
        type: "new",
        description: "Adicionado suporte para fotos obrigatórias nos checklists",
      },
      {
        type: "new",
        description: "Adicionado suporte para observações obrigatórias",
      },
      {
        type: "improved",
        description: "Interface redesenhada para melhor usabilidade",
      },
      {
        type: "fixed",
        description: "Corrigidos problemas de validação de formulários",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "15/03/2023",
    isLatest: false,
    changes: [
      {
        type: "new",
        description: "Lançamento inicial do aplicativo",
      },
      {
        type: "new",
        description: "Suporte para checklists veiculares básicos",
      },
      {
        type: "new",
        description: "Histórico de checklists realizados",
      },
    ],
  },
]

interface UpdatesScreenProps {
  onBack: () => void
}

export function UpdatesScreen({ onBack }: UpdatesScreenProps) {
  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Últimas Atualizações</h1>
          <p className="text-sm text-muted-foreground">Novidades e melhorias do aplicativo</p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-150px)]">
        <div className="space-y-6 pb-6">
          {UPDATES.map((update, index) => (
            <Card key={update.version}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Versão {update.version}</CardTitle>
                  {update.isLatest && <Badge className="bg-blue-500 hover:bg-blue-600">Atual</Badge>}
                </div>
                <CardDescription>Lançada em {update.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {update.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={
                        change.type === "new"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : change.type === "improved"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {change.type === "new" ? "Novo" : change.type === "improved" ? "Melhorado" : "Corrigido"}
                    </Badge>
                    <p className="text-sm">{change.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
