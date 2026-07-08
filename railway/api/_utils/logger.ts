export const logInfo = (event: string, payload?: Record<string, unknown>) => {
  console.log(JSON.stringify({ level: 'info', event, payload: payload || {}, ts: new Date().toISOString() }));
};

export const logWarn = (event: string, payload?: Record<string, unknown>) => {
  console.warn(JSON.stringify({ level: 'warn', event, payload: payload || {}, ts: new Date().toISOString() }));
};

export const logError = (event: string, payload?: Record<string, unknown>) => {
  console.error(JSON.stringify({ level: 'error', event, payload: payload || {}, ts: new Date().toISOString() }));
};
