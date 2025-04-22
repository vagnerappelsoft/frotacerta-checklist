import { ArrowRight, Calendar, Fuel, AlertTriangle, PenToolIcon as Tool, FileCheck, Mic } from "lucide-react"

// Helper function to get icon by name
export const getIconByName = (iconName: string, className = "h-6 w-6") => {
  switch (iconName) {
    case "ArrowRight":
      return <ArrowRight className={className} />
    case "Calendar":
      return <Calendar className={className} />
    case "Fuel":
      return <Fuel className={className} />
    case "AlertTriangle":
      return <AlertTriangle className={className} />
    case "Tool":
      return <Tool className={className} />
    case "FileCheck":
      return <FileCheck className={className} />
    case "Mic":
      return <Mic className={className} />
    default:
      return <ArrowRight className={className} />
  }
}

// Atualizar as cores dos templates para usar nomes de cores Tailwind consistentes
export const CHECKLIST_TEMPLATES = [
  {
    id: "1",
    title: "Saída de Viagem",
    description: "Checklist para verificação do veículo antes de iniciar uma viagem",
    iconName: "ArrowRight",
    color: "bg-orange-50",
    estimatedTime: "5-10 min",
    items: [
      { id: "1-1", question: "Documentos do veículo estão em ordem?", type: "boolean" },
      { id: "1-2", question: "Nível de combustível", type: "fuel" },
      { id: "1-3", question: "Pneus em boas condições?", type: "boolean", requiresPhoto: true },
      { id: "1-4", question: "Luzes funcionando corretamente?", type: "boolean" },
      {
        id: "1-5",
        question: "Freios funcionando adequadamente?",
        type: "boolean",
        requiresObservation: true,
        requiresAudio: true,
      },
      { id: "1-6", question: "Observações adicionais", type: "text" },
    ],
  },
  {
    id: "2",
    title: "Completo Viagem",
    description: "Checklist completo para verificação do veículo após concluir uma viagem",
    iconName: "FileCheck",
    color: "bg-blue-50",
    estimatedTime: "10-15 min",
    items: [
      { id: "2-1", question: "Quilometragem final", type: "number" },
      { id: "2-2", question: "Nível de combustível ao retornar", type: "fuel" },
      {
        id: "2-3",
        question: "Condição geral do veículo",
        type: "condition",
        requiresPhoto: true,
        requiresObservation: true,
      },
      { id: "2-4", question: "Houve algum problema durante a viagem?", type: "boolean", requiresAudio: true },
      { id: "2-5", question: "Detalhes de problemas encontrados", type: "text" },
      { id: "2-6", question: "Carga entregue em perfeitas condições?", type: "boolean" },
      { id: "2-7", question: "Observações gerais da viagem", type: "text" },
    ],
  },
  {
    id: "3",
    title: "Abastecimento",
    description: "Registro de abastecimento do veículo",
    iconName: "Fuel",
    color: "bg-green-50",
    estimatedTime: "2-3 min",
    items: [
      { id: "3-1", question: "Quilometragem atual", type: "number" },
      { id: "3-2", question: "Quantidade de combustível (litros)", type: "number" },
      { id: "3-3", question: "Valor total do abastecimento", type: "number" },
      { id: "3-4", question: "Posto de combustível", type: "text" },
      {
        id: "3-5",
        question: "Tipo de combustível",
        type: "select",
        options: ["Diesel S10", "Diesel Comum", "Gasolina", "Etanol", "GNV"],
      },
      { id: "3-6", question: "Comprovante de abastecimento", type: "image", requiresPhoto: true },
      { id: "3-7", question: "Observações", type: "text" },
    ],
  },
  {
    id: "4",
    title: "Ocorrência",
    description: "Registro de ocorrências ou incidentes durante a operação",
    iconName: "AlertTriangle",
    color: "bg-red-50",
    estimatedTime: "5-10 min",
    items: [
      {
        id: "4-1",
        question: "Tipo de ocorrência",
        type: "select",
        options: ["Acidente", "Pane mecânica", "Roubo/Furto", "Multa", "Outro"],
      },
      { id: "4-2", question: "Data e hora da ocorrência", type: "datetime" },
      { id: "4-3", question: "Local da ocorrência", type: "text" },
      { id: "4-4", question: "Descrição detalhada", type: "text", requiresObservation: true, requiresAudio: true },
      { id: "4-5", question: "Houve vítimas?", type: "boolean" },
      {
        id: "4-6",
        question: "Órgãos acionados",
        type: "multiselect",
        options: ["Polícia", "Bombeiros", "Ambulância", "Seguradora", "Assistência"],
      },
      { id: "4-7", question: "Fotos da ocorrência", type: "image", requiresPhoto: true },
    ],
  },
  {
    id: "5",
    title: "Manutenção",
    description: "Solicitação ou registro de manutenção do veículo",
    iconName: "Tool",
    color: "bg-purple-50",
    estimatedTime: "5-8 min",
    items: [
      {
        id: "5-1",
        question: "Tipo de manutenção",
        type: "select",
        options: ["Preventiva", "Corretiva", "Revisão programada"],
      },
      { id: "5-2", question: "Quilometragem atual", type: "number" },
      { id: "5-3", question: "Descrição do problema", type: "text", requiresObservation: true, requiresAudio: true },
      { id: "5-4", question: "Condição dos componentes", type: "condition" },
      { id: "5-5", question: "Veículo está operacional?", type: "boolean" },
      {
        id: "5-6",
        question: "Serviços necessários",
        type: "multiselect",
        options: ["Troca de óleo", "Freios", "Suspensão", "Motor", "Elétrica", "Pneus", "Outro"],
      },
      { id: "5-7", question: "Fotos do problema", type: "image", requiresPhoto: true },
    ],
  },
  {
    id: "6",
    title: "Inspeção Diária",
    description: "Checklist diário rápido para verificação básica do veículo",
    iconName: "Calendar",
    color: "bg-amber-50",
    estimatedTime: "3-5 min",
    items: [
      { id: "6-1", question: "Nível de óleo está adequado?", type: "boolean" },
      { id: "6-2", question: "Nível de água do radiador está adequado?", type: "boolean" },
      { id: "6-3", question: "Pressão dos pneus está correta?", type: "boolean", requiresPhoto: true },
      { id: "6-4", question: "Luzes funcionando corretamente?", type: "boolean" },
      { id: "6-5", question: "Freios funcionando adequadamente?", type: "boolean", requiresObservation: true },
      { id: "6-6", question: "Ruídos anormais no veículo?", type: "boolean", requiresAudio: true },
      { id: "6-7", question: "Satisfação geral com o veículo", type: "satisfaction" },
    ],
  },
  {
    id: "7",
    title: "Inspeção de Ruídos",
    description: "Checklist para verificação de ruídos e sons do veículo",
    iconName: "Mic",
    color: "bg-indigo-50",
    estimatedTime: "5-7 min",
    items: [
      { id: "7-1", question: "Som do motor em marcha lenta", type: "condition", requiresAudio: true },
      { id: "7-2", question: "Som do motor em aceleração", type: "condition", requiresAudio: true },
      { id: "7-3", question: "Ruídos na suspensão", type: "boolean", requiresAudio: true },
      { id: "7-4", question: "Ruídos no sistema de freios", type: "boolean", requiresAudio: true },
      { id: "7-5", question: "Ruídos nas portas e janelas", type: "boolean", requiresAudio: true },
      { id: "7-6", question: "Funcionamento do sistema de áudio", type: "condition" },
      { id: "7-7", question: "Observações adicionais sobre sons e ruídos", type: "text" },
    ],
  },
]
