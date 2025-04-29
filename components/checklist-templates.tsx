"use client"

import { useState, useEffect } from "react"
import { Search, ArrowRight, Clock, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getIconFromCode } from "@/lib/icon-utils"
import { apiService } from "@/lib/api-service"
import { offlineStorage } from "@/lib/offline-storage"
import { useOnlineStatus } from "@/hooks/use-online-status"

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

interface ChecklistTemplatesProps {
  onSelectTemplate: (template: any) => void
  templates?: any[] // Templates para uso offline (deprecated, mantido para compatibilidade)
}

export function ChecklistTemplates({ onSelectTemplate, templates = [] }: ChecklistTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"api" | "local" | "none">("none")
  const { isOnline } = useOnlineStatus()
  const [apiRequestFailed, setApiRequestFailed] = useState(false)

  // Fetch templates from API or local storage
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Try to get data from API first if online
        if (isOnline) {
          try {
            console.log("Fetching templates from API...")
            const apiTemplates = await apiService.getChecklistTemplates()

            if (Array.isArray(apiTemplates) && apiTemplates.length > 0) {
              console.log(`Retrieved ${apiTemplates.length} templates from API`)
              setAvailableTemplates(apiTemplates)
              setDataSource("api")
              setApiRequestFailed(false)

              // Store templates locally for offline use
              try {
                for (const template of apiTemplates) {
                  // Mark as coming from API to avoid re-syncing
                  await offlineStorage.saveItem("templates", { ...template, fromApi: true })
                }
                console.log("Templates saved to local storage")
              } catch (storageError) {
                console.error("Error saving templates to local storage:", storageError)
              }

              setIsLoading(false)
              return
            } else {
              console.log("API returned empty templates array, falling back to local storage")
              setApiRequestFailed(true)
            }
          } catch (apiError) {
            console.error("Error fetching templates from API:", apiError)
            setApiRequestFailed(true)
            // Continue to try local storage
          }
        } else {
          console.log("Device is offline, skipping API request")
        }

        // If API failed or returned no data, try local storage
        try {
          console.log("Fetching templates from local storage...")
          const localTemplates = await offlineStorage.getAllItems("templates")

          if (Array.isArray(localTemplates) && localTemplates.length > 0) {
            console.log(`Retrieved ${localTemplates.length} templates from local storage`)
            setAvailableTemplates(localTemplates)
            setDataSource("local")
            setIsLoading(false)
            return
          } else {
            console.log("No templates found in local storage")
          }
        } catch (storageError) {
          console.error("Error fetching templates from local storage:", storageError)
        }

        // If we still have no templates, check if templates prop was provided
        if (Array.isArray(templates) && templates.length > 0) {
          console.log(`Using ${templates.length} templates from props`)
          setAvailableTemplates(templates)
          setDataSource("local")
          setIsLoading(false)
          return
        }

        // If we reach here, we have no templates
        setAvailableTemplates([])
        setError("Não foi possível carregar os modelos de checklist. Verifique sua conexão e tente novamente.")
        setDataSource("none")
      } catch (error) {
        console.error("Unexpected error fetching templates:", error)
        setError("Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [isOnline, templates])

  // Safe filtering function
  const getFilteredTemplates = () => {
    try {
      // If no search query, return all templates
      if (!searchQuery.trim()) {
        return availableTemplates
      }

      // Convert search query to lowercase for case-insensitive comparison
      const query = searchQuery.toLowerCase()

      // Filter templates based on search query
      return availableTemplates.filter((template) => {
        // Skip invalid templates
        if (!template) return false

        // Safely extract title and description with explicit type conversion
        const title = String(template.title || template.name || "")
        const description = String(template.description || "")

        // Check if title or description includes the search query
        return title.toLowerCase().includes(query) || description.toLowerCase().includes(query)
      })
    } catch (error) {
      console.error("Error in getFilteredTemplates:", error)
      return []
    }
  }

  // Get filtered templates
  const filteredTemplates = getFilteredTemplates()

  // Render loading state
  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Aplicar Checklist</h1>
            <p className="text-muted-foreground">Carregando modelos de checklist...</p>
          </div>
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Carregando modelos de checklist...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="container max-w-md mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Aplicar Checklist</h1>
            <p className="text-muted-foreground">Erro ao carregar modelos</p>
          </div>
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Motorista" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
        </div>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Button className="w-full" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aplicar Checklist</h1>
          <p className="text-muted-foreground">
            Selecione o Modelo de checklist
            {dataSource === "local" && !isOnline && <span className="text-xs ml-1 text-amber-600">(modo offline)</span>}
          </p>
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
            filteredTemplates.map((template, index) => {
              if (!template) return null

              // Safely extract template properties
              const id = template.id || `template-${index}`
              const title = template.name || template.title || "Sem título"
              const description = template.description || "Sem descrição"
              const estimatedTime = template.estimatedTime || "5-10 min"

              // Safely extract styling properties
              const groupColor = template.group?.color || template.color || "default"
              const color = colorMap[groupColor] || colorMap[template.color] || colorMap.default
              const iconCode = template.group?.icon || template.iconName || "icon_1"
              const groupName = template.group?.name || ""

              // Styling
              const borderStyle = { borderLeftColor: color }
              const bgStyle = { backgroundColor: `${color}10` }
              const iconStyle = { color: color }

              return (
                <Card
                  key={id}
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
                        <CardTitle className="text-lg">{title}</CardTitle>
                        {groupName && (
                          <div className="text-xs font-medium mt-1" style={iconStyle}>
                            Grupo: {groupName}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0 pb-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>{estimatedTime}</span>
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
              {!isOnline && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                  Verificar conexão
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
