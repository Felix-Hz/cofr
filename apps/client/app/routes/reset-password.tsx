import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import PasswordInput from "~/components/PasswordInput";
import { PasswordRequirements } from "~/components/PasswordRequirements";
import { resetPassword } from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";
import { isPasswordValid } from "~/lib/password";

export function meta() {
  return [{ title: "cofr — Choose New Password" }];
}

export async function clientLoader() {
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenError = useMemo(() => {
    if (!token) {
      return "Reset link is missing or incomplete.";
    }
    return null;
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetPassword(token, password);
      setSuccess(result.message);
      setTimeout(() => navigate("/login?reset=success"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-shell auth-shell--recovery">
      <div className="auth-shell__ambient" />
      <div className="auth-shell__frame">
        <section className="auth-shell__intro">
          <p className="auth-eyebrow">Protected link</p>
          <h1 className="auth-title">Choose a new password with confidence.</h1>
          <p className="auth-copy">
            Reset links are short-lived and single-state. Once your password changes, older links
            stop working automatically.
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__header">
            <img src="/logo.png" alt="cofr" className="h-12 w-12 logo-auto" />
            <div>
              <p className="auth-panel__eyebrow">New password</p>
              <h2 className="auth-panel__title">Secure your account</h2>
            </div>
          </div>

          {tokenError && (
            <div className="rounded-2xl border border-negative-text/25 bg-negative-bg px-4 py-3 text-sm text-negative-text">
              {tokenError}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-positive-border bg-positive-bg px-4 py-3 text-sm text-positive-text">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-negative-text/25 bg-negative-bg px-4 py-3 text-sm text-negative-text">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-content-secondary mb-1"
              >
                New password
              </label>
              <PasswordInput
                id="new-password"
                required
                disabled={!token}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-edge-strong bg-surface-primary px-4 py-3 text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent transition-colors"
              />
              <PasswordRequirements password={password} />
            </div>

            <button
              type="submit"
              disabled={loading || !token || !isPasswordValid(password)}
              className="w-full rounded-2xl bg-emerald px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-hover disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Set new password"}
            </button>
          </form>

          <div className="auth-panel__footer">
            <Link to="/login" className="auth-link">
              Return to sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
