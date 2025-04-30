"use client"

import { ChevronLeft, ImageIcon, FileAudio, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LocationMap } from "@/components/location-map"
import { LocationMapDialog } from "@/components/location-map-dialog"
import { useState, useEffect } from "react"
import { apiService } from "./api-service"
import { offlineStorage } from "@/lib/offline-storage"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ChecklistDetailsProps {
  checklist: any
  onBack: (checklist?: any, action?: string) => void
}

export function ChecklistDetails({ checklist, onBack }: ChecklistDetailsProps) {
  const [showLocationMapDialog, setShowLocationMapDialog] = useState(false)
  const [allResponses, setAllResponses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)

  // Function to fetch all flowstep responses
  useEffect(() => {
    const fetchAllFlowstepResponses = async () => {
      // Verificar se o checklist tem dados válidos
      if (!checklist) {
        console.error("Invalid checklist: checklist is null or undefined")
        setError("Invalid or incomplete checklist data.")
        return
      }

      console.log("Processing checklist:", checklist)

      // Adaptar o formato de dados da API para o formato esperado pelo componente
      // Se o checklist veio da API (tem flowData), extrair as respostas do formato da API
      if (
        checklist.fromApi &&
        checklist.flowData &&
        Array.isArray(checklist.flowData) &&
        checklist.flowData.length > 0
      ) {
        try {
          // Extrair as respostas de flowData.data
          const apiResponses: any = {}

          const flowStepData = checklist.flowData[0]
          if (flowStepData.data && Array.isArray(flowStepData.data)) {
            flowStepData.data.forEach((item: any) => {
              // Converter a resposta para o formato esperado pelo aplicativo
              if (item.answer === "true") {
                apiResponses[item.itemId] = true
              } else if (item.answer === "false") {
                apiResponses[item.itemId] = false
              } else {
                apiResponses[item.itemId] = item.answer
              }

              // Se tiver observações, adicionar
              if (item.observations) {
                apiResponses[`${item.itemId}-observation`] = item.observations
              }
            })
          }

          // Se o template não tem items, mas temos flowData com items, criar items no template
          if (
            (!checklist.template.items || !checklist.template.items.length) &&
            checklist.flowData[0].data &&
            Array.isArray(checklist.flowData[0].data)
          ) {
            checklist.template.items = checklist.flowData[0].data.map((item: any) => ({
              id: item.itemId?.toString() || item.id?.toString(),
              question: item.itemName,
              type: mapAnswerTypeToAppType(item.answerTypeId || 1),
              requiresPhoto: item.requiredImage || false,
              requiredImage: item.requiredImage || false,
              requiresAudio: item.requiredAudio || false,
              requiredAudio: item.requiredAudio || false,
              requiresObservation: item.requiredObservation || false,
              requiredObservation: item.requiredObservation || false,
            }))
          }

          // Adicionar as respostas adaptadas ao checklist
          checklist.responses = apiResponses
        } catch (error) {
          console.error("Error processing API checklist responses:", error)
        }
      }

      // Continuação da verificação original
      if (!checklist.template || !checklist.responses) {
        console.error("Invalid checklist data:", checklist)
        setError("Invalid or incomplete checklist data.")
        return
      }

      console.log("Processing checklist:", checklist)

      // Extract and store the model ID for data isolation
      const currentModelId = checklist.template?.id || checklist.modelId || null
      setModelId(currentModelId)

      // If not a multi-step checklist, just use current responses
      if (!checklist.flowSize || checklist.flowSize <= 1) {
        setAllResponses([
          {
            flowStep: 1,
            responses: checklist.responses,
            template: checklist.template,
          },
        ])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Initialize with current responses
        const responses = [
          {
            flowStep: checklist.flowStep || 1,
            responses: checklist.responses,
            template: checklist.template,
          },
        ]

        // If checklist has a parent ID, fetch the other steps
        if (checklist.parentId) {
          // This is flowstep 2+, fetch flowstep 1
          try {
            // First try to fetch from local storage
            let parentChecklist = null

            try {
              parentChecklist = await offlineStorage.getChecklistById(checklist.parentId)
            } catch (error) {
              console.warn("Error fetching parent checklist from IndexedDB:", error)
              // Continue with API fallback
            }

            // If not found locally, try to fetch from API
            if (!parentChecklist) {
              try {
                parentChecklist = await apiService.getChecklistById(checklist.parentId)
              } catch (apiError) {
                console.error("Error fetching parent checklist from API:", apiError)
              }
            }

            // Only include if it's from the same model
            if (parentChecklist && parentChecklist.responses) {
              const parentModelId = parentChecklist.template?.id || parentChecklist.modelId || null

              if (parentModelId === currentModelId) {
                responses.push({
                  flowStep: 1,
                  responses: parentChecklist.responses,
                  template: parentChecklist.template,
                })
              } else {
                console.warn(`Parent checklist has different model ID: ${parentModelId} vs ${currentModelId}`)
              }
            } else {
              console.warn("Parent checklist not found or has no responses:", checklist.parentId)
            }
          } catch (err) {
            console.error("Error fetching parent checklist:", err)
          }
        } else if (checklist.childId) {
          // This is flowstep 1, fetch flowstep 2+
          try {
            // First try to fetch from local storage
            let childChecklist = null

            try {
              childChecklist = await offlineStorage.getChecklistById(checklist.childId)
            } catch (error) {
              console.warn("Error fetching child checklist from IndexedDB:", error)
              // Continue with API fallback
            }

            // If not found locally, try to fetch from API
            if (!childChecklist) {
              try {
                childChecklist = await apiService.getChecklistById(checklist.childId)
              } catch (apiError) {
                console.error("Error fetching child checklist from API:", apiError)
              }
            }

            // Only include if it's from the same model
            if (childChecklist && childChecklist.responses) {
              const childModelId = childChecklist.template?.id || childChecklist.modelId || null

              if (childModelId === currentModelId) {
                responses.push({
                  flowStep: childChecklist.flowStep || 2,
                  responses: childChecklist.responses,
                  template: childChecklist.template,
                })
              } else {
                console.warn(`Child checklist has different model ID: ${childModelId} vs ${currentModelId}`)
              }
            } else {
              console.warn("Child checklist not found or has no responses:", checklist.childId)
            }
          } catch (err) {
            console.error("Error fetching child checklist:", err)
          }
        }

        // Sort responses by flowStep
        responses.sort((a, b) => a.flowStep - b.flowStep)
        console.log("Processed responses:", responses)
        setAllResponses(responses)
      } catch (err) {
        console.error("Error fetching flowstep responses:", err)
        setError("Could not load all checklist steps.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllFlowstepResponses()
  }, [checklist])

  // Function to count issues across all steps
  const countIssues = () => {
    let count = 0

    allResponses.forEach((flowstepData) => {
      if (!flowstepData.responses) return

      Object.entries(flowstepData.responses).forEach(([key, value]) => {
        // Only count boolean responses that are false
        const item = flowstepData.template?.items?.find((i: any) => i.id === key)
        if (item && item.type === "boolean" && value === false) {
          count++
        }
      })
    })

    return count
  }

  // Function to count photos across all steps
  const countPhotos = () => {
    let total = 0

    allResponses.forEach((flowstepData) => {
      if (!flowstepData.responses?.photos) return

      Object.values(flowstepData.responses.photos).forEach((photos: any) => {
        total += photos.length
      })
    })

    return total
  }

  // Function to count audios across all steps
  const countAudios = () => {
    let total = 0

    allResponses.forEach((flowstepData) => {
      if (!flowstepData.responses?.audios) return

      Object.values(flowstepData.responses.audios).forEach((audios: any) => {
        total += audios.length
      })
    })

    return total
  }

  // Function to render response based on item type
  const renderResponse = (item: any, response: any, observation: any, photos: any[] = [], audios: any[] = []) => {
    return (
      <>
        {item.type === "boolean" && (
          <div className={`mt-1 ${response === false ? "text-red-500" : "text-green-500"}`}>
            {response === true ? "Sim, está conforme" : response === false ? "Não, há um problema" : "Não respondido"}
          </div>
        )}

        {item.type === "condition" && response && (
          <div className="mt-1">
            Condição:{" "}
            <span
              className={`font-medium ${
                response === "bom" ? "text-green-500" : response === "regular" ? "text-yellow-500" : "text-red-500"
              }`}
            >
              {response === "bom" ? "Bom" : response === "regular" ? "Regular" : "Ruim"}
            </span>
          </div>
        )}

        {item.type === "fuel" && response && (
          <div className="mt-1">
            Nível:{" "}
            <span
              className={`font-medium ${
                response === "cheio" ? "text-green-500" : response === "meio" ? "text-yellow-500" : "text-red-500"
              }`}
            >
              {response === "cheio" ? "Cheio" : response === "meio" ? "1/2" : "Vazio"}
            </span>
          </div>
        )}

        {item.type === "satisfaction" && response && (
          <div className="mt-1">
            Avaliação:{" "}
            <span
              className={`font-medium ${
                response === "otimo"
                  ? "text-green-600"
                  : response === "bom"
                    ? "text-green-500"
                    : response === "neutro"
                      ? "text-yellow-500"
                      : "text-red-500"
              }`}
            >
              {response === "otimo" ? "Ótimo" : response === "bom" ? "Bom" : response === "neutro" ? "Neutro" : "Ruim"}
            </span>
          </div>
        )}

        {item.type === "rating" && response && (
          <div className="mt-1">
            Avaliação: <span className="font-medium">{response}/5</span>
          </div>
        )}

        {item.type === "number" && response && (
          <div className="mt-1">
            Valor: <span className="font-medium">{response}</span>
          </div>
        )}

        {item.type === "select" && response && (
          <div className="mt-1">
            Selecionado: <span className="font-medium">{response}</span>
          </div>
        )}

        {item.type === "multiselect" && response && response.length > 0 && (
          <div className="mt-1">
            Selecionados: <span className="font-medium">{response.join(", ")}</span>
          </div>
        )}

        {item.type === "text" && response && <div className="mt-1 text-sm">{response}</div>}

        {observation && (
          <div className="mt-2">
            <div className="text-sm font-medium text-muted-foreground">Observações:</div>
            <div className="text-sm mt-1">{observation}</div>
          </div>
        )}

        {/* Display photos */}
        {photos && photos.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center">
              <ImageIcon className="h-3 w-3 mr-1" />
              Fotos ({photos.length}):
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {photos.map((photo: string, photoIndex: number) => (
                <div key={photoIndex} className="w-16 h-16 border rounded-md overflow-hidden">
                  <img
                    src={photo || "/placeholder.svg"}
                    alt={`Foto ${photoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display audios */}
        {audios && audios.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center">
              <FileAudio className="h-3 w-3 mr-1" />
              Áudios ({audios.length}):
            </div>
            <div className="space-y-2 mt-1">
              {audios.map((audio: string, audioIndex: number) => (
                <div key={audioIndex} className="border rounded-md p-2 bg-slate-50">
                  <audio src={audio} controls className="w-full h-8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  const issueCount = countIssues()
  const photoCount = countPhotos()
  const audioCount = countAudios()
  const submittedDate = new Date(checklist.submittedAt)

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Detalhes do Checklist</h1>
          <p className="text-sm text-muted-foreground">{checklist.template?.title}</p>
          {modelId && (
            <Badge variant="outline" className="mt-1 text-xs">
              Modelo ID: {modelId}
            </Badge>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="summary" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Resumo do Checklist</CardTitle>
              <CardDescription>{checklist.template?.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-medium">{checklist.vehicle?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa:</span>
                <span className="font-medium">{checklist.vehicle?.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data/Hora:</span>
                <span className="font-medium">{submittedDate.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens verificados:</span>
                <span className="font-medium">
                  {allResponses.reduce((total, flowstepData) => total + (flowstepData.template?.items?.length || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Problemas encontrados:</span>
                <span className={`font-medium ${issueCount > 0 ? "text-red-500" : "text-green-500"}`}>
                  {issueCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fotos anexadas:</span>
                <span className="font-medium">{photoCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Áudios gravados:</span>
                <span className="font-medium">{audioCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={checklist.synced ? "outline" : "secondary"}
                  className={checklist.synced ? "bg-green-50 text-green-700 border-green-200" : ""}
                >
                  {checklist.synced ? "Sincronizado" : "Pendente de sincronização"}
                </Badge>
              </div>
              {checklist.flowSize > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Etapas:</span>
                  <span className="font-medium">
                    {allResponses.length} de {checklist.flowSize}
                  </span>
                </div>
              )}
              {/* Location section */}
              {checklist.responses?.location && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-muted-foreground">Localização:</span>
                  </div>
                  <LocationMap
                    latitude={checklist.responses.location.latitude}
                    longitude={checklist.responses.location.longitude}
                    address={checklist.responses.location.address}
                    className="mt-2"
                    onOpenFullMap={() => setShowLocationMapDialog(true)}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              {checklist.flowSize > 1 && checklist.status?.id === 2 && (
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onBack(checklist, "continue")}
                >
                  Continuar Checklist
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Detalhes do Checklist</CardTitle>
              <CardDescription>{checklist.template?.title}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-6">
                  {allResponses.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma resposta encontrada para este checklist.
                    </div>
                  )}

                  {allResponses.map((flowstepData, flowIndex) => {
                    // Check if flowstepData has valid data
                    if (!flowstepData.template?.items || !flowstepData.responses) {
                      console.warn("Invalid flowstep data:", flowstepData)
                      return null
                    }

                    return (
                      <div key={`flowstep-${flowstepData.flowStep}`} className="space-y-4">
                        {allResponses.length > 1 && (
                          <div className="bg-slate-100 p-2 rounded-md mb-2">
                            <h3 className="font-semibold text-slate-700">
                              Etapa {flowstepData.flowStep} - {flowstepData.template.title}
                            </h3>
                          </div>
                        )}

                        {flowstepData.template.items.map((item: any, index: number) => {
                          // Check if item has valid data
                          if (!item || !item.id) {
                            console.warn("Invalid item:", item)
                            return null
                          }

                          const response = flowstepData.responses[item.id]
                          const observation = flowstepData.responses[`${item.id}-observation`]
                          const photos = flowstepData.responses.photos?.[item.id] || []
                          const audios = flowstepData.responses.audios?.[item.id] || []

                          return (
                            <div key={`${flowstepData.flowStep}-${item.id}`} className="border-b pb-4 last:border-b-0">
                              <div className="font-medium">
                                {index + 1}. {item.question}
                              </div>

                              {renderResponse(item, response, observation, photos, audios)}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>{/* Action buttons removed as requested previously */}</CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Full map dialog */}
      {checklist.responses?.location && (
        <LocationMapDialog
          isOpen={showLocationMapDialog}
          onClose={() => setShowLocationMapDialog(false)}
          latitude={checklist.responses.location.latitude}
          longitude={checklist.responses.location.longitude}
          address={checklist.responses.location.address}
        />
      )}
    </div>
  )
}

// Adicionar esta nova função auxiliar no componente
function mapAnswerTypeToAppType(answerTypeId: number): string {
  switch (answerTypeId) {
    case 1:
      return "boolean"
    case 2:
      return "condition"
    case 3:
      return "fuel"
    case 4:
      return "text"
    case 5:
      return "select"
    default:
      return "text"
  }
}
