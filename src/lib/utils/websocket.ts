
export const getWebSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:3000/api/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // host includes port
  return `${protocol}//${host}/api/ws`;
};
