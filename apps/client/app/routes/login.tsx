import { redirect, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { authenticateWithTelegram } from "~/lib/api";
import { saveToken, isAuthenticated } from "~/lib/auth";
import type { TelegramAuthData } from "~/lib/schemas";

export async function clientLoader() {
  // Redirect if already authenticated
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Define callback for Telegram widget
    // @ts-expect-error - Telegram widget callback
    window.onTelegramAuth = async (user: TelegramAuthData) => {
      setLoading(true);
      setError(null);

      try {
        const { access_token } = await authenticateWithTelegram(user);
        saveToken(access_token);
        navigate("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    };

    // Load Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute(
      "data-telegram-login",
      import.meta.env.VITE_TELEGRAM_BOT_NAME || "",
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    const container = document.getElementById("telegram-login-container");
    container?.appendChild(script);

    return () => {
      script.remove();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-blue-50 to-white">
      <div className="max-w-lg w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Sign in to Bezorgen
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Use your Telegram account to securely log in
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div id="telegram-login-container" className="flex justify-center" />

          {loading && (
            <div className="text-center text-sm text-gray-500">
              Authenticating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
