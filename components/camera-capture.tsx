"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Camera, X, RotateCcw, Check, ImageIcon, Zap, ZapOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CameraCaptureProps {
  onCapture: (photoBlob: Blob, photoUrl: string) => void
  onCancel?: () => void
  onError?: () => void
  className?: string
}

export function CameraCapture({ onCapture, onCancel, onError, className }: CameraCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [isFlashSupported, setIsFlashSupported] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Iniciar a câmera automaticamente quando o componente for montado
  useEffect(() => {
    startCamera()

    // Limpar recursos quando o componente for desmontado
    return () => {
      stopCamera()
    }
  }, [])

  // Verificar periodicamente se o vídeo está realmente reproduzindo
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      const checkVideoPlaying = setInterval(() => {
        const video = videoRef.current
        if (video && !video.paused && video.currentTime > 0 && !video.ended && video.readyState > 2) {
          setIsVideoPlaying(true)
          clearInterval(checkVideoPlaying)
        }
      }, 500)

      return () => clearInterval(checkVideoPlaying)
    }
  }, [streamRef.current])

  // Efeito para aplicar o flash quando ele é alterado
  useEffect(() => {
    if (streamRef.current && isFlashSupported) {
      applyFlashSettings()
    }
  }, [isFlashOn, isFlashSupported])

  // Add body class to prevent scrolling when camera is active
  useEffect(() => {
    if (isCameraActive || capturedImage) {
      document.body.classList.add("overflow-hidden")
      document.documentElement.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
      document.documentElement.classList.remove("overflow-hidden")
    }

    return () => {
      document.body.classList.remove("overflow-hidden")
      document.documentElement.classList.remove("overflow-hidden")
    }
  }, [isCameraActive, capturedImage])

  const checkCameraAvailability = async () => {
    try {
      // Verificar se o navegador suporta a API MediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log("Seu navegador não suporta acesso à câmera")
        setCameraError("Seu navegador não suporta acesso à câmera")
        if (onError) onError()
        return false
      }

      // Verificar se há dispositivos de vídeo disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")

      if (videoDevices.length === 0) {
        console.log("Nenhuma câmera detectada no seu dispositivo")
        setCameraError("Nenhuma câmera detectada no seu dispositivo")
        if (onError) onError()
        return false
      }

      return true
    } catch (error) {
      console.error("Erro ao verificar disponibilidade da câmera:", error)
      setCameraError(`Erro ao verificar câmera: ${error}`)
      if (onError) onError()
      return false
    }
  }

  const applyFlashSettings = async () => {
    try {
      if (!streamRef.current) return

      const track = streamRef.current.getVideoTracks()[0]
      if (!track) return

      const capabilities = track.getCapabilities && track.getCapabilities()

      // Verificar se o flash é suportado
      if (capabilities && capabilities.torch) {
        setIsFlashSupported(true)
        try {
          const constraints = { advanced: [{ torch: isFlashOn }] }
          await track.applyConstraints(constraints)
          console.log(`Flash ${isFlashOn ? "ativado" : "desativado"} com sucesso`)
        } catch (e) {
          console.error("Erro ao aplicar configurações de flash:", e)
        }
      } else {
        setIsFlashSupported(false)
        console.log("Flash não é suportado neste dispositivo")
      }
    } catch (error) {
      console.error("Erro ao configurar flash:", error)
      setIsFlashSupported(false)
    }
  }

  const toggleFlash = async () => {
    if (!isFlashSupported) return
    setIsFlashOn(!isFlashOn)
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      setIsCameraActive(true) // Ativar a interface da câmera antes de solicitar permissão
      setIsVideoPlaying(false)

      // Verificar disponibilidade da câmera
      const isCameraAvailable = await checkCameraAvailability()
      if (!isCameraAvailable) {
        return
      }

      // Solicitar a resolução mais alta disponível para melhor qualidade
      const constraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      console.log("Solicitando acesso à câmera...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Acesso à câmera concedido, configurando stream...")

      // Armazenar o stream na ref
      streamRef.current = stream

      // Verificar se o flash é suportado
      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities && track.getCapabilities()
        const isFlashAvailable = capabilities && capabilities.torch
        setIsFlashSupported(isFlashAvailable || false)
        console.log("Flash suportado:", isFlashAvailable)
      }

      if (videoRef.current) {
        console.log("Atribuindo stream ao elemento de vídeo")
        videoRef.current.srcObject = stream

        // Adicionar um timeout como fallback caso o evento onloadedmetadata não dispare
        const timeoutId = setTimeout(() => {
          console.log("Timeout de carregamento de metadados, tentando iniciar reprodução manualmente")
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                console.log("Reprodução de vídeo iniciada via timeout")
                setIsVideoPlaying(true)
              })
              .catch((err) => {
                console.error("Erro ao iniciar reprodução via timeout:", err)
                setCameraError(`Erro ao iniciar câmera: ${err.message}`)
                if (onError) onError()
              })
          }
        }, 1000) // Reduzir para 1 segundo para ser mais responsivo

        // Garantir que o vídeo seja reproduzido após carregar os metadados
        videoRef.current.onloadedmetadata = () => {
          console.log("Metadados de vídeo carregados, iniciando reprodução")
          clearTimeout(timeoutId)
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                console.log("Reprodução de vídeo iniciada")
                setIsVideoPlaying(true)
              })
              .catch((err) => {
                console.error("Erro ao iniciar reprodução:", err)
                setCameraError(`Erro ao iniciar reprodução: ${err.message}`)
                if (onError) onError()
              })
          }
        }

        // Adicionar um evento para detectar quando o vídeo está realmente reproduzindo
        videoRef.current.onplaying = () => {
          console.log("Vídeo está reproduzindo agora")
          setIsVideoPlaying(true)
        }
      } else {
        console.error("Elemento de vídeo não encontrado")
        setCameraError("Elemento de vídeo não encontrado")
        setIsCameraActive(false)
        if (onError) onError()
      }
    } catch (error: any) {
      console.error("Erro ao acessar a câmera:", error)
      setCameraError(`Erro ao acessar a câmera: ${error.message || "Desconhecido"}`)
      setIsCameraActive(false)
      if (onError) onError()
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsCameraActive(false)
      setIsVideoPlaying(false)
      setIsFlashOn(false)
    }
  }

  const switchCamera = () => {
    stopCamera()
    setIsFrontCamera(!isFrontCamera)
    setTimeout(() => {
      startCamera()
    }, 300)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Definir as dimensões do canvas para corresponder ao vídeo
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    // Desenhar o quadro atual do vídeo no canvas
    const context = canvas.getContext("2d")
    if (context) {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Converter para URL de dados
        // Reduzir a qualidade da imagem para evitar problemas com tamanho
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8)
        setCapturedImage(imageDataUrl)

        // Parar a câmera
        stopCamera()
      } catch (error) {
        console.error("Erro ao capturar foto:", error)
        setCameraError(`Erro ao capturar foto: ${error}`)
        if (onError) onError()
      }
    }
  }

  // Função para forçar a captura mesmo se a detecção automática falhar
  const forceCapture = () => {
    if (videoRef.current && streamRef.current) {
      capturePhoto()
    } else {
      setCameraError("Não foi possível capturar a foto. Câmera não está pronta.")
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const savePhoto = () => {
    if (!capturedImage) return

    setIsProcessing(true)

    try {
      // Verificar se a imagem é uma string base64 válida
      if (!capturedImage.includes("base64,")) {
        throw new Error("Formato de imagem inválido")
      }

      // Converter dataURL para Blob
      const parts = capturedImage.split(",")
      const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg"
      const bstr = atob(parts[1])
      const n = bstr.length
      const u8arr = new Uint8Array(n)

      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i)
      }

      const blob = new Blob([u8arr], { type: mime })

      // Chamar o callback com o blob e a URL
      onCapture(blob, capturedImage)
      setIsProcessing(false)
    } catch (error) {
      console.error("Erro ao processar a imagem:", error)
      setCameraError(`Erro ao processar a imagem: ${error}`)
      setIsProcessing(false)
      alert("Erro ao processar a imagem. Por favor, tente novamente.")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsProcessing(true)

    const file = files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result as string
        setCapturedImage(imageUrl)

        // Converter para Blob diretamente do File
        try {
          onCapture(file, imageUrl)
        } catch (err) {
          console.error("Erro ao processar a imagem:", err)
          setCameraError(`Erro ao processar a imagem: ${err}`)
          alert("Erro ao processar a imagem. Por favor, tente novamente.")
        } finally {
          setIsProcessing(false)
        }
      }
    }

    reader.onerror = () => {
      console.error("Erro ao ler o arquivo")
      setCameraError("Erro ao ler o arquivo")
      setIsProcessing(false)
      alert("Erro ao ler o arquivo. Por favor, tente novamente.")
    }

    reader.readAsDataURL(file)
  }

  const handleCancelClick = () => {
    stopCamera()
    setIsCameraActive(false)
    if (onCancel) onCancel()
  }

  useEffect(() => {
    return () => {
      // Limpar recursos quando o componente for desmontado
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Revogar URLs de objetos para evitar vazamentos de memória
      if (capturedImage && capturedImage.startsWith("blob:")) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [capturedImage])

  if (!isCameraActive && !capturedImage) {
    return (
      <div className={cn("space-y-4", className)}>
        <Button
          variant="default"
          className="w-full bg-blue-500 hover:bg-blue-600"
          onClick={async () => {
            const isCameraAvailable = await checkCameraAvailability()
            if (isCameraAvailable) {
              startCamera()
            }
          }}
        >
          <Camera className="h-4 w-4 mr-2" />
          Abrir Câmera
        </Button>

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            id="photo-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
          />
          <Button variant="outline" className="w-full" type="button">
            <ImageIcon className="h-4 w-4 mr-2" />
            Selecionar da Galeria
          </Button>
        </div>

        {onCancel && (
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black w-full h-full"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
      }}
    >
      {isCameraActive && (
        <div className="w-full h-full flex flex-col">
          {/* Container de vídeo com posicionamento fixo para preencher toda a tela */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {!isVideoPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Aguardando acesso à câmera...</p>
                  <p className="text-xs mt-2">Se demorar muito, tente fechar e abrir novamente</p>
                  {cameraError && <p className="text-xs mt-2 text-red-400">Erro: {cameraError}</p>}

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white border-none"
                    onClick={forceCapture}
                  >
                    Tirar Foto Mesmo Assim
                  </Button>
                </div>
              </div>
            )}

            {/* Botão de cancelar (X) no canto superior esquerdo */}
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 left-4 rounded-full bg-black/40 hover:bg-black/60 text-white border-none z-10"
              onClick={handleCancelClick}
              aria-label="Cancelar"
              title="Cancelar"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Botão de flash no canto superior direito */}
            {isFlashSupported && (
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute top-4 right-4 rounded-full border-none z-10",
                  isFlashOn
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                    : "bg-black/40 hover:bg-black/60 text-white",
                )}
                onClick={toggleFlash}
                aria-label={isFlashOn ? "Desativar flash" : "Ativar flash"}
                title={isFlashOn ? "Desativar flash" : "Ativar flash"}
              >
                {isFlashOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
              </Button>
            )}

            {/* Controles inferiores */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8 px-4 z-10">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 text-white border-none"
                onClick={switchCamera}
                aria-label="Alternar câmera"
                title="Alternar câmera"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="rounded-full w-20 h-20 p-0 bg-white/10 hover:bg-white/20 border-4 border-white"
                onClick={capturePhoto}
                aria-label="Tirar foto"
                title="Tirar foto"
              >
                <span className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </span>
              </Button>

              {/* Espaço vazio para manter o layout equilibrado */}
              <div className="w-14 h-14"></div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="absolute bottom-0 left-0 right-0 text-center text-red-500 text-sm p-4 bg-black/80 z-20">
              {cameraError}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white border-none"
                onClick={() => {
                  setCameraError(null)
                  startCamera()
                }}
              >
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      )}

      {capturedImage && (
        <div className="w-full h-full flex flex-col">
          {/* Imagem capturada preenchendo a tela */}
          <div className="flex-grow flex items-center justify-center bg-black">
            <img
              src={capturedImage || "/placeholder.svg"}
              alt="Foto capturada"
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Barra de controles inferior */}
          <div className="p-6 bg-black flex justify-between items-center">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full bg-black/40 hover:bg-black/60 text-white border-none"
              onClick={retakePhoto}
              disabled={isProcessing}
              aria-label="Nova foto"
              title="Nova foto"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Nova Foto
            </Button>

            <Button
              variant="default"
              size="lg"
              className="rounded-full bg-blue-500 hover:bg-blue-600"
              onClick={savePhoto}
              disabled={isProcessing}
              aria-label="Usar foto"
              title="Usar foto"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Usar Foto
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
