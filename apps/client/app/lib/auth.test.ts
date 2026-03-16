import {
  getToken,
  getTokenPayload,
  isAuthenticated,
  isTokenExpired,
  removeToken,
  saveToken,
} from "./auth";

function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe("auth", () => {
  it("saveToken stores under cofr_token key", () => {
    saveToken("abc123");
    expect(localStorage.getItem("cofr_token")).toBe("abc123");
  });

  it("getToken returns stored token", () => {
    saveToken("round-trip");
    expect(getToken()).toBe("round-trip");
  });

  it("getToken returns null when empty", () => {
    expect(getToken()).toBeNull();
  });

  it("removeToken clears the token", () => {
    saveToken("to-remove");
    removeToken();
    expect(getToken()).toBeNull();
  });

  it("isAuthenticated true for valid non-expired token", () => {
    const token = fakeJwt({ user_id: "u1", username: "test", exp: Date.now() / 1000 + 3600 });
    saveToken(token);
    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated false when no token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated false for expired token", () => {
    const token = fakeJwt({ user_id: "u1", username: "test", exp: Date.now() / 1000 - 3600 });
    saveToken(token);
    expect(isAuthenticated()).toBe(false);
  });

  it("getTokenPayload decodes JWT payload", () => {
    const token = fakeJwt({ user_id: "u1", username: "alice", exp: 9999999999 });
    saveToken(token);
    const payload = getTokenPayload();
    expect(payload).toEqual({ user_id: "u1", username: "alice", exp: 9999999999 });
  });

  it("getTokenPayload returns null for malformed token", () => {
    saveToken("not-a-jwt");
    expect(getTokenPayload()).toBeNull();
  });

  it("isTokenExpired true within 5-min buffer", () => {
    // exp is 200s from now — within the 300s buffer
    const token = fakeJwt({ user_id: "u1", username: "test", exp: Date.now() / 1000 + 200 });
    saveToken(token);
    expect(isTokenExpired()).toBe(true);
  });
});
