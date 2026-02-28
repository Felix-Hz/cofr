import { useNavigate } from "react-router";
import { useEffect } from "react";
import { saveToken } from "~/lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL fragment (#token=...)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("token");

    if (token) {
      saveToken(token);
      navigate("/dashboard");
    } else {
      navigate("/login?error=Authentication+failed");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-content-primary mx-auto" />
        <p className="mt-4 text-sm text-content-secondary">Completing authentication...</p>
      </div>
    </div>
  );
}
