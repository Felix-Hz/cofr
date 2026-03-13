import { useState } from "react";
import { redirect, useNavigate, useSearchParams } from "react-router";
import PasswordInput from "~/components/PasswordInput";
import { PasswordRequirements } from "~/components/PasswordRequirements";
import { loginWithEmail, registerWithEmail } from "~/lib/api";
import { isAuthenticated, saveToken } from "~/lib/auth";
import { isPasswordValid } from "~/lib/password";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5784";

export async function clientLoader() {
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result =
        mode === "signup"
          ? await registerWithEmail(email, password, name || undefined)
          : await loginWithEmail(email, password);

      saveToken(result.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-page">
      <title>Cofr | {mode === "signin" ? "Login" : "Sign Up"}</title>
      <div className="max-w-lg w-full space-y-8 p-8">
        <div className="text-center">
          <img src="/logo.png" alt="cofr" className="h-16 w-16 mx-auto mb-4 logo-auto" />
          <h2 className="text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-content-tertiary">
            {mode === "signin" ? "Sign in to continue to cofr" : "Get started with cofr"}
          </p>
        </div>

        {error && (
          <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Google OAuth */}
        <div className="mt-8 space-y-4">
          <a
            href={`${API_BASE_URL}/auth/oauth/google/login`}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-edge-strong rounded-lg shadow-sm bg-surface-primary text-content-secondary hover:bg-surface-hover transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Continue with Google</span>
          </a>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-edge-default" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-surface-primary text-content-tertiary rounded">or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-2.5 border border-edge-strong rounded-lg bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-content-secondary mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-edge-strong rounded-lg bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-content-secondary mb-1"
            >
              Password
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              className="w-full px-4 py-2.5 border border-edge-strong rounded-lg bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
            />
            {mode === "signup" && <PasswordRequirements password={password} />}
          </div>

          <button
            type="submit"
            disabled={loading || (mode === "signup" && !isPasswordValid(password))}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-emerald hover:bg-emerald-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {mode === "signin" ? "Signing in..." : "Creating account..."}
              </span>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <p className="text-center text-sm text-content-tertiary">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-medium text-emerald hover:text-emerald-hover transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="font-medium text-emerald hover:text-emerald-hover transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
