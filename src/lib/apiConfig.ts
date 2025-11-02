// API configuration for connecting to backend
// This utility helps determine the correct API base URL

export function getApiBaseUrl(): string {
  // Since Electron loads from Vercel URL in production, relative URLs work automatically
  // In development, relative URLs work with localhost
  
  // Check if we're using file:// protocol (shouldn't happen with our setup, but safety check)
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // If loading from file://, we need to use the Vercel URL
    // Replace 'your-app-name.vercel.app' with your actual Vercel deployment URL
    const vercelUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pos-retail-two.vercel.app/'; 
    return vercelUrl;
  }
  
  // For http/https protocols (including Vercel deployment and localhost), use relative URLs
  // This works for both localhost:3000 and the deployed Vercel app
  return '';
}

// Helper function to build API URLs
export function apiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash from endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // If baseUrl is empty (relative), return relative URL with leading slash
  // If baseUrl is set (absolute), return absolute URL
  return baseUrl ? `${baseUrl}/${cleanEndpoint}` : `/${cleanEndpoint}`;
}

