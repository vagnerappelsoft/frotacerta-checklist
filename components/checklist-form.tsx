"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, AlertCircle, HelpCircle, Camera, X, Mic, FileAudio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AudioRecorder } from "@/components/audio-recorder"
import { CameraCapture } from "@/components/camera-capture"
import { CameraFallback } from "@/components/camera-fallback"
import { ErrorFallback } from "@/components/error-fallback"
import { LocationPermission } from "@/components/location-permission"
import { LocationMapDialog } from "@/components/location-map-dialog"
import { KilometerDialog } from "@/components/kilometer-dialog"
import { kilometerHistory } from "@/lib/kilometer-history"
import { checklistSettings } from "@/lib/checklist-settings"
import { useGeolocation } from "@/hooks/use-geolocation"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { offlineStorage } from "@/lib/offline-storage"

interface ChecklistFormProps {
  checklist: any
  onSubmit: (data: any) => void
  onCancel: () => void
  offlineMode?: boolean
}

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
    // Generate a unique ID that includes the model ID to ensure isolation
    const modelId = checklist?.template?.id || checklist?.modelId || "unknown"
    return `checklist_${modelId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  })

  // Use the hook for geolocation
  const geolocation = useGeolocation()

  const totalSteps = checklist.items.length
  const progress = Math.round((currentStep / totalSteps) * 100)
  const currentItem = checklist.items[currentStep]

  // Check if current item requires photos, audio or observations
  const requiresPhoto = currentItem.requiresPhoto || currentItem.requiredImage || currentItem.type === "image" || false
  const requiresAudio = currentItem.requiresAudio || currentItem.requiredAudio || false
  const requiresObservation = currentItem.requiredObservation || currentItem.requiredObservation || false

  // Load checklist settings
  useEffect(() => {
    const settings = checklistSettings.getSettings()
    setIsLocationRequired(settings.requiredLocations)
    setIsKilometerRequired(settings.requiredKilometer)
  }, [])

  // Load existing responses for this specific model if continuing a checklist
  useEffect(() => {
    const loadExistingResponses = async () => {
      try {
        // Get the model ID to ensure we only load data for this specific model
        const modelId = checklist?.template?.id || checklist?.modelId || null

        if (!modelId) {
          console.warn("No model ID found, cannot load existing responses")
          return
        }

        // Check if we're continuing a checklist for this specific model
        const continuingData = localStorage.getItem("continuing_checklist")
        if (continuingData) {
          const parsedData = JSON.parse(continuingData)

          console.log("Dados de continuação encontrados:", parsedData)

          // Only load if the model IDs match to prevent cross-contamination
          if (
            parsedData.modelId &&
            (parsedData.modelId.toString() === modelId.toString() || parsedData.originalChecklist)
          ) {
            console.log(`Loading existing responses for model ${modelId}`)

            // IMPORTANTE: Preservar o ID do checklist original
            if (parsedData.id) {
              console.log(`Usando ID de checklist existente: ${parsedData.id}`)
              setChecklistId(parsedData.id)

              // Garantir que o ID também seja armazenado no localStorage
              localStorage.setItem("checklistId", parsedData.id)
            }

            // Load previous responses if they exist
            if (parsedData.previousResponses) {
              console.log("Carregando respostas anteriores")
              setResponses(parsedData.previousResponses)
            }

            // Load previous photos if they exist
            if (parsedData.previousPhotos) {
              console.log("Carregando fotos anteriores")
              setPhotos(parsedData.previousPhotos)
            }

            // Load previous audios if they exist
            if (parsedData.previousAudios) {
              console.log("Carregando áudios anteriores")
              setAudios(parsedData.previousAudios)
            }
          } else {
            console.log(`Model ID mismatch: continuing ${parsedData.modelId}, current ${modelId}`)
            // Clear continuing data since it's for a different model
            localStorage.removeItem("continuing_checklist")
          }
        } else {
          console.log("Nenhum dado de continuação encontrado, iniciando novo checklist")
        }
      } catch (error) {
        console.error("Error loading existing responses:", error)
      }
    }

    loadExistingResponses()
  }, [checklist])

  // Save checklistId to localStorage
  useEffect(() => {
    if (checklistId) {
      localStorage.setItem("checklistId", checklistId)
    }
  }, [checklistId])

  const handleNext = () => {
    // Clear any previous submission error
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

    // Save current progress to ensure model-specific data persistence
    saveCurrentProgress()

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    } else {
      // Checklist completion flow
      if (isKilometerRequired) {
        // If kilometer is required, show kilometer dialog
        setShowKilometerDialog(true)
      } else if (isLocationRequired) {
        // If location is required, show location dialog
        setShowLocationDialog(true)
      } else {
        // If neither is required, finalize submission
        finalizeSubmission(null)
      }
    }
  }

  // Save current progress to localStorage with model ID to ensure data isolation
  const saveCurrentProgress = () => {
    try {
      const modelId = checklist?.template?.id || checklist?.modelId || "unknown"

      // Store progress with model ID to ensure data isolation
      const progressData = {
        id: checklistId,
        modelId: modelId.toString(),
        currentStep: currentStep,
        previousResponses: responses,
        previousPhotos: photos,
        previousAudios: audios,
        timestamp: new Date().toISOString(),
      }

      // Save to localStorage for quick access
      localStorage.setItem("continuing_checklist", JSON.stringify(progressData))

      // Try to save to IndexedDB, but handle errors gracefully
      try {
        // Use "checklists" store instead of "checklist_progress" since it definitely exists
        offlineStorage
          .saveItem("checklists", {
            ...progressData,
            id: `progress_${modelId}_${checklistId}`,
            type: "progress", // Add a type field to distinguish from regular checklists
          })
          .catch((error) => {
            console.warn("Failed to save progress to IndexedDB, falling back to localStorage only:", error)
          })
      } catch (error) {
        console.warn("Error saving progress to IndexedDB:", error)
        // Continue with localStorage only
      }

      console.log(`Progress saved for model ${modelId}`)
    } catch (error) {
      console.error("Error saving progress:", error)
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

  // Response handling functions
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

  // Photo handling functions
  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Process each file to create base64 directly
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

    // Process all files and update state
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

  // Camera and audio handling functions
  const handleCameraCapture = (photoBlob: Blob, photoUrl: string) => {
    try {
      console.log("Foto capturada, processando...")

      // Use the base64 data URL directly
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
    // Convert blob to base64 directly
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

  // Camera handling
  const openCamera = async () => {
    try {
      // Check if browser supports MediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log("Navegador não suporta MediaDevices, usando fallback")
        setUseCameraFallback(true)
        setShowCameraDialog(true)
        return
      }

      // Check if we're in a secure context (HTTPS or localhost)
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

      // Try to access the camera to check permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Stop the stream immediately after testing
        stream.getTracks().forEach((track) => track.stop())

        // If we get here, we have camera permission
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

  // Render media attachments (photos and audios)
  const renderMediaAttachments = () => {
    // Check both field name variations for each requirement
    const isPhotoRequired = currentItem.requiredImage || currentItem.requiresPhoto || false
    const isAudioRequired = currentItem.requiredAudio || currentItem.requiresAudio || false
    const isObservationRequired = currentItem.requiredObservation || currentItem.requiresObservation || false

    return (
      <div className="space-y-6 mt-6 border-t pt-6">
        {/* Photos section */}
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

        {/* Audio section */}
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

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all blob URLs when unmounting
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

  // Get current location
  const [locationLoading, setLocationLoading] = useState(false)
  const getCurrentLocation = async (): Promise<{
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    timestamp: number | null
    address: string | null
  } | null> => {
    try {
      setLocationLoading(true)
      // Start getting location
      geolocation.getCurrentPosition()

      // Wait until location is obtained or error occurs
      // 10 second timeout
      const startTime = Date.now()
      while (Date.now() - startTime < 10000) {
        if (geolocation.latitude && geolocation.longitude) {
          setLocationLoading(false)
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
          setLocationLoading(false)
          return null
        }

        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      console.error("Timeout ao obter localização")
      setLocationLoading(false)
      return null
    } catch (error) {
      console.error("Erro ao obter localização:", error)
      setLocationLoading(false)
      return null
    } finally {
      setLocationLoading(false)
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

  const handleKilometerSubmit = (kilometer: string) => {
    // Save kilometer in responses
    setResponses((prev) => ({
      ...prev,
      vehicleKilometer: kilometer,
    }))

    // Add to kilometer history
    if (checklist.vehicle?.id) {
      kilometerHistory.addKilometerRecord({
        vehicleId: checklist.vehicle.id,
        kilometer: Number(kilometer.replace(/\D/g, "")),
        timestamp: new Date().toISOString(),
        checklistId: checklistId,
      })
    }

    // Check if location is required
    if (isLocationRequired) {
      // If location is required, show location dialog
      setShowLocationDialog(true)
    } else {
      // If location is not required, try to get location in background
      getCurrentLocation().then((location) => {
        // Finalize submission with obtained location (or null if failed)
        finalizeSubmission(location)
      })
    }
  }

  const finalizeSubmission = (location: any) => {
    try {
      // Prepare final data for submission
      // Convert blob URLs to simple strings to ensure serializability
      const serializablePhotos: Record<string, string[]> = {}
      Object.keys(photos).forEach((key) => {
        serializablePhotos[key] = [...photos[key]]
      })

      const serializableAudios: Record<string, string[]> = {}
      Object.keys(audios).forEach((key) => {
        serializableAudios[key] = [...audios[key]]
      })

      // Ensure location is serializable
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
        // If location is required but not obtained, create a default location
        serializableLocation = {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: Date.now(),
          address: "Unknown",
        }
      }

      // Get information from a continuing checklist, if it exists
      const continuingChecklistData = localStorage.getItem("continuing_checklist")
      let previousResponses = {}

      if (continuingChecklistData) {
        try {
          const parsedData = JSON.parse(continuingChecklistData)

          // Only use previous responses if they're for the same model
          const currentModelId = checklist?.template?.id || checklist?.modelId || "unknown"
          if (parsedData.modelId === currentModelId.toString()) {
            previousResponses = parsedData.previousResponses || {}
          } else {
            console.log(`Ignoring previous responses from different model: ${parsedData.modelId} vs ${currentModelId}`)
          }
        } catch (error) {
          console.error("Erro ao processar dados de checklist em continuação:", error)
        }
      }

      const finalData = {
        ...previousResponses, // Include previous responses only if from same model
        ...responses,
        photos: serializablePhotos,
        audios: serializableAudios,
        location: serializableLocation,
        vehicleKilometer: responses.vehicleKilometer || vehicleKilometer,
        modelId: checklist?.template?.id || checklist?.modelId || "unknown", // Include model ID for data isolation
      }

      // Clear continuing data after successful submission
      localStorage.removeItem("continuing_checklist")

      // Call the submission function
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
      console.log("Detalhes do item atual:", {
        id: currentItem.id,
        question: currentItem.question,
        type: currentItem.type,
        answerTypeId: currentItem.answerTypeId,
        answerValues: currentItem.answerValues,
        options: currentItem.options,
      })

      // Verificar se o tipo está correto com base no answerTypeId
      if (currentItem.answerTypeId) {
        let correctType
        switch (currentItem.answerTypeId) {
          case 1:
            correctType = "boolean"
            break
          case 2:
            correctType = "condition"
            break
          case 3:
            correctType = "fuel"
            break
          case 4:
            correctType = "text"
            break
          case 5:
            correctType = "select"
            break
          default:
            correctType = "text"
        }

        // Se o tipo estiver incorreto, registrar um aviso
        if (currentItem.type !== correctType) {
          console.warn(
            `Tipo incorreto para o item ${currentItem.id}: atual=${currentItem.type}, correto=${correctType}`,
          )
        }
      }
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
            {/* Log para depuração do tipo de item */}
            {process.env.NODE_ENV !== "production" && (
              <div className="text-xs text-gray-400 mb-2">
                Tipo: {currentItem.type}, ID: {currentItem.id}, answerTypeId: {currentItem.answerTypeId || "N/A"}
                {currentItem.answerValues && currentItem.answerValues.length > 0 && (
                  <>, Opções: {currentItem.answerValues.join(", ")}</>
                )}
              </div>
            )}

            {/* Renderização condicional baseada no tipo de item */}
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

            {/* Tipo de resposta: Condição (Ótimo, Bom, Regular, Ruim) */}
            {currentItem.type === "condition" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {(currentItem.answerValues || ["Ótimo", "Bom", "Regular", "Ruim"]).map((option, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={responses[currentItem.id] === option ? "default" : "outline"}
                      className={responses[currentItem.id] === option ? "bg-blue-500 hover:bg-blue-600" : ""}
                      onClick={() => handleConditionResponse(option)}
                    >
                      {option}
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

            {/* Tipo de resposta: Nível de Combustível */}
            {currentItem.type === "fuel" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {(currentItem.answerValues || ["Cheio", "3/4", "1/2", "1/4", "Vazio"]).map((option, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={responses[currentItem.id] === option ? "default" : "outline"}
                      className={responses[currentItem.id] === option ? "bg-blue-500 hover:bg-blue-600" : ""}
                      onClick={() => handleFuelLevelResponse(option)}
                    >
                      {option}
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

            {/* Tipo de resposta: Seleção (Select) */}
            {currentItem.type === "select" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {(currentItem.answerValues || ["OK", "Não OK"]).map((option, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={responses[currentItem.id] === option ? "default" : "outline"}
                      className={responses[currentItem.id] === option ? "bg-blue-500 hover:bg-blue-600" : ""}
                      onClick={() => handleSelectResponse(option)}
                    >
                      {option}
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

            {/* Tipo de resposta: Texto */}
            {currentItem.type === "text" && (
              <div className="flex flex-col gap-4">
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Digite sua resposta aqui..."
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

            {/* Tipo de resposta: Número */}
            {currentItem.type === "number" && (
              <div className="flex flex-col gap-4">
                <input
                  type="number"
                  className="w-full p-2 border rounded-md"
                  placeholder="Digite um valor numérico..."
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

            {/* Campo de observação (se necessário) */}
            {(currentItem.requiredObservation || currentItem.requiresObservation) && (
              <div className="flex flex-col gap-2 mt-4">
                <Label className="text-base font-medium flex items-center">
                  Observações
                  <span className="text-blue-500 ml-1">*</span>
                </Label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  placeholder="Adicione observações sobre este item..."
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

            {/* Render media attachments */}
            {renderMediaAttachments()}
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleNext}>
              {currentStep < totalSteps - 1 ? "Próximo" : "Finalizar Checklist"}
            </Button>
          </CardFooter>
        </Card>
      </ScrollArea>

      {/* Dialogs and modals */}
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

      {/* Audio recording dialog */}
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

      {/* Kilometer dialog */}
      {showKilometerDialog && (
        <Dialog open={showKilometerDialog} onOpenChange={setShowKilometerDialog}>
          <DialogContent className="sm:max-w-md">
            <KilometerDialog
              onSubmit={handleKilometerSubmit}
              onCancel={() => setShowKilometerDialog(false)}
              vehicleId={checklist.vehicle?.id || ""}
              initialValue={responses.vehicleKilometer || ""}
              checklistId={checklistId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
