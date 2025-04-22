"use client"

import { useState } from "react"
import { Search, Truck, ArrowRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft } from "lucide-react"

// Importar dados de exemplo para uso offline
import { VEHICLES as DEFAULT_VEHICLES } from "@/data/mock-vehicles"

interface VehicleSelectionProps {
  onSelectVehicle: (vehicle: any) => void
  onBack: () => void
  checklistType: string
  vehicles?: any[] // Veículos para uso offline
}

export function VehicleSelection({
  onSelectVehicle,
  onBack,
  checklistType,
  vehicles = DEFAULT_VEHICLES,
}: VehicleSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Selecionar Veículo</h1>
          <p className="text-sm text-muted-foreground">Para checklist de {checklistType}</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar veículo ou placa..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="grid grid-cols-1 gap-4 pb-4">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  vehicle.status === "maintenance" ? "opacity-60" : ""
                }`}
                onClick={() => vehicle.status !== "maintenance" && onSelectVehicle(vehicle)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-50">
                      <Truck className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm font-medium">Placa: {vehicle.licensePlate}</p>
                  <p className="text-sm text-muted-foreground">Tipo: {vehicle.type}</p>
                </CardContent>
                <CardFooter className="flex justify-between pt-0 pb-3">
                  <div className="flex items-center">
                    {vehicle.status === "maintenance" ? (
                      <span className="text-sm text-red-500">Em manutenção</span>
                    ) : (
                      <span className="text-sm text-green-500">Disponível</span>
                    )}
                  </div>
                  {vehicle.status !== "maintenance" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 -mr-2"
                    >
                      Selecionar
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum veículo encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
