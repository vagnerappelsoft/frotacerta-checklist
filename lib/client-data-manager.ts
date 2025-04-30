import { offlineStorage } from "./offline-storage"
import { STORAGE_KEYS } from "./constants"

/**
 * Manages client data isolation and transitions between different client IDs
 */
export class ClientDataManager {
  /**
   * Checks if the client ID has changed and handles the transition if needed
   * @param newClientId The new client ID being used for login
   * @returns Promise<boolean> True if client ID changed and data was cleared
   */
  static async handleClientIdChange(newClientId: string): Promise<boolean> {
    if (!newClientId || newClientId.trim() === "") {
      console.error("Invalid client ID provided")
      return false
    }

    // Get the previously stored client ID
    const previousClientId = localStorage.getItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID)

    // Store the current client ID for future comparison
    localStorage.setItem(STORAGE_KEYS.CURRENT_CLIENT_ID, newClientId)

    // If this is the first login or same client, no need to clear data
    if (!previousClientId || previousClientId === newClientId) {
      // Still store the current client ID as previous for next comparison
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID, newClientId)
      return false
    }

    console.log(`Client ID changed from ${previousClientId} to ${newClientId}. Clearing previous client data...`)

    try {
      // Clear all data from previous client
      await this.clearAllClientData()

      // Update the previous client ID to the new one
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID, newClientId)

      return true
    } catch (error) {
      console.error("Error clearing previous client data:", error)
      // Still update the previous client ID to prevent repeated clearing attempts
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_CLIENT_ID, newClientId)
      return false
    }
  }

  /**
   * Clears all client-specific data from the application
   */
  static async clearAllClientData(): Promise<void> {
    try {
      console.log("Clearing all client data...")

      // 1. Clear IndexedDB data
      await offlineStorage.clearAllData()

      // 2. Clear localStorage data (except for some app settings)
      this.clearLocalStorage()

      // 3. Clear sessionStorage
      this.clearSessionStorage()

      console.log("All client data cleared successfully")
    } catch (error) {
      console.error("Error during client data clearing:", error)
      throw error
    }
  }

  /**
   * Clears localStorage data while preserving app settings
   */
  private static clearLocalStorage(): void {
    // Save values we want to keep
    const preservedKeys = [
      STORAGE_KEYS.PREVIOUS_CLIENT_ID,
      STORAGE_KEYS.CURRENT_CLIENT_ID,
      "app_version",
      "app_installed",
      "pwa_prompt_shown",
    ]

    const preservedValues: Record<string, string | null> = {}

    // Store values to preserve
    preservedKeys.forEach((key) => {
      preservedValues[key] = localStorage.getItem(key)
    })

    // Clear all localStorage
    localStorage.clear()

    // Restore preserved values
    Object.entries(preservedValues).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value)
      }
    })

    console.log("LocalStorage cleared (preserved app settings)")
  }

  /**
   * Clears all sessionStorage data
   */
  private static clearSessionStorage(): void {
    sessionStorage.clear()
    console.log("SessionStorage cleared")
  }
}
