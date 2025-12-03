/**
 * Storage Service - Handles localStorage with error handling
 * Provides a clean abstraction over localStorage operations
 */
export class StorageService {
    private prefix = 'cloudinterview-';

    /**
     * Save data to localStorage
     * @param key - Storage key (will be prefixed automatically)
     * @param data - Data to store (will be JSON stringified)
     */
    save<T>(key: string, data: T): void {
        try {
            const prefixedKey = this.prefix + key;
            localStorage.setItem(prefixedKey, JSON.stringify(data));
        } catch (error) {
            console.warn(`Failed to save ${key} to localStorage:`, error);
        }
    }

    /**
     * Load data from localStorage
     * @param key - Storage key (will be prefixed automatically)
     * @returns Parsed data or null if not found/invalid
     */
    load<T>(key: string): T | null {
        try {
            const prefixedKey = this.prefix + key;
            const saved = localStorage.getItem(prefixedKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn(`Failed to load ${key} from localStorage:`, error);
            return null;
        }
    }

    /**
     * Remove data from localStorage
     * @param key - Storage key (will be prefixed automatically)
     */
    remove(key: string): void {
        try {
            const prefixedKey = this.prefix + key;
            localStorage.removeItem(prefixedKey);
        } catch (error) {
            console.warn(`Failed to remove ${key} from localStorage:`, error);
        }
    }

    /**
     * Clear all app data from localStorage
     * Removes all keys with the app prefix
     */
    clear(): void {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }

    /**
     * Check if a key exists in localStorage
     * @param key - Storage key (will be prefixed automatically)
     */
    has(key: string): boolean {
        try {
            const prefixedKey = this.prefix + key;
            return localStorage.getItem(prefixedKey) !== null;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
export const storageService = new StorageService();
