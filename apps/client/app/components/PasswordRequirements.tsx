import { PASSWORD_RULES } from "~/lib/password";

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-xs">
            {passed ? (
              <svg
                className="w-3.5 h-3.5 text-positive-text shrink-0"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-content-muted shrink-0"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="8" cy="8" r="3" />
              </svg>
            )}
            <span className={passed ? "text-positive-text" : "text-content-muted"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
