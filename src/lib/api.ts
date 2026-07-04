export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
export const API_BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api`;

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (BACKEND_URL.startsWith('https://')) return `wss://${BACKEND_URL.slice(8)}/ws`;
  if (BACKEND_URL.startsWith('http://')) return `ws://${BACKEND_URL.slice(7)}/ws`;
  return `ws://localhost:8000/ws`;
};

export const WS_URL = getWsUrl();
