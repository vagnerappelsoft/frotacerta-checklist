"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function InstallAppScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="container max-w-md mx-auto py-4 px-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Atualização</h1>
        <div className="w-9" />
      </div>

      <div className="space-y-4 mt-8 text-center">
        <p>Este recurso está temporariamente indisponível.</p>
        <Button onClick={onBack} className="mt-4">
          Voltar
        </Button>
      </div>
    </div>
  )
}
