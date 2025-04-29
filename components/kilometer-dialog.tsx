"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { kilometerHistory } from "@/lib/kilometer-history"

interface KilometerDialogProps {
  onSubmit: (kilometer: string) => void
  onCancel: () => void
  initialValue?: string
  vehicleId: string
  checklistId: string // Add checklistId prop
}

export function KilometerDialog({
  onSubmit,
  onCancel,
  initialValue = "",
  vehicleId,
  checklistId,
}: KilometerDialogProps) {
  const [kilometer, setKilometer] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [lastKilometer, setLastKilometer] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Buscar a última quilometragem registrada para este veículo
  useEffect(() => {
    const lastKm = kilometerHistory.getLastKilometer(vehicleId)
    setLastKilometer(lastKm)

    // Se temos um valor anterior e não temos um valor inicial, sugerir o último valor
    if (lastKm !== null && !initialValue) {
      setKilometer(lastKm.toString())
    }
  }, [vehicleId, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar se o valor foi informado
    if (!kilometer || kilometer.trim() === "") {
      setError("Por favor, informe a quilometragem do veículo")
      return
    }

    // Validar se é um número válido
    const kmValue = Number(kilometer.replace(/\D/g, ""))
    if (isNaN(kmValue)) {
      setError("Por favor, informe um valor numérico válido")
      return
    }

    // Validar se está dentro de um intervalo razoável (0 a 999999)
    if (kmValue < 0 || kmValue > 999999) {
      setError("Por favor, informe um valor entre 0 e 999.999 km")
      return
    }

    // Validar se não é menor que a última quilometragem registrada
    if (lastKilometer !== null && kmValue < lastKilometer) {
      setError(`A quilometragem não pode ser menor que o último registro (${formatNumber(lastKilometer)} km)`)
      return
    }

    // Limpar erro e submeter
    setError(null)
    onSubmit(kmValue.toString())
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números e formatar com pontos
    const value = e.target.value.replace(/\D/g, "")

    // Formatar com pontos para melhor visualização
    let formattedValue = ""
    if (value.length > 3) {
      const thousands = value.slice(0, -3)
      const hundreds = value.slice(-3)
      formattedValue = `${thousands}.${hundreds}`

      // Se tiver mais de 6 dígitos, adicionar outro ponto
      if (thousands.length > 3) {
        formattedValue = `${thousands.slice(0, -3)}.${thousands.slice(-3)}.${hundreds}`
      }
    } else {
      formattedValue = value
    }

    setKilometer(formattedValue)

    // Limpar erro quando o usuário digita
    if (error) setError(null)
  }

  // Função para formatar números com pontos
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  return (
    <div className="p-6">
      <DialogHeader className="mb-4">
        <DialogTitle>Quilometragem do Veículo</DialogTitle>
        <DialogDescription>Informe a quilometragem atual do veículo para finalizar o checklist.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kilometer" className="font-medium">
            Quilometragem (km) <span className="text-blue-500">*</span>
          </Label>
          <Input
            id="kilometer"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 12.345"
            value={kilometer}
            onChange={handleChange}
            className="text-lg"
            autoFocus
          />

          {lastKilometer !== null && (
            <Alert variant="info" className="mt-2 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Último registro</AlertTitle>
              <AlertDescription className="text-blue-600">
                A última quilometragem registrada para este veículo foi de {formatNumber(lastKilometer)} km.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600">
            Confirmar
          </Button>
        </DialogFooter>
      </form>
    </div>
  )
}
