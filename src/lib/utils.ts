import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocationName(location?: string) {
  if (!location) return '';
  return location.split(',')[0].trim();
}
