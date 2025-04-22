"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiService } from "@/lib/api-service"
import { Loader2, Car, ClipboardList } from "lucide-react"

export function ApiDebug() {
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const [templates, setTemplates] = useState<any[] | null>(null)
  const [vehicles, setVehicles] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    setError(null)
    setIsLoadingTemplates(true)

    try {
      const data = await apiService.getChecklistTemplates()
      setTemplates(data)
    } catch (err: any) {
      setError(`Erro ao buscar modelos: ${err.message}`)
      console.error("Erro ao buscar modelos:", err)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const fetchVehicles = async () => {
    setError(null)
    setIsLoadingVehicles(true)

    try {
      const data = await apiService.getVehicles()
      setVehicles(data)
    } catch (err: any) {
      setError(`Erro ao buscar veículos: ${err.message}`)
      console.error("Erro ao buscar veículos:", err)
    } finally {
      setIsLoadingVehicles(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Depuração da API</CardTitle>
        <CardDescription>Teste as chamadas à API e visualize os dados retornados</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Modelos de Checklist</TabsTrigger>
            <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Button onClick={fetchTemplates} disabled={isLoadingTemplates} className="w-full mt-4">
              {isLoadingTemplates ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Buscar Modelos de Checklist
                </>
              )}
            </Button>

            {templates && (
              <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Modelos encontrados: {templates.length}</h3>
                <div className="max-h-60 overflow-auto">
                  <pre className="text-xs p-2 bg-slate-100 rounded">{JSON.stringify(templates, null, 2)}</pre>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-4">
            <Button onClick={fetchVehicles} disabled={isLoadingVehicles} className="w-full mt-4">
              {isLoadingVehicles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Buscar Veículos
                </>
              )}
            </Button>

            {vehicles && (
              <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Veículos encontrados: {vehicles.length}</h3>
                <div className="max-h-60 overflow-auto">
                  <pre className="text-xs p-2 bg-slate-100 rounded">{JSON.stringify(vehicles, null, 2)}</pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
      </CardContent>
    </Card>
  )
}
