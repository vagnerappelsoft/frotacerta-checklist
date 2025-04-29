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

interface ChecklistDetailsProps {
  checklist: any
  onBack: (checklist?: any, action?: string) => void
}

export function ChecklistDetails({ checklist, onBack }: ChecklistDetailsProps) {
  const [showLocationMapDialog, setShowLocationMapDialog] = useState(false)
  const [allResponses, setAllResponses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função para buscar todas as respostas de todos os flowsteps
  useEffect(() => {
    const fetchAllFlowstepResponses = async () => {
      // Verificar se o checklist tem dados válidos
      if (!checklist || !checklist.template || !checklist.responses) {
        console.error("Dados de checklist inválidos:", checklist)
        setError("Dados de checklist inválidos ou incompletos.")
        return
      }

      console.log("Processando checklist:", checklist)

      // Se não for um checklist multi-etapas, use apenas as respostas atuais
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
        // Inicializa com as respostas atuais
        const responses = [
          {
            flowStep: checklist.flowStep || 1,
            responses: checklist.responses,
            template: checklist.template,
          },
        ]

        // Se o checklist tiver um ID pai, busque as outras etapas
        if (checklist.parentId) {
          // Este é um flowstep 2+, busque o flowstep 1
          try {
            // Primeiro tente buscar do armazenamento local
            let parentChecklist = await offlineStorage.getChecklistById(checklist.parentId)

            // Se não encontrar localmente, tente buscar da API
            if (!parentChecklist) {
              parentChecklist = await apiService.getChecklistById(checklist.parentId)
            }

            if (parentChecklist && parentChecklist.responses) {
              responses.push({
                flowStep: 1,
                responses: parentChecklist.responses,
                template: parentChecklist.template,
              })
            } else {
              console.warn("Checklist pai não encontrado ou sem respostas:", checklist.parentId)
            }
          } catch (err) {
            console.error("Erro ao buscar checklist pai:", err)
          }
        } else if (checklist.childId) {
          // Este é um flowstep 1, busque o flowstep 2+
          try {
            // Primeiro tente buscar do armazenamento local
            let childChecklist = await offlineStorage.getChecklistById(checklist.childId)

            // Se não encontrar localmente, tente buscar da API
            if (!childChecklist) {
              childChecklist = await apiService.getChecklistById(checklist.childId)
            }

            if (childChecklist && childChecklist.responses) {
              responses.push({
                flowStep: childChecklist.flowStep || 2,
                responses: childChecklist.responses,
                template: childChecklist.template,
              })
            } else {
              console.warn("Checklist filho não encontrado ou sem respostas:", checklist.childId)
            }
          } catch (err) {
            console.error("Erro ao buscar checklist filho:", err)
          }
        }

        // Ordena as respostas por flowStep
        responses.sort((a, b) => a.flowStep - b.flowStep)
        console.log("Respostas processadas:", responses)
        setAllResponses(responses)
      } catch (err) {
        console.error("Erro ao buscar respostas de flowsteps:", err)
        setError("Não foi possível carregar todas as etapas do checklist.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllFlowstepResponses()
  }, [checklist])

  // Função para contar problemas em todas as etapas
  const countIssues = () => {
    let count = 0

    allResponses.forEach((flowstepData) => {
      if (!flowstepData.responses) return

      Object.entries(flowstepData.responses).forEach(([key, value]) => {
        // Apenas contar respostas booleanas que são false
        const item = flowstepData.template?.items?.find((i: any) => i.id === key)
        if (item && item.type === "boolean" && value === false) {
          count++
        }
      })
    })

    return count
  }

  // Função para contar fotos em todas as etapas
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

  // Função para contar áudios em todas as etapas
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

  // Função para renderizar a resposta com base no tipo de item
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

        {/* Exibir fotos */}
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

        {/* Exibir áudios */}
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
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

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
                    // Verificar se o flowstepData tem dados válidos
                    if (!flowstepData.template?.items || !flowstepData.responses) {
                      console.warn("Dados de flowstep inválidos:", flowstepData)
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
                          // Verificar se o item tem dados válidos
                          if (!item || !item.id) {
                            console.warn("Item inválido:", item)
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
            <CardFooter>{/* Botões de ação removidos conforme solicitado anteriormente */}</CardFooter>
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
