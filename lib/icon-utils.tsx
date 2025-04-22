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
  icon_11: FileText,
  icon_12: Shield,
  icon_13: Fuel,
  icon_14: Package,
  icon_15: Recycle,
  icon_16: ClipboardCheck,
  icon_17: ArrowRight,
  icon_18: Calendar,
  icon_19: AlertTriangle,
  icon_20: Tool,
  icon_21: FileCheck,
  icon_22: Mic,
  // Adicione mapeamentos para cores também
  color_1: "#FF6B8A", // Rosa
  color_2: "#8B5A2B", // Marrom
  color_3: "#FF7043", // Laranja
  color_4: "#9C27B0", // Roxo
  color_5: "#FFC107", // Amarelo
  color_6: "#00BCD4", // Ciano
  color_7: "#E91E63", // Rosa escuro
  color_8: "#607D8B", // Azul acinzentado
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
  // Verificar se o código existe no mapa
  if (iconMap[iconCode]) {
    const IconComponent = iconMap[iconCode]
    return <IconComponent className={className} style={style} />
  }

  // Fallback para ícone padrão se o código não for encontrado
  return <Car className={className} style={style} />
}
