"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, AlertCircle, HelpCircle, Camera, X, Mic, FileAudio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AudioRecorder } from "@/components/audio-recorder"
import { CameraCapture } from "@/components/camera-capture"
import { CameraFallback } from "@/components/camera-fallback"
import { ErrorFallback } from "@/components/error-fallback"
import { LocationPermission } from "@/components/location-permission"
import { LocationMapDialog } from "@/components/location-map-dialog"

// Importações existentes
import {
  ThumbsUp,
  ThumbsDown,
  Droplet,
  DropletIcon as DropletHalf,
  DropletIcon as DropletOff,
  SmilePlus,
  Smile,
  Meh,
  Frown,
} from "lucide-react"

// Adicione este parâmetro à interface ChecklistFormProps
interface ChecklistFormProps {
  checklist: any
  onSubmit: (data: any) => void
  onCancel: () => void
  offlineMode?: boolean // Novo parâmetro para indicar modo offline
}

// E passe-o para a função
export function ChecklistForm({ checklist, onSubmit, onCancel, offlineMode = false }: ChecklistFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, string[]>>({})
  const [audios, setAudios] = useState<Record<string, string[]>>({})
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [showAudioDialog, setShowAudioDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useCameraFallback, setUseCameraFallback] = useState(false)
  const [submissionError, setSubmissionError] = useState<Error | null>(null)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [locationData, setLocationData] = useState<{
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    timestamp: number | null
    address: string | null
  } | null>(null)
  const [showLocationMapDialog, setShowLocationMapDialog] = useState(false)

  const totalSteps = checklist.items.length
  const progress = Math.round((currentStep / totalSteps) * 100)
  const currentItem = checklist.items[currentStep]

  // Check if current item requires photos, audio or observations
  const requiresPhoto = currentItem.requiresPhoto || false
  const requiresAudio = currentItem.requiresAudio || false
  const requiresObservation = currentItem.requiresObservation || false

  const handleNext = () => {
    // Limpar qualquer erro de submissão anterior
    setSubmissionError(null)

    // Validate current step
    const newErrors: Record<string, string> = {}

    // Validate boolean responses
    if (currentItem.type === "boolean" && responses[currentItem.id] === undefined) {
      newErrors[currentItem.id] = "Por favor, responda esta pergunta"
    }

    // Validate number responses
    if (
      currentItem.type === "number" &&
      (responses[currentItem.id] === undefined || responses[currentItem.id] === "")
    ) {
      newErrors[`${currentItem.id}`] = "Por favor, informe um valor"
    }

    // Validate select responses
    if (
      (currentItem.type === "select" || currentItem.type === "multiselect") &&
      (responses[currentItem.id] === undefined || responses[currentItem.id] === "")
    ) {
      newErrors[`${currentItem.id}`] = "Por favor, selecione uma opção"
    }

    // Validate required photos
    if (requiresPhoto && (!photos[currentItem.id] || photos[currentItem.id].length === 0)) {
      newErrors[`${currentItem.id}-photo`] = "É necessário adicionar pelo menos uma foto"
    }

    // Validate required audio
    if (requiresAudio && (!audios[currentItem.id] || audios[currentItem.id].length === 0)) {
      newErrors[`${currentItem.id}-audio`] = "É necessário gravar um áudio"
    }

    // Validate required observations
    if (
      requiresObservation &&
      (!responses[`${currentItem.id}-observation`] || responses[`${currentItem.id}-observation`].trim() === "")
    ) {
      newErrors[`${currentItem.id}-observation`] = "É necessário adicionar uma observação"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    } else {
      // If we're on the last step, show the location dialog
      setShowLocationDialog(true)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    } else {
      onCancel()
    }
  }

  // Funções de manipulação de resposta existentes
  const handleBooleanResponse = (value: boolean) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleConditionResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleFuelLevelResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleSatisfactionResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleTextResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
  }

  const handleObservationResponse = (value: string) => {
    setResponses({ ...responses, [`${currentItem.id}-observation`]: value })
    setErrors({ ...errors, [`${currentItem.id}-observation`]: undefined })
  }

  const handleRatingResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleNumberResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleSelectResponse = (value: string) => {
    setResponses({ ...responses, [currentItem.id]: value })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  const handleMultiSelectResponse = (value: string) => {
    const currentValues = responses[currentItem.id] || []
    let newValues = [...currentValues]

    if (newValues.includes(value)) {
      newValues = newValues.filter((v) => v !== value)
    } else {
      newValues.push(value)
    }

    setResponses({ ...responses, [currentItem.id]: newValues })
    setErrors({ ...errors, [currentItem.id]: undefined })
  }

  // Funções para manipulação de fotos
  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // In a real app, you would upload these files to a server
    // For this demo, we'll create object URLs to display them
    const newPhotos = [...(photos[currentItem.id] || [])]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const photoUrl = URL.createObjectURL(file)
      newPhotos.push(photoUrl)
    }

    setPhotos({
      ...photos,
      [currentItem.id]: newPhotos,
    })

    setErrors({
      ...errors,
      [`${currentItem.id}-photo`]: undefined,
    })

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = [...(photos[currentItem.id] || [])]
    newPhotos.splice(index, 1)

    setPhotos({
      ...photos,
      [currentItem.id]: newPhotos,
    })

    if (requiresPhoto && newPhotos.length === 0) {
      setErrors({
        ...errors,
        [`${currentItem.id}-photo`]: "É necessário adicionar pelo menos uma foto",
      })
    }
  }

  // Novas funções para manipulação de câmera e áudio
  const handleCameraCapture = (photoBlob: Blob, photoUrl: string) => {
    try {
      console.log("Foto capturada, processando...")

      // Criar uma URL de objeto para o blob
      const objectUrl = URL.createObjectURL(photoBlob)

      const newPhotos = [...(photos[currentItem.id] || []), objectUrl]

      setPhotos({
        ...photos,
        [currentItem.id]: newPhotos,
      })

      setErrors({
        ...errors,
        [`${currentItem.id}-photo`]: undefined,
      })

      console.log("Foto processada e adicionada com sucesso")
      setShowCameraDialog(false)
    } catch (error) {
      console.error("Erro ao processar foto capturada:", error)
      alert("Ocorreu um erro ao processar a foto. Por favor, tente novamente.")
      setShowCameraDialog(false)
    }
  }

  const handleAudioSaved = (audioBlob: Blob, audioUrl: string) => {
    const newAudios = [...(audios[currentItem.id] || []), audioUrl]

    setAudios({
      ...audios,
      [currentItem.id]: newAudios,
    })

    setErrors({
      ...errors,
      [`${currentItem.id}-audio`]: undefined,
    })

    setShowAudioDialog(false)
  }

  const removeAudio = (index: number) => {
    const newAudios = [...(audios[currentItem.id] || [])]
    const removedUrl = newAudios[index]
    newAudios.splice(index, 1)

    setAudios({
      ...audios,
      [currentItem.id]: newAudios,
    })

    // Liberar a URL do objeto
    URL.revokeObjectURL(removedUrl)

    if (requiresAudio && newAudios.length === 0) {
      setErrors({
        ...errors,
        [`${currentItem.id}-audio`]: "É necessário gravar um áudio",
      })
    }
  }

  // Adicione esta função melhorada para lidar com a captura de fotos
  const openCamera = async () => {
    try {
      // Verificar se o navegador suporta a API MediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log("Navegador não suporta MediaDevices, usando fallback")
        setUseCameraFallback(true)
        setShowCameraDialog(true)
        return
      }

      // Verificar se estamos em um contexto seguro (HTTPS ou localhost)
      if (
        typeof window !== "undefined" &&
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        console.log("Não estamos em HTTPS ou localhost, usando fallback")
        setUseCameraFallback(true)
        setShowCameraDialog(true)
        return
      }

      // Tentar acessar a câmera para verificar permissões
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Parar o stream imediatamente após o teste
        stream.getTracks().forEach((track) => track.stop())

        // Se chegou aqui, temos permissão para a câmera
        setUseCameraFallback(false)
      } catch (err) {
        console.log("Erro ao acessar câmera, usando fallback:", err)
        setUseCameraFallback(true)
      }

      setShowCameraDialog(true)
    } catch (error) {
      console.error("Erro ao verificar câmeras:", error)
      setUseCameraFallback(true)
      setShowCameraDialog(true)
    }
  }

  // Renderizar os complementos (fotos e áudios)
  const renderMediaAttachments = () => {
    return (
      <div className="space-y-6 mt-6 border-t pt-6">
        {/* Seção de fotos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center">
              Fotos
              {requiresPhoto && <span className="text-blue-500 ml-1">*</span>}
            </Label>
            <Button variant="outline" size="sm" className="text-xs" onClick={openCamera}>
              <Camera className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>

          {photos[currentItem.id]?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photos[currentItem.id].map((photo, index) => (
                <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden">
                  <img
                    src={photo || "/placeholder.svg"}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Nenhuma foto adicionada</div>
          )}

          {errors[`${currentItem.id}-photo`] && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errors[`${currentItem.id}-photo`]}</AlertDescription>
            </Alert>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Seção de áudios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center">
              Áudios
              {requiresAudio && <span className="text-blue-500 ml-1">*</span>}
            </Label>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAudioDialog(true)}>
              <Mic className="h-3 w-3 mr-1" />
              Gravar
            </Button>
          </div>

          {audios[currentItem.id]?.length > 0 ? (
            <div className="space-y-2">
              {audios[currentItem.id].map((audio, index) => (
                <div key={index} className="border rounded-md overflow-hidden p-2 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <FileAudio className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm font-medium">Áudio {index + 1}</span>
                    </div>
                    <button className="text-red-500 hover:text-red-700" onClick={() => removeAudio(index)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <audio src={audio} controls className="w-full h-8" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Nenhum áudio gravado</div>
          )}

          {errors[`${currentItem.id}-audio`] && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errors[`${currentItem.id}-audio`]}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    return () => {
      // Limpar todas as URLs de objetos ao desmontar o componente
      Object.values(photos).forEach((photoArray) => {
        photoArray.forEach((photoUrl) => {
          if (photoUrl.startsWith("blob:")) {
            URL.revokeObjectURL(photoUrl)
          }
        })
      })

      Object.values(audios).forEach((audioArray) => {
        audioArray.forEach((audioUrl) => {
          if (audioUrl.startsWith("blob:")) {
            URL.revokeObjectURL(audioUrl)
          }
        })
      })
    }
  }, [photos, audios])

  const handleLocationCaptured = (location: any) => {
    setLocationData(location)
    setShowLocationDialog(false)

    // Now proceed with the actual submission
    finalizeSubmission(location)
  }

  const handleSkipLocation = () => {
    setShowLocationDialog(false)

    // Proceed with submission without location data
    finalizeSubmission(null)
  }

  const finalizeSubmission = (location: any) => {
    try {
      // Preparar os dados finais para submissão
      // Converter URLs de blob para strings simples para garantir serializabilidade
      const serializablePhotos: Record<string, string[]> = {}
      Object.keys(photos).forEach((key) => {
        serializablePhotos[key] = [...photos[key]]
      })

      const serializableAudios: Record<string, string[]> = {}
      Object.keys(audios).forEach((key) => {
        serializableAudios[key] = [...audios[key]]
      })

      // Garantir que a localização seja serializável
      let serializableLocation = null
      if (location) {
        serializableLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
          timestamp: location.timestamp,
          address: location.address || null,
        }
      }

      const finalData = {
        ...responses,
        photos: serializablePhotos,
        audios: serializableAudios,
        location: serializableLocation,
      }

      // Chamar a função de submissão
      onSubmit(finalData)
    } catch (error) {
      console.error("Erro ao submeter checklist:", error)
      setSubmissionError(error instanceof Error ? error : new Error("Erro desconhecido ao submeter checklist"))
    }
  }

  if (submissionError) {
    return (
      <ErrorFallback error={submissionError} resetErrorBoundary={() => setSubmissionError(null)} onCancel={onCancel} />
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">{checklist.title}</h1>
          <p className="text-sm text-muted-foreground">
            {checklist.vehicle} ({checklist.licensePlate})
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Progresso</span>
          <span>
            {currentStep + 1} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Item {currentStep + 1}</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajuda</DialogTitle>
                    <DialogDescription>
                      {currentItem.type === "boolean" &&
                        "Selecione 'Sim' se o item está em conformidade ou 'Não' se há algum problema."}
                      {currentItem.type === "text" && "Forneça detalhes adicionais ou observações sobre o veículo."}
                      {currentItem.type === "rating" && "Avalie a condição do item de 1 (ruim) a 5 (excelente)."}
                      {currentItem.type === "number" && "Informe o valor numérico solicitado."}
                      {currentItem.type === "select" && "Selecione uma das opções disponíveis."}
                      {currentItem.type === "multiselect" && "Selecione uma ou mais opções aplicáveis."}
                      {requiresPhoto && <div className="mt-2 text-blue-500">Este item requer foto(s).</div>}
                      {requiresAudio && <div className="mt-2 text-blue-500">Este item requer gravação de áudio.</div>}
                      {requiresObservation && <div className="mt-2 text-blue-500">Este item requer observações.</div>}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription className="text-base font-medium">
              {currentItem.question}
              {(requiresPhoto || requiresAudio || requiresObservation) && <span className="text-blue-500 ml-1">*</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentItem.type === "boolean" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === true ? "default" : "outline"}
                    className={responses[currentItem.id] === true ? "bg-green-500 hover:bg-green-600" : ""}
                    onClick={() => handleBooleanResponse(true)}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === false ? "default" : "outline"}
                    className={responses[currentItem.id] === false ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => handleBooleanResponse(false)}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Não
                  </Button>
                </div>
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "text" && (
              <Textarea
                placeholder="Digite suas observações aqui..."
                className="min-h-[120px]"
                value={responses[currentItem.id] || ""}
                onChange={(e) => handleTextResponse(e.target.value)}
              />
            )}

            {currentItem.type === "number" && (
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Digite o valor..."
                  value={responses[currentItem.id] || ""}
                  onChange={(e) => handleNumberResponse(e.target.value)}
                />
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "select" && (
              <div className="space-y-4">
                <Select value={responses[currentItem.id] || ""} onValueChange={handleSelectResponse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentItem.options?.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "multiselect" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">Selecione todas as opções aplicáveis:</div>
                {currentItem.options?.map((option: string) => (
                  <div key={option} className="flex items-center justify-between border rounded-lg p-3">
                    <Label htmlFor={`${currentItem.id}-${option}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                    <Switch
                      id={`${currentItem.id}-${option}`}
                      checked={(responses[currentItem.id] || []).includes(option)}
                      onCheckedChange={() => handleMultiSelectResponse(option)}
                    />
                  </div>
                ))}
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "rating" && (
              <RadioGroup
                value={responses[currentItem.id] || ""}
                onValueChange={handleRatingResponse}
                className="flex justify-between"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex flex-col items-center gap-1">
                    <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} className="peer sr-only" />
                    <Label
                      htmlFor={`rating-${rating}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500 peer-data-[state=checked]:text-white cursor-pointer"
                    >
                      {rating}
                    </Label>
                    <span className="text-xs">{rating === 1 ? "Ruim" : rating === 5 ? "Ótimo" : ""}</span>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentItem.type === "condition" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "bom" ? "default" : "outline"}
                    className={responses[currentItem.id] === "bom" ? "bg-green-500 hover:bg-green-600" : ""}
                    onClick={() => handleConditionResponse("bom")}
                  >
                    Bom
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "regular" ? "default" : "outline"}
                    className={
                      responses[currentItem.id] === "regular" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                    }
                    onClick={() => handleConditionResponse("regular")}
                  >
                    Regular
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "ruim" ? "default" : "outline"}
                    className={responses[currentItem.id] === "ruim" ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => handleConditionResponse("ruim")}
                  >
                    Ruim
                  </Button>
                </div>
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "fuel" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "cheio" ? "default" : "outline"}
                    className={responses[currentItem.id] === "cheio" ? "bg-green-500 hover:bg-green-600" : ""}
                    onClick={() => handleFuelLevelResponse("cheio")}
                  >
                    <Droplet className="mr-2 h-4 w-4" />
                    Cheio
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "meio" ? "default" : "outline"}
                    className={
                      responses[currentItem.id] === "meio" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                    }
                    onClick={() => handleFuelLevelResponse("meio")}
                  >
                    <DropletHalf className="mr-2 h-4 w-4" />
                    1/2
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "vazio" ? "default" : "outline"}
                    className={responses[currentItem.id] === "vazio" ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => handleFuelLevelResponse("vazio")}
                  >
                    <DropletOff className="mr-2 h-4 w-4" />
                    Vazio
                  </Button>
                </div>
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentItem.type === "satisfaction" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "otimo" ? "default" : "outline"}
                    className={responses[currentItem.id] === "otimo" ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => handleSatisfactionResponse("otimo")}
                  >
                    <SmilePlus className="mr-1 h-4 w-4" />
                    Ótimo
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "bom" ? "default" : "outline"}
                    className={responses[currentItem.id] === "bom" ? "bg-green-500 hover:bg-green-600" : ""}
                    onClick={() => handleSatisfactionResponse("bom")}
                  >
                    <Smile className="mr-1 h-4 w-4" />
                    Bom
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "neutro" ? "default" : "outline"}
                    className={
                      responses[currentItem.id] === "neutro" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                    }
                    onClick={() => handleSatisfactionResponse("neutro")}
                  >
                    <Meh className="mr-1 h-4 w-4" />
                    Neutro
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === "ruim" ? "default" : "outline"}
                    className={responses[currentItem.id] === "ruim" ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => handleSatisfactionResponse("ruim")}
                  >
                    <Frown className="mr-1 h-4 w-4" />
                    Ruim
                  </Button>
                </div>
                {errors[currentItem.id] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[currentItem.id]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {requiresObservation && (
              <div className="space-y-2 mt-4">
                <Label htmlFor={`${currentItem.id}-observation`} className="flex items-center">
                  <span className="font-medium">Observações</span>
                  <span className="text-blue-500 ml-1">*</span>
                </Label>
                <Textarea
                  id={`${currentItem.id}-observation`}
                  placeholder="Adicione observações detalhadas aqui..."
                  className="min-h-[100px]"
                  value={responses[`${currentItem.id}-observation`] || ""}
                  onChange={(e) => handleObservationResponse(e.target.value)}
                />
                {errors[`${currentItem.id}-observation`] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{errors[`${currentItem.id}-observation`]}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Renderizar os complementos (fotos e áudios) para todos os tipos de itens */}
            {(requiresPhoto || requiresAudio) && renderMediaAttachments()}
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleNext}>
              {currentStep < totalSteps - 1 ? "Próximo" : "Finalizar Checklist"}
            </Button>
          </CardFooter>
        </Card>
      </ScrollArea>

      {/* Render camera directly in DOM when dialog is open */}
      {showCameraDialog && (
        <>
          {useCameraFallback ? (
            <CameraFallback onCapture={handleCameraCapture} onCancel={() => setShowCameraDialog(false)} />
          ) : (
            <CameraCapture
              onCapture={handleCameraCapture}
              onCancel={() => setShowCameraDialog(false)}
              onError={() => {
                console.log("Erro reportado pela câmera, alternando para fallback")
                setUseCameraFallback(true)
              }}
            />
          )}
        </>
      )}

      {/* Dialog para gravação de áudio */}
      <Dialog open={showAudioDialog} onOpenChange={setShowAudioDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gravar Áudio</DialogTitle>
            <DialogDescription>Grave um áudio descrevendo o problema ou situação.</DialogDescription>
          </DialogHeader>
          <AudioRecorder onAudioSaved={handleAudioSaved} onCancel={() => setShowAudioDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Location permission dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <LocationPermission onLocationCaptured={handleLocationCaptured} onCancel={handleSkipLocation} />
        </DialogContent>
      </Dialog>

      {/* Full map dialog */}
      <LocationMapDialog
        isOpen={showLocationMapDialog}
        onClose={() => setShowLocationMapDialog(false)}
        latitude={locationData?.latitude || null}
        longitude={locationData?.longitude || null}
        address={locationData?.address || null}
      />
    </div>
  )
}
