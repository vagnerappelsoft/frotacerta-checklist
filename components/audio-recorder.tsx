"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Play, Pause, Trash2, FileAudio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface AudioRecorderProps {
  onAudioSaved: (audioBlob: Blob, audioUrl: string) => void
  onCancel?: () => void
  className?: string
}

export function AudioRecorder({ onAudioSaved, onCancel, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Inicializar o elemento de áudio
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.addEventListener("timeupdate", updateProgress)
    audioRef.current.addEventListener("ended", handleAudioEnded)
    audioRef.current.addEventListener("loadedmetadata", () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration)
      }
    })

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", updateProgress)
        audioRef.current.removeEventListener("ended", handleAudioEnded)
        audioRef.current.pause()
        audioRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.load()
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Iniciar o timer para atualizar o tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error)
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Parar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Parar todas as faixas do stream
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    if (audioRef.current) {
      audioRef.current.src = ""
    }
  }

  const saveRecording = () => {
    if (!audioUrl) return

    // Criar um novo Blob a partir do áudio atual
    fetch(audioUrl)
      .then((res) => res.blob())
      .then((blob) => {
        onAudioSaved(blob, audioUrl)
      })
      .catch((err) => {
        console.error("Erro ao salvar o áudio:", err)
      })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("space-y-4 p-4 border rounded-md bg-slate-50", className)}>
      {!audioUrl ? (
        // Interface de gravação
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300")} />
              <span className="font-medium">{isRecording ? "Gravando..." : "Pronto para gravar"}</span>
            </div>
            <span className="font-mono">{formatTime(recordingTime)}</span>
          </div>

          <div className="flex justify-center">
            {isRecording ? (
              <Button variant="destructive" size="lg" className="rounded-full w-16 h-16 p-0" onClick={stopRecording}>
                <Square className="h-6 w-6" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                className="rounded-full w-16 h-16 p-0 bg-red-500 hover:bg-red-600"
                onClick={startRecording}
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}
          </div>

          {onCancel && (
            <Button variant="outline" className="w-full" onClick={onCancel} disabled={isRecording}>
              Cancelar
            </Button>
          )}
        </div>
      ) : (
        // Interface de reprodução
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Áudio gravado</span>
            <span className="font-mono text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSliderChange}
            className="my-4"
          />

          <div className="flex justify-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full" onClick={togglePlayback}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button variant="outline" size="icon" className="rounded-full text-red-500" onClick={resetRecording}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancelar
              </Button>
            )}

            <Button variant="default" className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={saveRecording}>
              <FileAudio className="h-4 w-4 mr-2 text-blue-500" />
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
