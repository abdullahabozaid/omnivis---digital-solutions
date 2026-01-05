/**
 * Safe localStorage utilities with error handling
 */

/**
 * Safely parse JSON from localStorage with fallback
 */
export function safeParseStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely save to localStorage with error handling
 */
export function safeSaveStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to save localStorage key "${key}":`, error);
    // Could be quota exceeded or other storage error
    return false;
  }
}

/**
 * Generate a unique ID using crypto API (collision-resistant)
 */
export function generateId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for localStorage saves
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
