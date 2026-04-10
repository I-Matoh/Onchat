import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn - Tailwind class name combiner with conflict resolution
 * 
 * clsx: conditionally joins class names (handles falsy values, arrays, objects)
 * twMerge: merges conflicting Tailwind classes (last one wins)
 * 
 * Example: cn('px-2 py-1', isActive && 'bg-blue-500', 'px-3') 
 *          → 'py-1 bg-blue-500 px-3' (px-2 replaced by px-3)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

// Check if page is running inside an iframe
export const isIframe = window.self !== window.top;
