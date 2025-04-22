"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LocationMap } from "@/components/location-map"

interface LocationMapDialogProps {
  isOpen: boolean
  onClose: () => void
  latitude: number | null
  longitude: number | null
  address: string | null
}

export function LocationMapDialog({ isOpen, onClose, latitude, longitude, address }: LocationMapDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Localização do Checklist</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 -mt-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-0">
          <LocationMap latitude={latitude} longitude={longitude} address={address} interactive={true} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
