import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitiza um objeto para armazenamento, removendo propriedades não serializáveis
 */
export function sanitizeForStorage<T>(obj: T): T {
  // Se for null ou undefined, retorne como está
  if (obj === null || obj === undefined) return obj

  // Se for um tipo primitivo, retorne como está
  if (typeof obj !== "object" || obj instanceof Date || obj instanceof Blob || obj instanceof File) {
    return obj
  }

  // Se for um array, sanitize cada item
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForStorage(item)) as unknown as T
  }

  // Se for um objeto, sanitize cada propriedade
  const result: any = {}
  for (const [key, value] of Object.entries(obj as object)) {
    // Pular propriedades que começam com _ ou $ (geralmente usadas por React)
    // Também pular propriedades que são funções ou símbolos
    if (!key.startsWith("_") && !key.startsWith("$") && typeof value !== "function" && typeof value !== "symbol") {
      result[key] = sanitizeForStorage(value)
    }
  }

  return result as T
}
