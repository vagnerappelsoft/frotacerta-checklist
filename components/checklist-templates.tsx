"use client"

import { useState } from "react"
import { Search, ArrowRight, Clock } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// Importar dados de exemplo para uso offline
import { CHECKLIST_TEMPLATES, getIconByName } from "@/data/mock-templates"

// Define DEFAULT_TEMPLATES, using CHECKLIST_TEMPLATES as a fallback if it's available
const DEFAULT_TEMPLATES = CHECKLIST_TEMPLATES || []

interface ChecklistTemplatesProps {
  onSelectTemplate: (template: any) => void
  templates?: any[] // Templates para uso offline
}

export function ChecklistTemplates({ onSelectTemplate, templates = DEFAULT_TEMPLATES }: ChecklistTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = templates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aplicar Checklist</h1>
          <p className="text-muted-foreground">Selecione o tipo de checklist</p>
        </div>
        <Avatar>
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
          <AvatarFallback>MO</AvatarFallback>
        </Avatar>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tipo de checklist..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="grid grid-cols-1 gap-4 pb-4">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => {
              // Extrair a cor base do template para uso consistente
              const colorName = template.color.split("-")[1] || "blue"
              const colorIntensity = "500"
              const borderColorClass = `border-${colorName}-${colorIntensity}`
              const bgColorClass = `bg-${colorName}-50`
              const iconColorClass = `text-${colorName}-${colorIntensity}`

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${borderColorClass} hover:scale-[1.01]`}
                  onClick={() => onSelectTemplate(template)}
                >
                  <CardHeader className={`pb-2 ${bgColorClass} rounded-tr-lg`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-white shadow-sm`}>
                        {getIconByName(template.iconName, `h-6 w-6 ${iconColorClass}`)}
                      </div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0 pb-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>{template.estimatedTime}</span>
                    </div>
                    <Button variant="ghost" size="sm" className={`${iconColorClass} hover:${bgColorClass} -mr-2`}>
                      Selecionar
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum modelo de checklist encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
