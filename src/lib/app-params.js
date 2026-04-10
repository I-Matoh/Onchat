// Detect if running in Node.js (SSR) vs browser
const isNode = typeof window === 'undefined';
// Fallback localStorage mock for SSR environments
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

// Convert camelCase to snake_case for storage keys
const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * getAppParamValue - Retrieve a parameter from URL, localStorage, or default
 * 
 * Priority: URL param → defaultValue → localStorage → null
 * Optionally removes param from URL after reading (for sensitive tokens)
 */
const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	// Storage key format: "app_paramname"
	const storageKey = `app_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	// Clean up URL if requested (e.g., after reading access token)
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	// URL param takes precedence
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	// Fall back to default or stored value
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

/**
 * getAppParams - Main entry point for reading app configuration
 * Handles special case for clearing tokens (logout flow)
 */
const getAppParams = () => {
	// If clear_access_token=true in URL, wipe stored tokens
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('app_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_APP_ID }),
		// access_token read from URL and removed (security - don't leave token in history)
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
	}
}

// Export as singleton - called once at module load
export const appParams = {
	...getAppParams()
}
