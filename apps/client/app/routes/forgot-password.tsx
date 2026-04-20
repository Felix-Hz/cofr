import { useEffect, useState } from "react";
import { Link, redirect } from "react-router";
import { ApiError, forgotPassword } from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";

const LOCKOUT_DURATION_MS = 60 * 60 * 1000;
const LOCKOUT_KEY = "cofr_lockout_forgot";

function readLockout(): number | null {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return null;
    const until = parseInt(raw, 10);
    if (isNaN(until) || until <= Date.now()) {
      localStorage.removeItem(LOCKOUT_KEY);
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function meta() {
  return [{ title: "cofr — Reset Password" }];
}

export async function clientLoader() {
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => readLockout());
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        try {
          localStorage.removeItem(LOCKOUT_KEY);
        } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const isLocked = lockoutUntil !== null && lockoutRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        try {
          localStorage.setItem(LOCKOUT_KEY, String(until));
        } catch {}
        setLockoutUntil(until);
        setLockoutRemaining(3600);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Unable to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-shell auth-shell--recovery">
      <div className="auth-shell__ambient" />
      <div className="auth-shell__frame">
        <section className="auth-shell__intro">
          <p className="auth-eyebrow">Account recovery</p>
          <h1 className="auth-title">Reset access without losing momentum.</h1>
          <p className="auth-copy">
            Enter the email on your local cofr account and we&apos;ll send a secure reset link if
            the account is eligible.
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__header">
            <img src="/logo.png" alt="cofr" className="h-12 w-12 logo-auto" />
            <div>
              <p className="auth-panel__eyebrow">Password reset</p>
              <h2 className="auth-panel__title">Check your inbox next</h2>
            </div>
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
                  <p className="text-sm font-semibold text-amber-300">Reset requests paused</p>
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
                        style={{ width: `${(lockoutRemaining / 3600) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {message && (
                <div className="rounded-lg border border-positive-border bg-positive-bg px-4 py-3 text-sm text-positive-text">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-negative-text/25 bg-negative-bg px-4 py-3 text-sm text-negative-text">
                  {error}
                </div>
              )}
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="auth-input"
                disabled={isLocked}
              />
            </div>

            <button type="submit" disabled={loading || isLocked} className="auth-submit-button">
              {loading ? (
                "Sending reset link..."
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
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          <div className="auth-panel__footer">
            <Link to="/login" className="auth-link">
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
