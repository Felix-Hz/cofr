import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Category } from "./schemas";

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
  format: "short" | "long" | "compact" | "mobile" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "mobile") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
  }

  if (format === "long") {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  if (format === "compact") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
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

const FALLBACK_COLOR_LIGHT = "#6b7280";
const FALLBACK_COLOR_DARK = "#9ca3af";

export function getCategoryColor(
  categoryId: string,
  categories: Category[],
  isDark = false,
): string {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat) return isDark ? cat.color_dark : cat.color_light;
  return isDark ? FALLBACK_COLOR_DARK : FALLBACK_COLOR_LIGHT;
}

// Check if a category type is "positive" (non-expense)
export function isPositiveType(type: string): boolean {
  return type === "income";
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
