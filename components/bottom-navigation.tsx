"use client"
import { ClipboardCheck, Settings, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => onTabChange("my-checklists")}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full",
            activeTab === "my-checklists" ? "text-blue-500" : "text-muted-foreground",
          )}
        >
          <ListChecks className="h-5 w-5 mb-1" />
          <span className="text-xs">Meus Checklists</span>
        </button>

        <button
          onClick={() => onTabChange("apply-checklist")}
          className="relative flex flex-col items-center justify-center w-full h-full"
        >
          <div className="absolute -top-6 bg-blue-500 text-white rounded-full p-3">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <span
            className={cn(
              "text-xs mt-6",
              activeTab === "apply-checklist" ? "text-blue-500 font-medium" : "text-muted-foreground",
            )}
          >
            Aplicar Checklist
          </span>
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full",
            activeTab === "settings" ? "text-blue-500" : "text-muted-foreground",
          )}
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-xs">Configurações</span>
        </button>
      </div>
    </div>
  )
}
