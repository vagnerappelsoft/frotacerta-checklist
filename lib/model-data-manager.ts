/**
 * Utility for managing model-specific data isolation
 * Ensures that data from different checklist models doesn't cross-contaminate
 */

import { offlineStorage } from "./offline-storage"

export interface ModelData {
  modelId: string
  data: any
  timestamp: number
}

export const modelDataManager = {
  /**
   * Save data specific to a checklist model
   */
  saveModelData: async (modelId: string, key: string, data: any): Promise<void> => {
    try {
      // Create a model-specific key
      const modelKey = `${key}_model_${modelId}`

      // Store the data with model ID for identification
      const modelData: ModelData = {
        modelId,
        data,
        timestamp: Date.now(),
      }

      // Save to localStorage for quick access
      localStorage.setItem(modelKey, JSON.stringify(modelData))

      // Also save to IndexedDB for persistence using the "settings" store
      // which we know exists
      try {
        await offlineStorage.saveItem("settings", {
          id: modelKey,
          type: "model_data", // Add a type field to distinguish from regular settings
          ...modelData,
        })
      } catch (error) {
        console.warn("Failed to save model data to IndexedDB, using localStorage only:", error)
      }

      console.log(`Data saved for model ${modelId} with key ${key}`)
    } catch (error) {
      console.error(`Error saving data for model ${modelId}:`, error)
    }
  },

  /**
   * Get data specific to a checklist model
   */
  getModelData: async <T = any>(modelId: string, key: string): Promise<T | null> => {
    try {
      // Create a model-specific key
      const modelKey = `${key}_model_${modelId}`

      // Try localStorage first for performance
      const localData = localStorage.getItem(modelKey)
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as ModelData
          // Verify this is the correct model's data
          if (parsed.modelId === modelId) {
            return parsed.data as T
          }
        } catch (e) {
          console.warn(`Error parsing localStorage data for model ${modelId}:`, e)
        }
      }

      // If not in localStorage, try IndexedDB using the "settings" store
      try {
        const dbData = await offlineStorage.getItem<ModelData & { type: string }>("settings", modelKey)
        if (dbData && dbData.type === "model_data" && dbData.modelId === modelId) {
          return dbData.data as T
        }
      } catch (error) {
        console.warn(`Error retrieving model data from IndexedDB:`, error)
      }

      return null
    } catch (error) {
      console.error(`Error retrieving data for model ${modelId}:`, error)
      return null
    }
  },

  /**
   * Clear all data for a specific model
   */
  clearModelData: async (modelId: string): Promise<void> => {
    try {
      console.log(`Clearing all data for model ${modelId}`)

      // Clear from localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(`_model_${modelId}`)) {
          keysToRemove.push(key)
        }
      }

      // Remove the identified keys
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      // Clear from IndexedDB - use existing stores
      try {
        // Check settings store for model data
        const allSettings = await offlineStorage.getAllItems<{ id: string; type: string; modelId: string }>("settings")
        const settingsToRemove = allSettings
          .filter((item) => item.type === "model_data" && item.modelId === modelId)
          .map((item) => item.id)

        // Remove each item
        for (const id of settingsToRemove) {
          await offlineStorage.removeItem("settings", id)
        }

        // Check checklists store for progress data
        const allChecklists = await offlineStorage.getAllItems<{ id: string; type: string; modelId: string }>(
          "checklists",
        )
        const checklistsToRemove = allChecklists
          .filter((item) => item.type === "progress" && item.modelId === modelId)
          .map((item) => item.id)

        // Remove each item
        for (const id of checklistsToRemove) {
          await offlineStorage.removeItem("checklists", id)
        }

        console.log(
          `Cleared ${keysToRemove.length} localStorage items, ${settingsToRemove.length} settings items, and ${checklistsToRemove.length} checklist progress items for model ${modelId}`,
        )
      } catch (error) {
        console.warn(`Error clearing IndexedDB data for model ${modelId}:`, error)
      }
    } catch (error) {
      console.error(`Error clearing data for model ${modelId}:`, error)
    }
  },

  /**
   * Check if there's any data for a specific model
   */
  hasModelData: async (modelId: string): Promise<boolean> => {
    try {
      // Check localStorage first
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(`_model_${modelId}`)) {
          return true
        }
      }

      // Check IndexedDB - use existing stores
      try {
        // Check settings store for model data
        const allSettings = await offlineStorage.getAllItems<{ type: string; modelId: string }>("settings")
        if (allSettings.some((item) => item.type === "model_data" && item.modelId === modelId)) {
          return true
        }

        // Check checklists store for progress data
        const allChecklists = await offlineStorage.getAllItems<{ type: string; modelId: string }>("checklists")
        if (allChecklists.some((item) => item.type === "progress" && item.modelId === modelId)) {
          return true
        }
      } catch (error) {
        console.warn(`Error checking IndexedDB data for model ${modelId}:`, error)
      }

      return false
    } catch (error) {
      console.error(`Error checking data for model ${modelId}:`, error)
      return false
    }
  },
}
