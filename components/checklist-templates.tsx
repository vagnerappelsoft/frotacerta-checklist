"use client"

import { useState } from "react"
import { Search, ArrowRight, Clock } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// Importar dados de exemplo para uso offline
import { CHECKLIST_TEMPLATES } from "@/data/mock-templates"
import { getIconFromCode } from "@/lib/icon-utils"

// Mapeamento de cores para os cards e ícones - usando cores mais vibrantes e distintas
const colorMap: Record<string, string> = {
  color_1: "#FF6B8A", // Rosa
  color_2: "#8B5A2B", // Marrom
  color_3: "#FF7043", // Laranja
  color_4: "#9C27B0", // Roxo
  color_5: "#FFC107", // Amarelo
  color_6: "#00BCD4", // Ciano
  color_7: "#E91E63", // Rosa escuro
  color_8: "#607D8B", // Azul acinzentado
  color_9: "#8BC34A", // Verde claro
  color_10: "#FF5733", // Laranja avermelhado
  // Adicionar cores padrão para casos onde o código de cor não é reconhecido
  default: "#33C1FF", // Azul claro
}

// Define DEFAULT_TEMPLATES, using CHECKLIST_TEMPLATES as a fallback if it's available
const DEFAULT_TEMPLATES = CHECKLIST_TEMPLATES || []

interface ChecklistTemplatesProps {
  onSelectTemplate: (template: any) => void
  templates?: any[] // Templates para uso offline
}

export function ChecklistTemplates({ onSelectTemplate, templates = DEFAULT_TEMPLATES }: ChecklistTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Corrigir o problema de toLowerCase() em propriedades undefined
  const filteredTemplates = templates.filter((template) => {
    if (!template) return false

    // Criar variáveis com fallbacks para evitar undefined
    const title = template.title || template.name || ""
    const description = template.description || ""

    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aplicar Checklist</h1>
          <p className="text-muted-foreground">Selecione o Modelo de checklist</p>
        </div>
        <Avatar>
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
          <AvatarFallback>M</AvatarFallback>
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
              // Obter a cor diretamente do template ou do grupo, se existir
              const groupColor = template.group?.color || template.color || "default"
              const color = colorMap[groupColor] || colorMap[template.color] || colorMap.default

              // Converter a cor hex para classes de estilo inline
              const borderStyle = { borderLeftColor: color }
              const bgStyle = { backgroundColor: `${color}10` } // 10% de opacidade
              const iconStyle = { color: color }

              // Obter o ícone diretamente do template ou do grupo, se existir
              const iconCode = template.group?.icon || template.iconName || "icon_1"

              // Obter o nome do grupo, se existir
              const groupName = template.group?.name || ""

              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.01]"
                  style={borderStyle}
                  onClick={() => onSelectTemplate(template)}
                >
                  <CardHeader className="pb-2 rounded-tr-lg" style={bgStyle}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-white shadow-sm">
                        {getIconFromCode(iconCode, "h-6 w-6", iconStyle)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name || template.title}</CardTitle>
                        {groupName && (
                          <div className="text-xs font-medium mt-1" style={iconStyle}>
                            Grupo: {groupName}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground">{template.description || "Sem descrição"}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0 pb-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>{template.estimatedTime || "5-10 min"}</span>
                    </div>
                    <Button variant="ghost" size="sm" style={iconStyle} className="hover:bg-opacity-10 -mr-2">
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
