const INVITE_TOKEN_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
export function normalizeInviteToken(raw) {
    if (!raw)
        return '';
    const text = (() => {
        try {
            return decodeURIComponent(String(raw));
        }
        catch {
            return String(raw);
        }
    })().trim();
    const directMatch = text.match(INVITE_TOKEN_RE);
    if (directMatch?.[0])
        return directMatch[0];
    try {
        const maybeUrl = new URL(text);
        const queryCandidate = maybeUrl.searchParams.get('teamInviteToken') ||
            maybeUrl.searchParams.get('token') ||
            maybeUrl.searchParams.get('inviteToken');
        const queryMatch = queryCandidate?.match(INVITE_TOKEN_RE);
        if (queryMatch?.[0])
            return queryMatch[0];
        const pathMatch = maybeUrl.pathname.match(INVITE_TOKEN_RE);
        if (pathMatch?.[0])
            return pathMatch[0];
    }
    catch {
        // Not a URL value.
    }
    return '';
}
