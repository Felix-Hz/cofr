const TOKEN_KEY = "uitzicht_token";

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && !isTokenExpired();
}

// Decode JWT payload (without verification - backend verifies)
export function getTokenPayload(): {
  user_id: string;
  username: string;
  exp: number;
} | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const payload = getTokenPayload();
  if (!payload || !payload.exp) return true;

  // Check if token expires in less than 5 minutes
  return Date.now() >= (payload.exp - 300) * 1000;
}
