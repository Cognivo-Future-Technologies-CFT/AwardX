export const logInfo = (event, payload) => {
    console.log(JSON.stringify({ level: 'info', event, payload: payload || {}, ts: new Date().toISOString() }));
};
export const logWarn = (event, payload) => {
    console.warn(JSON.stringify({ level: 'warn', event, payload: payload || {}, ts: new Date().toISOString() }));
};
export const logError = (event, payload) => {
    console.error(JSON.stringify({ level: 'error', event, payload: payload || {}, ts: new Date().toISOString() }));
};
