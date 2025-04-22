import type React from "react"
import {
  Car,
  Wrench,
  User,
  Route,
  FileText,
  Shield,
  Fuel,
  Package,
  Recycle,
  ClipboardCheck,
  ArrowRight,
  Calendar,
  AlertTriangle,
  PenToolIcon as Tool,
  FileCheck,
  Mic,
} from "lucide-react"

// Mapeamento de códigos de ícones para componentes de ícones
const iconMap: Record<string, React.ElementType> = {
  icon_1: Car,
  icon_2: Wrench,
  icon_3: User,
  icon_4: Route,
  icon_5: FileText,
  icon_6: Shield,
  icon_7: Fuel,
  icon_8: Package,
  icon_9: Recycle,
  icon_10: ClipboardCheck,
  // Adicionar mapeamentos legados para compatibilidade
  ArrowRight: ArrowRight,
  Calendar: Calendar,
  Fuel: Fuel,
  AlertTriangle: AlertTriangle,
  Tool: Tool,
  FileCheck: FileCheck,
  Mic: Mic,
}

/**
 * Obtém um componente de ícone a partir de um código de ícone
 * @param iconCode Código do ícone (ex: "icon_1") ou nome legado (ex: "ArrowRight")
 * @param className Classes CSS para o ícone
 * @param style Estilos inline para o ícone
 * @returns Componente de ícone React
 */
export function getIconFromCode(iconCode: string, className = "h-6 w-6", style = {}): React.ReactNode {
  // Adicionar log para debug
  console.log("Código de ícone recebido:", iconCode)

  // Verificar se o código existe no mapa
  if (iconMap[iconCode]) {
    const IconComponent = iconMap[iconCode]
    console.log("Ícone encontrado:", iconCode)
    return <IconComponent className={className} style={style} />
  }

  // Fallback para ícone padrão se o código não for encontrado
  console.log("Ícone não encontrado, usando fallback para:", iconCode)
  return <Car className={className} style={style} />
}
