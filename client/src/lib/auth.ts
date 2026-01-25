/**
 * Simple authentication utilities using localStorage
 * Token format: base64(userId:timestamp)
 */

const AUTH_TOKEN_KEY = "admin_auth_token";

/**
 * Generate auth token from user ID
 */
export function generateAuthToken(userId: string): string {
  const timestamp = Date.now();
  const tokenData = `${userId}:${timestamp}`;
  return btoa(tokenData);
}

/**
 * Parse auth token and extract user ID
 */
export function parseAuthToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = atob(token);
    const [userId, timestampStr] = decoded.split(":");
    const timestamp = parseInt(timestampStr, 10);
    
    if (!userId || isNaN(timestamp)) {
      return null;
    }
    
    return { userId, timestamp };
  } catch {
    return null;
  }
}

/**
 * Check if token is valid (not expired)
 * Token expires after 7 days
 */
export function isTokenValid(token: string): boolean {
  const parsed = parseAuthToken(token);
  if (!parsed) return false;
  
  const tokenAge = Date.now() - parsed.timestamp;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  return tokenAge < sevenDays;
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  
  // Check if token is still valid
  if (!isTokenValid(token)) {
    removeAuthToken();
    return null;
  }
  
  return token;
}

/**
 * Save auth token to localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Remove auth token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null && isTokenValid(token);
}
