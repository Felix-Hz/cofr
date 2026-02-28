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

// Category HEX color mapping
const CATEGORY_HEX_COLORS: Record<Category, string> = {
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

export function getCategoryColor(category: string): string {
  return (
    CATEGORY_HEX_COLORS[category as Category] ||
    CATEGORY_HEX_COLORS[Category.MISCELLANEOUS]
  );
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
