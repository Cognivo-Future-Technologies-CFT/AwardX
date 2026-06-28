export function serviceJson(status, body, headers) {
    return { status, body, headers };
}
export function applyServiceResult(res, result) {
    if (result.headers && res.setHeader) {
        for (const [key, value] of Object.entries(result.headers)) {
            res.setHeader(key, value);
        }
    }
    return res.status(result.status).json(result.body);
}
