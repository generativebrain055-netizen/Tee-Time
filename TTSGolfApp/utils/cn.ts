/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for conflict resolution
 * 
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * cn("text-sm text-gray-500", { "text-primary": isActive })
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;
