import * as React from "react"

// Breakpoint matches Tailwind's "md" (768px) - mobile is below this
const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile - Hook to detect if viewport is mobile-sized
 * 
 * Uses window.matchMedia with a change listener for responsive behavior.
 * Returns true if width < 768px, false otherwise. Initial state is undefined
 * to avoid hydration mismatches in SSR frameworks.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    // Create media query: (max-width: 767px)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    // Listen for viewport changes (e.g., rotating a phone, resizing window)
    mql.addEventListener("change", onChange)
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    // Cleanup listener on unmount
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
