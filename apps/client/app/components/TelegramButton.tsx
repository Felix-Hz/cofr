import { Link } from "react-router";
import { cn } from "~/lib/utils";

interface TelegramButtonProps {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}

export function TelegramButton({
  to,
  onClick,
  children,
  className,
  type = "button",
}: TelegramButtonProps) {
  const baseStyles = cn(
    "relative inline-flex items-center justify-center px-8 py-4 overflow-hidden",
    "text-base font-bold text-white [color:white] [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]",
    "rounded-xl shadow-lg shadow-emerald/40",
    "bg-emerald",
    "hover:bg-emerald-hover hover:shadow-xl hover:shadow-emerald/50 hover:scale-[1.02]",
    "active:scale-[0.98] active:brightness-95",
    "transition-all duration-300 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={baseStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={baseStyles}>
      {children}
    </button>
  );
}
