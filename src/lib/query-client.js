import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Instance
 * 
 * Configured with sensible defaults for a typical SPA:
 * - refetchOnWindowFocus: false — prevents unexpected refetches when user returns to tab
 * - retry: 1 — fail quickly on network errors to improve UX
 * 
 * This instance is used by QueryClientProvider in App.jsx to wrap
 * the entire application, enabling useQuery and useMutation hooks.
 */
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});