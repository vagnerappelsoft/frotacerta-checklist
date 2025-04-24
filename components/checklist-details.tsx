"use client"

import { ChevronLeft, Share2, ImageIcon, FileAudio, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LocationMap } from "@/components/location-map"
import { LocationMapDialog } from "@/components/location-map-dialog"
import { useState } from "react"

interface ChecklistDetailsProps {
  checklist: any
  onBack: (checklist?: any, action?: string) => void
}

export function ChecklistDetails({ checklist, onBack }: ChecklistDetailsProps) {
  const [showLocationMapDialog, setShowLocationMapDialog] = useState(false)

  // Função para contar problemas
  const countIssues = () => {
    let count = 0

    if (!checklist.responses) return 0

    Object.entries(checklist.responses).forEach(([key, value]) => {
      // Apenas contar respostas booleanas que são false
      const item = checklist.template.items.find((i: any) => i.id === key)
      if (item && item.type === "boolean" && value === false) {
        count++
      }
    })

    return count
  }

  // Função para contar fotos
  const countPhotos = () => {
    if (!checklist.responses.photos) return 0

    let total = 0
    Object.values(checklist.responses.photos).forEach((photos: any) => {
      total += photos.length
    })
    return total
  }

  // Função para contar áudios
  const countAudios = () => {
    if (!checklist.responses.audios) return 0

    let total = 0
    Object.values(checklist.responses.audios).forEach((audios: any) => {
      total += audios.length
    })
    return total
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
          <p className="text-sm text-muted-foreground">{checklist.template.title}</p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Resumo do Checklist</CardTitle>
              <CardDescription>{checklist.template.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-medium">{checklist.vehicle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa:</span>
                <span className="font-medium">{checklist.vehicle.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data/Hora:</span>
                <span className="font-medium">{submittedDate.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens verificados:</span>
                <span className="font-medium">{checklist.template.items.length}</span>
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
                    {checklist.flowStep || 1} de {checklist.flowSize}
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
              <Button variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Detalhes do Checklist</CardTitle>
              <CardDescription>{checklist.template.title}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {checklist.template.items.map((item: any, index: number) => {
                    const response = checklist.responses[item.id]
                    const observation = checklist.responses[`${item.id}-observation`]
                    const photos = checklist.responses.photos?.[item.id] || []
                    const audios = checklist.responses.audios?.[item.id] || []

                    return (
                      <div key={item.id} className="border-b pb-4 last:border-b-0">
                        <div className="font-medium">
                          {index + 1}. {item.question}
                        </div>

                        {item.type === "boolean" && (
                          <div className={`mt-1 ${response === false ? "text-red-500" : "text-green-500"}`}>
                            {response === true
                              ? "Sim, está conforme"
                              : response === false
                                ? "Não, há um problema"
                                : "Não respondido"}
                          </div>
                        )}

                        {item.type === "condition" && response && (
                          <div className="mt-1">
                            Condição:{" "}
                            <span
                              className={`font-medium ${
                                response === "bom"
                                  ? "text-green-500"
                                  : response === "regular"
                                    ? "text-yellow-500"
                                    : "text-red-500"
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
                                response === "cheio"
                                  ? "text-green-500"
                                  : response === "meio"
                                    ? "text-yellow-500"
                                    : "text-red-500"
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
                              {response === "otimo"
                                ? "Ótimo"
                                : response === "bom"
                                  ? "Bom"
                                  : response === "neutro"
                                    ? "Neutro"
                                    : "Ruim"}
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
                        {photos.length > 0 && (
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
                        {audios.length > 0 && (
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
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </CardFooter>
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
