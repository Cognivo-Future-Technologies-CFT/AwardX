/** Public production origin used in outbound emails when local/dev URLs would be useless. */
export const PUBLIC_SITE_URL = 'https://www.awardx.one';

function normalizeLocalDevProtocol(url) {
    try {
        const parsed = new URL(url);
        const isLocalDev = parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname === '[::1]';
        if (isLocalDev && parsed.protocol === 'https:') {
            parsed.protocol = 'http:';
            return parsed.origin;
        }
        return parsed.origin;
    }
    catch {
        return url.replace(/\/$/, '').replace(/^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i, 'http://$1');
    }
}

export function isLocalDevHost(url) {
    try {
        const host = new URL(url).hostname;
        return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    }
    catch {
        return /localhost|127\.0\.0\.1|\[::1\]/i.test(url);
    }
}

export function resolveServerSiteUrl(origin) {
    const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
    if (configured) {
        return normalizeLocalDevProtocol(configured);
    }
    if (origin && typeof origin === 'string') {
        return normalizeLocalDevProtocol(origin);
    }
    return 'http://localhost:3000';
}

/** Site origin for email CTAs — skips localhost env values and request origins. */
export function resolveEmailSiteUrl() {
    for (const raw of [process.env.SITE_URL, process.env.VITE_SITE_URL]) {
        const configured = (raw || '').trim().replace(/\/$/, '');
        if (configured && !isLocalDevHost(configured)) {
            return configured;
        }
    }
    return PUBLIC_SITE_URL;
}

/** Prefer a caller-provided URL unless it points at local/dev; rewrite path onto the public site. */
export function resolveEmailActionUrl(passedUrl, fallbackPath = '') {
    const siteUrl = resolveEmailSiteUrl();
    if (passedUrl) {
        try {
            const parsed = new URL(passedUrl);
            if (!isLocalDevHost(passedUrl)) {
                return passedUrl;
            }
            return `${siteUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        catch {
            // fall through to site + path
        }
    }
    const path = fallbackPath.startsWith('/') || !fallbackPath ? fallbackPath : `/${fallbackPath}`;
    return `${siteUrl}${path}`;
}

export function resolveServerPasswordResetUrl(origin) {
    return `${resolveServerSiteUrl(origin)}/auth/callback`;
}
