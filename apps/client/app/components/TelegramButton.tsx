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
    "rounded-xl shadow-lg shadow-blue-500/50",
    "bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600",
    "[background-size:200%_200%] [background-position:0%_0%]",
    "hover:[background-position:100%_100%] hover:shadow-xl hover:shadow-blue-500/60 hover:scale-[1.02] hover:brightness-110",
    "active:scale-[0.98] active:brightness-95",
    "transition-all duration-300 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
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
