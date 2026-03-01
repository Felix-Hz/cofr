import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// Date formatting
export function formatDate(
  date: string | Date,
  format: "short" | "long" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "long") {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export enum Category {
  INCOME = "Income",
  SAVINGS = "Savings",
  UTILITIES = "Utilities",
  SUBSCRIPTIONS = "Subscriptions",
  RENT = "Rent",
  HEALTH_FITNESS = "Health & Fitness",
  TRANSPORT = "Transport",
  GROCERIES = "Groceries",
  GOING_OUT = "Going Out",
  INVESTMENT = "Investment",
  SHOPPING = "Shopping",
  EDUCATION = "Education",
  TRAVEL = "Travel",
  ENTERTAINMENT = "Entertainment",
  MISCELLANEOUS = "Miscellaneous",
}

// Category HEX color mapping (light)
const CATEGORY_COLORS_LIGHT: Record<Category, string> = {
  [Category.INCOME]: "#22c55e", // green-500
  [Category.ENTERTAINMENT]: "#14b8a6", // teal-500
  [Category.SAVINGS]: "#10b981", // emerald-500
  [Category.UTILITIES]: "#eab308", // yellow-500
  [Category.SUBSCRIPTIONS]: "#a855f7", // purple-500
  [Category.RENT]: "#6366f1", // indigo-500
  [Category.HEALTH_FITNESS]: "#ef4444", // red-500
  [Category.TRANSPORT]: "#0284c7", // sky-600
  [Category.GROCERIES]: "#f97316", // orange-500
  [Category.GOING_OUT]: "#ec4899", // pink-500
  [Category.INVESTMENT]: "#a3e635", // lime-400
  [Category.SHOPPING]: "#8b5cf6", // violet-500
  [Category.EDUCATION]: "#06b6d4", // cyan-500
  [Category.TRAVEL]: "#0ea5e9", // sky-500
  [Category.MISCELLANEOUS]: "#6b7280", // gray-500
};

// Category HEX color mapping (dark — shifted to -400 for contrast on dark bg)
const CATEGORY_COLORS_DARK: Record<Category, string> = {
  [Category.INCOME]: "#4ade80", // green-400
  [Category.ENTERTAINMENT]: "#2dd4bf", // teal-400
  [Category.SAVINGS]: "#34d399", // emerald-400
  [Category.UTILITIES]: "#facc15", // yellow-400
  [Category.SUBSCRIPTIONS]: "#c084fc", // purple-400
  [Category.RENT]: "#818cf8", // indigo-400
  [Category.HEALTH_FITNESS]: "#f87171", // red-400
  [Category.TRANSPORT]: "#38bdf8", // sky-400
  [Category.GROCERIES]: "#fb923c", // orange-400
  [Category.GOING_OUT]: "#f472b6", // pink-400
  [Category.INVESTMENT]: "#bef264", // lime-300
  [Category.SHOPPING]: "#a78bfa", // violet-400
  [Category.EDUCATION]: "#22d3ee", // cyan-400
  [Category.TRAVEL]: "#38bdf8", // sky-400
  [Category.MISCELLANEOUS]: "#9ca3af", // gray-400
};

export function getCategoryColor(category: string, isDark = false): string {
  const colors = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  return (
    colors[category as Category] ||
    colors[Category.MISCELLANEOUS]
  );
}

// Text truncation
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// Get initials from name
export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
