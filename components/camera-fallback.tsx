"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, ImageIcon, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CameraFallbackProps {
  onCapture: (photoBlob: Blob, photoUrl: string) => void
  onCancel?: () => void
  className?: string
}

export function CameraFallback({ onCapture, onCancel, className }: CameraFallbackProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    const file = files[0]
    fileRef.current = file // Armazenar o arquivo para uso posterior
    const reader = new FileReader()

    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result as string
        setPreviewImage(imageUrl)
      }
    }

    reader.onerror = () => {
      console.error("Erro ao ler o arquivo")
      setError("Erro ao ler o arquivo. Por favor, tente novamente.")
    }

    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const saveImage = () => {
    if (!previewImage) return

    setIsProcessing(true)
    setError(null)

    try {
      // Se temos o arquivo original, usamos ele diretamente
      if (fileRef.current) {
        onCapture(fileRef.current, previewImage)
        setIsProcessing(false)
        return
      }

      // Método alternativo para converter dataURL para Blob
      const byteString = atob(previewImage.split(",")[1])
      const mimeString = previewImage.split(",")[0].split(":")[1].split(";")[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      const blob = new Blob([ab], { type: mimeString })

      // Chamar o callback com o blob e a URL
      onCapture(blob, previewImage)
    } catch (error: any) {
      console.error("Erro ao processar a imagem:", error)
      setError(`Erro ao processar a imagem: ${error.message || "Desconhecido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetImage = () => {
    setPreviewImage(null)
    setError(null)
    fileRef.current = null
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!previewImage ? (
        <div className="flex flex-col gap-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Selecione uma imagem</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arraste e solte uma imagem aqui ou clique para selecionar
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              capture="environment" // Adicionar atributo capture para dispositivos móveis
            />
            <Button variant="outline" onClick={triggerFileInput} className="mx-auto">
              <ImageIcon className="h-4 w-4 mr-2" />
              Selecionar Imagem
            </Button>
          </div>

          {error && <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded-md">{error}</div>}

          {onCancel && (
            <Button variant="ghost" className="w-full" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <img
              src={previewImage || "/placeholder.svg"}
              alt="Imagem selecionada"
              className="w-full h-full object-contain"
            />
          </div>

          {error && <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded-md">{error}</div>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={resetImage} disabled={isProcessing}>
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>

            <Button
              variant="default"
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={saveImage}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Usar Imagem
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
