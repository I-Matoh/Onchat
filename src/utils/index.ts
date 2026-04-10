/**
 * createPageUrl - Converts a page name to a URL-friendly slug
 * Example: "My New Page" → "/my-new-page"
 */
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
} 