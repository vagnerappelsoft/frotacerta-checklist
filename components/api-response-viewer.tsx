"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiService } from "@/lib/api-service"
import { offlineStorage } from "@/lib/offline-storage"

interface ApiResponseViewerProps {
  onBack: () => void
}

export function ApiResponseViewer({ onBack }: ApiResponseViewerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [apiData, setApiData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("vehicles")
  const [dataCount, setDataCount] = useState<{
    vehicles: number
    models: number
    checklists: number
    stored: {
      vehicles: number
      templates: number
      checklists: number
    }
  }>({
    vehicles: 0,
    models: 0,
    checklists: 0,
    stored: {
      vehicles: 0,
      templates: 0,
      checklists: 0,
    },
  })

  // Carregar dados da API
  const loadApiData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Desativar modo mockado explicitamente
      apiService.setMockMode(false)

      // Obter dados da API
      const data = await apiService.getAllAppData()
      setApiData(data)

      // Atualizar contadores
      setDataCount({
        vehicles: data.vehicles?.length || 0,
        models: data.models?.length || 0,
        checklists: data.checklists?.length || 0,
        stored: {
          vehicles: 0,
          templates: 0,
          checklists: 0,
        },
      })

      // Carregar contadores de dados armazenados
      const storedVehicles = await offlineStorage.getAllItems("vehicles")
      const storedTemplates = await offlineStorage.getAllItems("templates")
      const storedChecklists = await offlineStorage.getAllItems("checklists")

      setDataCount((prev) => ({
        ...prev,
        stored: {
          vehicles: storedVehicles.length,
          templates: storedTemplates.length,
          checklists: storedChecklists.length,
        },
      }))
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da API")
      console.error("Erro ao carregar dados da API:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadApiData()
  }, [])

  // Renderizar um item do veículo
  const renderVehicleItem = (vehicle: any) => {
    return (
      <div key={vehicle.id} className="p-4 border rounded-md mb-2">
        <div className="flex justify-between mb-2">
          <span className="font-medium">{vehicle.name || "Sem nome"}</span>
          <span className="text-sm px-2 py-1 bg-blue-100 rounded-full">{vehicle.plate || "Sem placa"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>ID: {vehicle.id}</div>
          <div>Ano: {vehicle.year || "N/A"}</div>
          <div>Cor: {vehicle.color || "N/A"}</div>
          <div>Frota #: {vehicle.fleetNumber || "N/A"}</div>
        </div>
      </div>
    )
  }

  // Renderizar um item do modelo
  const renderModelItem = (model: any) => {
    return (
      <div key={model.id} className="p-4 border rounded-md mb-2">
        <div className="flex justify-between mb-2">
          <span className="font-medium">{model.name || "Sem nome"}</span>
          <span className={`text-sm px-2 py-1 rounded-full ${model.group ? "bg-green-100" : "bg-gray-100"}`}>
            {model.group?.name || "Sem grupo"}
          </span>
        </div>
        <div className="text-sm mb-2">
          <div>ID: {model.id}</div>
          <div>Descrição: {model.description || "Sem descrição"}</div>
          <div>Itens: {model.items?.length || 0}</div>
        </div>
        {model.items && model.items.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium">Itens do checklist:</div>
            <div className="max-h-40 overflow-y-auto mt-2">
              {model.items.map((item: any) => (
                <div key={item.id} className="text-xs p-2 border-b">
                  {item.name || "Item sem nome"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Renderizar um item do checklist
  const renderChecklistItem = (checklist: any) => {
    // Obter dados do veículo do primeiro item de vehicleData
    const vehicle =
      checklist.vehicleData && checklist.vehicleData.length > 0
        ? checklist.vehicleData[0].vehicle
        : { name: "Veículo desconhecido", plate: "N/A" }

    return (
      <div key={checklist.id} className="p-4 border rounded-md mb-2">
        <div className="flex justify-between mb-2">
          <span className="font-medium">{checklist.name || "Sem nome"}</span>
          <span className="text-sm px-2 py-1 bg-orange-100 rounded-full">
            {checklist.model?.name || "Modelo desconhecido"}
          </span>
        </div>
        <div className="text-sm mb-2">
          <div>ID: {checklist.id}</div>
          <div>
            Veículo: {vehicle.name} ({vehicle.plate})
          </div>
          <div>Data: {new Date(checklist.startDate).toLocaleDateString() || "N/A"}</div>
          <div>Itens: {checklist.checklistItems ? checklist.checklistItems.split(",").length : 0}</div>
        </div>
        {checklist.flowData && checklist.flowData.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium">Respostas:</div>
            <div className="max-h-40 overflow-y-auto mt-2">
              {checklist.flowData[0].data?.map((item: any) => (
                <div key={item.itemId} className="text-xs p-2 border-b">
                  {item.itemName}: <span className="font-medium">{item.answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Dados da API</h1>
          <p className="text-sm text-muted-foreground">Visualização dos dados recebidos da API</p>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Resumo</span>
            <Button variant="outline" size="sm" onClick={loadApiData} disabled={isLoading} className="text-xs">
              {isLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-blue-50 rounded-md">
              <div className="text-sm font-medium">Veículos</div>
              <div className="text-xl font-bold mt-1">{dataCount.vehicles}</div>
              <div className="text-xs text-muted-foreground mt-1">Armazenados: {dataCount.stored.vehicles}</div>
            </div>
            <div className="p-2 bg-green-50 rounded-md">
              <div className="text-sm font-medium">Modelos</div>
              <div className="text-xl font-bold mt-1">{dataCount.models}</div>
              <div className="text-xs text-muted-foreground mt-1">Armazenados: {dataCount.stored.templates}</div>
            </div>
            <div className="p-2 bg-orange-50 rounded-md">
              <div className="text-sm font-medium">Checklists</div>
              <div className="text-xl font-bold mt-1">{dataCount.checklists}</div>
              <div className="text-xs text-muted-foreground mt-1">Armazenados: {dataCount.stored.checklists}</div>
            </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
        </CardContent>
      </Card>

      <Tabs defaultValue="vehicles" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando veículos...</p>
            </div>
          ) : apiData?.vehicles && apiData.vehicles.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">{apiData.vehicles.map(renderVehicleItem)}</div>
          ) : (
            <div className="text-center py-8">
              <p>Nenhum veículo encontrado</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando modelos...</p>
            </div>
          ) : apiData?.models && apiData.models.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">{apiData.models.map(renderModelItem)}</div>
          ) : (
            <div className="text-center py-8">
              <p>Nenhum modelo encontrado</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checklists" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando checklists...</p>
            </div>
          ) : apiData?.checklists && apiData.checklists.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">{apiData.checklists.map(renderChecklistItem)}</div>
          ) : (
            <div className="text-center py-8">
              <p>Nenhum checklist encontrado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <Button variant="outline" onClick={onBack} className="w-full">
          Voltar
        </Button>
      </div>
    </div>
  )
}
