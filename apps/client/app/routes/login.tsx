import { useEffect, useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import PasswordInput from "~/components/PasswordInput";
import { PasswordRequirements } from "~/components/PasswordRequirements";
import { ApiError, loginWithEmail, registerWithEmail } from "~/lib/api";
import { isAuthenticated, saveToken } from "~/lib/auth";
import { isPasswordValid } from "~/lib/password";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5784";
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_S = 15 * 60;

export function meta() {
  return [{ title: "cofr — Login" }];
}

export async function clientLoader() {
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

function lockoutKey(mode: "signin" | "signup") {
  return `cofr_lockout_${mode}`;
}

function readLockout(mode: "signin" | "signup"): number | null {
  try {
    const raw = localStorage.getItem(lockoutKey(mode));
    if (!raw) return null;
    const until = parseInt(raw, 10);
    if (isNaN(until) || until <= Date.now()) {
      localStorage.removeItem(lockoutKey(mode));
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

function writeLockout(mode: "signin" | "signup", until: number) {
  try {
    localStorage.setItem(lockoutKey(mode), String(until));
  } catch {}
}

function clearLockout(mode: "signin" | "signup") {
  try {
    localStorage.removeItem(lockoutKey(mode));
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorParam = searchParams.get("error");
  const verifiedParam = searchParams.get("verified");
  const resetParam = searchParams.get("reset");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);
  const [notice, setNotice] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => readLockout("signin"));
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    document.title = `cofr — ${mode === "signin" ? "Login" : "Sign up"}`;
  }, [mode]);

  useEffect(() => {
    if (verifiedParam === "true") {
      setNotice("Email verified. You can sign in now.");
      return;
    }
    if (verifiedParam === "expired") {
      setError("Your verification link expired. Sign in and resend it from settings.");
      return;
    }
    if (verifiedParam === "invalid") {
      setError("That verification link is invalid.");
      return;
    }
    if (resetParam === "success") {
      setNotice("Password updated. Sign in with your new password.");
    }
  }, [verifiedParam, resetParam]);

  // Re-check localStorage lockout when mode changes
  useEffect(() => {
    const until = readLockout(mode);
    setLockoutUntil(until);
    if (until) {
      setLockoutRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    } else {
      setLockoutRemaining(0);
    }
  }, [mode]);

  // Countdown ticker
  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        clearLockout(mode);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil, mode]);

  const isLocked = lockoutUntil !== null && lockoutRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
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
      if (err instanceof ApiError && err.status === 429) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        writeLockout(mode, until);
        setLockoutUntil(until);
        setLockoutRemaining(LOCKOUT_DURATION_S);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setNotice(null);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="min-h-screen auth-shell auth-shell--recovery">
      <div className="auth-shell__ambient" />
      <div className="auth-shell__frame">
        <section className="auth-shell__intro">
          <p className="auth-eyebrow">{mode === "signin" ? "Welcome back" : "New account"}</p>
          <h1 className="auth-title">
            {mode === "signin"
              ? "Step back into your money in one move."
              : "Start cofr with a cleaner financial baseline."}
          </h1>
          <p className="auth-copy">
            {mode === "signin"
              ? "Use email or Google to reopen your dashboard, review your latest activity, and keep the same focused workflow."
              : "Create an account with email or continue with Google. Email verification can be completed after sign-up to enable account recovery."}
          </p>
        </section>

        <section className="auth-panel auth-panel--square">
          <div className="auth-panel__header">
            <img src="/logo.png" alt="cofr" className="h-12 w-12 logo-auto" />
            <div>
              <p className="auth-panel__eyebrow">{mode === "signin" ? "Sign in" : "Sign up"}</p>
              <h2 className="auth-panel__title">
                {mode === "signin" ? "Access your workspace" : "Create your account"}
              </h2>
            </div>
          </div>

          <div className="auth-mode-toggle">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`auth-mode-toggle__button ${mode === "signin" ? "is-active" : ""}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`auth-mode-toggle__button ${mode === "signup" ? "is-active" : ""}`}
            >
              Create account
            </button>
          </div>

          {isLocked ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-amber-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-300">
                    {mode === "signin" ? "Sign-in" : "Registration"} temporarily locked
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-400/80">{error}</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-500/70">Retry available in</span>
                      <span className="font-mono text-sm font-bold tabular-nums text-amber-300">
                        {formatTime(lockoutRemaining)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-amber-900/40">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear"
                        style={{ width: `${(lockoutRemaining / LOCKOUT_DURATION_S) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg border border-negative-text/25 bg-negative-bg px-4 py-3 text-sm text-negative-text">
                  <p>{error}</p>
                </div>
              )}
              {notice && (
                <div className="rounded-lg border border-positive-border bg-positive-bg px-4 py-3 text-sm text-positive-text">
                  <p>{notice}</p>
                </div>
              )}
            </>
          )}

          <a href={`${API_BASE_URL}/auth/oauth/google/login`} className="auth-provider-button">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </a>

          <div className="auth-divider">
            <span>or use email</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="auth-label">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="auth-input"
                  disabled={isLocked}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="auth-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-input"
                disabled={isLocked}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="password" className="auth-label mb-0">
                  Password
                </label>
                {mode === "signin" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-emerald transition-colors hover:text-emerald-hover"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                className="auth-input"
                disabled={isLocked}
              />
              {mode === "signup" && <PasswordRequirements password={password} />}
            </div>

            <button
              type="submit"
              disabled={loading || isLocked || (mode === "signup" && !isPasswordValid(password))}
              className="auth-submit-button"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </span>
              ) : isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Locked — {formatTime(lockoutRemaining)}
                </span>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="auth-panel__footer">
            <p className="text-sm text-content-tertiary">
              {mode === "signin" ? "Need a new account?" : "Already set up?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-emerald transition-colors hover:text-emerald-hover"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
