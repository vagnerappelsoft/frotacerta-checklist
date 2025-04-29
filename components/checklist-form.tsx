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
import { KilometerDialog } from "@/components/kilometer-dialog"

// Importe o serviço de histórico de quilometragem no topo do arquivo
import { kilometerHistory } from "@/lib/kilometer-history"
// Importe o serviço de configurações de checklist
import { checklistSettings } from "@/lib/checklist-settings"
// Importe o hook de geolocalização
import { useGeolocation } from "@/hooks/use-geolocation"

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

interface KilometerDialogProps {
  onSubmit: (kilometer: string) => void
  onCancel: () => void
  initialValue?: string
  vehicleId: string
  checklistId: string // Add checklistId prop
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
  const [showKilometerDialog, setShowKilometerDialog] = useState(false)
  const [vehicleKilometer, setVehicleKilometer] = useState<string>("")
  const [isLocationRequired, setIsLocationRequired] = useState<boolean>(true)
  const [isKilometerRequired, setIsKilometerRequired] = useState<boolean>(true)
  const [checklistId, setChecklistId] = useState<string>(() => {
    const continuingChecklistData = localStorage.getItem("continuing_checklist")
    if (continuingChecklistData) {
      try {
        const parsedData = JSON.parse(continuingChecklistData)
        return parsedData.id || `checklist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      } catch (error) {
        console.error("Erro ao processar dados de checklist em continuação:", error)
        return `checklist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      }
    }
    return `checklist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  })

  useEffect(() => {
    if (checklistId) {
      localStorage.setItem("checklistId", checklistId)
    }
  }, [checklistId])

  // Use o hook de geolocalização para obter a localização atual
  const geolocation = useGeolocation()

  const totalSteps = checklist.items.length
  const progress = Math.round((currentStep / totalSteps) * 100)
  const currentItem = checklist.items[currentStep]

  // Check if current item requires photos, audio or observations
  const requiresPhoto = currentItem.requiresPhoto || currentItem.requiredImage || currentItem.type === "image" || false
  const requiresAudio = currentItem.requiresAudio || currentItem.requiredAudio || false
  const requiresObservation = currentItem.requiredObservation || currentItem.requiredObservation || false

  // Carregar configurações de checklist
  useEffect(() => {
    const settings = checklistSettings.getSettings()
    setIsLocationRequired(settings.requiredLocations)
    setIsKilometerRequired(settings.requiredKilometer)
  }, [])

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

    // Validate condition responses
    if (currentItem.type === "condition" && responses[currentItem.id] === undefined) {
      newErrors[currentItem.id] = "Por favor, selecione uma condição"
    }

    // Validate fuel responses
    if (currentItem.type === "fuel" && responses[currentItem.id] === undefined) {
      newErrors[currentItem.id] = "Por favor, selecione o nível"
    }

    // Check for required fields based on the item's requirements
    // This should handle both old field names (requiresPhoto) and new field names (requiredImage)
    const isPhotoRequired = currentItem.requiredImage || currentItem.requiresPhoto || false
    const isAudioRequired = currentItem.requiredAudio || currentItem.requiresAudio || false
    const isObservationRequired = currentItem.requiredObservation || currentItem.requiresObservation || false

    // Validate required photos
    if (isPhotoRequired && (!photos[currentItem.id] || photos[currentItem.id].length === 0)) {
      newErrors[`${currentItem.id}-photo`] = "É necessário adicionar pelo menos uma foto"
    }

    // Validate required audio
    if (isAudioRequired && (!audios[currentItem.id] || audios[currentItem.id].length === 0)) {
      newErrors[`${currentItem.id}-audio`] = "É necessário gravar um áudio"
    }

    // Validate required observations
    if (
      isObservationRequired &&
      (!responses[`${currentItem.id}-observation`] || responses[`${currentItem.id}-observation`].trim() === "")
    ) {
      newErrors[`${currentItem.id}-observation`] = "É necessário adicionar uma observação"
    }

    // Validate text responses if required
    if (
      currentItem.type === "text" &&
      currentItem.required &&
      (!responses[currentItem.id] || responses[currentItem.id].trim() === "")
    ) {
      newErrors[currentItem.id] = "Por favor, forneça uma resposta para esta pergunta"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    } else {
      // Fluxo de finalização do checklist
      if (isKilometerRequired) {
        // Se a quilometragem é obrigatória, mostrar o diálogo de quilometragem
        setShowKilometerDialog(true)
      } else if (isLocationRequired) {
        // Se a localização é obrigatória, mostrar o diálogo de localização
        setShowLocationDialog(true)
      } else {
        // Se nenhum dos dois é obrigatório, finalizar o checklist
        finalizeSubmission(null)
      }
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
    // Clear any errors when the user types
    if (value.trim() !== "" && errors[currentItem.id]) {
      setErrors({ ...errors, [currentItem.id]: undefined })
    }
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

    // Processar cada arquivo para criar base64 diretamente
    const newPhotos = [...(photos[currentItem.id] || [])]
    const promises: Promise<string>[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string)
          } else {
            reject(new Error("Falha ao ler arquivo"))
          }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsDataURL(file)
      })
      promises.push(promise)
    }

    // Processar todos os arquivos e atualizar o estado
    Promise.all(promises)
      .then((dataUrls) => {
        setPhotos({
          ...photos,
          [currentItem.id]: [...newPhotos, ...dataUrls],
        })
        setErrors({
          ...errors,
          [`${currentItem.id}-photo`]: undefined,
        })
      })
      .catch((error) => {
        console.error("Erro ao processar fotos:", error)
      })
      .finally(() => {
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      })
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

      // Usar diretamente a URL de dados base64 em vez de criar uma URL de blob
      const newPhotos = [...(photos[currentItem.id] || []), photoUrl]

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
    // Converter o blob para base64 diretamente
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64data = reader.result as string
      const newAudios = [...(audios[currentItem.id] || []), base64data]

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
    reader.onerror = (error) => {
      console.error("Erro ao converter áudio para base64:", error)
      alert("Ocorreu um erro ao processar o áudio. Por favor, tente novamente.")
      setShowAudioDialog(false)
    }
    reader.readAsDataURL(audioBlob)
  }

  const removeAudio = (index: number) => {
    const newAudios = [...(audios[currentItem.id] || [])]
    newAudios.splice(index, 1)

    setAudios({
      ...audios,
      [currentItem.id]: newAudios,
    })

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
    // Check both field name variations for each requirement
    const isPhotoRequired = currentItem.requiredImage || currentItem.requiresPhoto || false
    const isAudioRequired = currentItem.requiredAudio || currentItem.requiresAudio || false
    const isObservationRequired = currentItem.requiredObservation || currentItem.requiresObservation || false

    return (
      <div className="space-y-6 mt-6 border-t pt-6">
        {/* Seção de fotos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center">
              Fotos
              {isPhotoRequired && <span className="text-blue-500 ml-1">*</span>}
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
              {isAudioRequired && <span className="text-blue-500 ml-1">*</span>}
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

  // Adicione um efeito para verificar e carregar respostas existentes quando continuar um checklist
  // Adicione este efeito após os hooks existentes mas antes do return:

  // Verificar e carregar dados de um checklist em continuação
  useEffect(() => {
    const continuingChecklistData = localStorage.getItem("continuing_checklist")
    if (continuingChecklistData) {
      try {
        const parsedData = JSON.parse(continuingChecklistData)

        // Se há respostas anteriores, adicionar um aviso na interface
        if (parsedData.previousResponses) {
          console.log("Carregando respostas anteriores de checklist em continuação:", parsedData.id)

          // Não vamos preencher respostas anteriores para não confundir o usuário
          // Isso é apenas um efeito informativo
          // Em uma implementação mais completa, poderíamos carregar algumas informações específicas
        }
      } catch (error) {
        console.error("Erro ao processar dados de checklist em continuação:", error)
      }
    }
  }, [])

  // Função para obter a localização atual do usuário
  const getCurrentLocation = async (): Promise<{
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    timestamp: number | null
    address: string | null
  } | null> => {
    try {
      // Iniciar a obtenção da localização
      geolocation.getCurrentPosition()

      // Aguardar até que a localização seja obtida ou ocorra um erro
      // Timeout de 10 segundos
      const startTime = Date.now()
      while (Date.now() - startTime < 10000) {
        if (geolocation.latitude && geolocation.longitude) {
          return {
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
            accuracy: geolocation.accuracy,
            timestamp: geolocation.timestamp,
            address: geolocation.address,
          }
        }

        if (geolocation.error) {
          console.error("Erro ao obter localização:", geolocation.error)
          return null
        }

        // Aguardar um pouco antes de verificar novamente
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      console.error("Timeout ao obter localização")
      return null
    } catch (error) {
      console.error("Erro ao obter localização:", error)
      return null
    }
  }

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

  // Dentro do componente ChecklistForm, atualize a função handleKilometerSubmit
  const handleKilometerSubmit = (kilometer: string) => {
    // Salvar a quilometragem nas respostas
    setResponses((prev) => ({
      ...prev,
      vehicleKilometer: kilometer,
    }))

    // Adicionar ao histórico de quilometragem
    if (checklist.vehicle?.id) {
      kilometerHistory.addKilometerRecord({
        vehicleId: checklist.vehicle.id,
        kilometer: Number(kilometer.replace(/\D/g, "")),
        timestamp: new Date().toISOString(),
        checklistId: checklistId,
      })
    }

    // Verificar se a localização é obrigatória
    if (isLocationRequired) {
      // Se a localização é obrigatória, mostrar o diálogo de localização
      setShowLocationDialog(true)
    } else {
      // Se a localização não é obrigatória, tentar obter a localização em segundo plano
      getCurrentLocation().then((location) => {
        // Finalizar a submissão com a localização obtida (ou null se falhou)
        finalizeSubmission(location)
      })
    }
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
      } else if (isLocationRequired) {
        // Se a localização é obrigatória mas não foi obtida, criar uma localização padrão
        serializableLocation = {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: Date.now(),
          address: "Unknown",
        }
      }

      // Buscar informações de um checklist em continuação, se existir
      const continuingChecklistData = localStorage.getItem("continuing_checklist")
      let previousResponses = {}

      if (continuingChecklistData) {
        try {
          const parsedData = JSON.parse(continuingChecklistData)
          previousResponses = parsedData.previousResponses || {}
        } catch (error) {
          console.error("Erro ao processar dados de checklist em continuação:", error)
        }
      }

      const finalData = {
        ...previousResponses, // Incluir respostas anteriores
        ...responses,
        photos: serializablePhotos,
        audios: serializableAudios,
        location: serializableLocation,
        vehicleKilometer: responses.vehicleKilometer || vehicleKilometer, // Adicionar a quilometragem do veículo
      }

      // Chamar a função de submissão
      onSubmit({
        ...finalData,
        id: checklistId,
      })
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

  useEffect(() => {
    if (currentItem) {
      console.log("Current item details:", {
        id: currentItem.id,
        question: currentItem.question,
        type: currentItem.type,
        answerTypeId: currentItem.answerTypeId,
        answerValues: currentItem.answerValues,
        options: currentItem.options,
      })
    }
  }, [currentItem])

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {/* Modifique o título da página para mostrar quando se trata da continuação de um checklist */}
        {/* Encontre a div que contém o título do checklist (linha 629) e substitua: */}
        <div className="ml-2">
          <h1 className="text-xl font-bold">{checklist.title}</h1>
          <div className="flex items-center">
            <p className="text-sm text-muted-foreground">
              {checklist.vehicle} ({checklist.licensePlate})
            </p>
            {localStorage.getItem("continuing_checklist") && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                Etapa 2 de 2
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Progresso</span>
          <span>
            {currentStep + 1} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-slate-200 [&>div]:bg-blue-500" />
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <Card className="mb-6">
          {/* Container of CardHeader */}
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
                      {currentItem.type === "condition" &&
                        "Avalie a condição do item como Ótimo, Bom, Regular ou Ruim."}
                      {currentItem.type === "fuel" && "Selecione o nível de combustível ou fluido."}
                      {(currentItem.requiredImage || currentItem.requiresPhoto) && (
                        <div className="mt-2 text-blue-500">Este item requer foto(s).</div>
                      )}
                      {(currentItem.requiredAudio || currentItem.requiresAudio) && (
                        <div className="mt-2 text-blue-500">Este item requer gravação de áudio.</div>
                      )}
                      {(currentItem.requiredObservation || currentItem.requiresObservation) && (
                        <div className="mt-2 text-blue-500">Este item requer observações.</div>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription className="text-base font-medium">
              {currentItem.question}
              {(currentItem.requiredImage ||
                currentItem.requiresPhoto ||
                currentItem.requiredAudio ||
                currentItem.requiresAudio ||
                currentItem.requiredObservation ||
                currentItem.requiresObservation) && <span className="text-blue-500 ml-1">*</span>}
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
                    {currentItem.answerValues && currentItem.answerValues.length > 0
                      ? currentItem.answerValues[0]
                      : "Sim"}
                  </Button>
                  <Button
                    type="button"
                    variant={responses[currentItem.id] === false ? "default" : "outline"}
                    className={responses[currentItem.id] === false ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => handleBooleanResponse(false)}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    {currentItem.answerValues && currentItem.answerValues.length > 1
                      ? currentItem.answerValues[1]
                      : "Não"}
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
              <div className="space-y-4">
                <Textarea
                  placeholder="Digite sua resposta aqui..."
                  className="min-h-[120px]"
                  value={responses[currentItem.id] || ""}
                  onChange={(e) => handleTextResponse(e.target.value)}
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
                    {/* Use answerValues from the item if available */}
                    {(currentItem.answerValues && Array.isArray(currentItem.answerValues)
                      ? currentItem.answerValues
                      : currentItem.options || ["OK", "Não OK"]
                    ).map((option: string) => (
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
                <div className="grid grid-cols-4 gap-2">
                  {(currentItem.answerValues || ["Ótimo", "Bom", "Regular", "Ruim"]).map((value, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={responses[currentItem.id] === value.toLowerCase() ? "default" : "outline"}
                      className={
                        responses[currentItem.id] === value.toLowerCase()
                          ? index === 0 || index === 1
                            ? "bg-green-500 hover:bg-green-600"
                            : index === 2
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : "bg-red-500 hover:bg-red-600"
                          : ""
                      }
                      onClick={() => handleConditionResponse(value.toLowerCase())}
                    >
                      {value}
                    </Button>
                  ))}
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
                <div className="grid grid-cols-5 gap-2">
                  {(currentItem.answerValues || ["Cheio", "1/4", "1/2", "3/4", "Vazio"]).map((value, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={responses[currentItem.id] === value.toLowerCase() ? "default" : "outline"}
                      className={
                        responses[currentItem.id] === value.toLowerCase()
                          ? index === 0
                            ? "bg-green-500 hover:bg-green-600"
                            : index === 4
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-yellow-500 hover:bg-yellow-600 text-white"
                          : ""
                      }
                      onClick={() => handleFuelLevelResponse(value.toLowerCase())}
                    >
                      <div className="flex flex-col items-center">
                        {index === 0 && <Droplet className="h-4 w-4 mb-1" />}
                        {index > 0 && index < 4 && <DropletHalf className="h-4 w-4 mb-1" />}
                        {index === 4 && <DropletOff className="h-4 w-4 mb-1" />}
                        {value}
                      </div>
                    </Button>
                  ))}
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

            {currentItem.type === "image" && (
              <div className="flex flex-col gap-4">
                <div className="text-center p-4 border-2 border-dashed rounded-lg">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Este item requer uma foto. Clique no botão abaixo para adicionar.
                  </p>
                  <Button
                    variant="outline"
                    className="mx-auto bg-blue-50 text-blue-500 border-blue-200 hover:bg-blue-100"
                    onClick={openCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Adicionar Foto
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
            {renderMediaAttachments()}
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

      {/* Atualize a renderização do KilometerDialog para passar o vehicleId */}
      {showKilometerDialog && (
        <Dialog open={showKilometerDialog} onOpenChange={setShowKilometerDialog}>
          <DialogContent className="sm:max-w-md">
            <KilometerDialog
              onSubmit={handleKilometerSubmit}
              onCancel={() => setShowKilometerDialog(false)}
              vehicleId={checklist.vehicle?.id || ""}
              initialValue={responses.vehicleKilometer || ""}
              checklistId={checklistId} // Pass checklistId to KilometerDialog
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
