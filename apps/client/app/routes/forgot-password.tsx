import { useState } from "react";
import { Link, redirect } from "react-router";
import { forgotPassword } from "~/lib/api";
import { isAuthenticated } from "~/lib/auth";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email");
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
              />
            </div>

            <button type="submit" disabled={loading} className="auth-submit-button">
              {loading ? "Sending reset link..." : "Send reset link"}
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
