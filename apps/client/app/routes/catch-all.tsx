import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center max-w-sm w-full">
        <Link to="/" className="mb-16">
          <img src="/logo.png" alt="Cofr" className="logo-auto h-7" />
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-content-tertiary mb-4">
          404
        </p>

        <div className="w-8 h-px bg-edge-strong mb-6" />

        <h1 className="text-[17px] font-semibold text-content-primary mb-2 tracking-tight">
          Page not found
        </h1>
        <p className="text-[13px] leading-relaxed text-content-tertiary text-center mb-10">
          This page doesn't exist or has been moved.
        </p>

        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className="h-9 px-4 inline-flex items-center text-[13px] font-medium rounded-lg bg-emerald text-white hover:bg-emerald-hover transition-colors"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-[13px] font-medium text-content-tertiary hover:text-content-primary transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
