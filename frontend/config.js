
// Backend URL - in production, uses same origin; in development, uses localhost
window.BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;