// Fetches a project's real GitHub README (GitHub-rendered HTML), sanitizes it with
// DOMPurify, rewrites relative URLs, and hands back a DocumentFragment.
// API: window.ReadmeViewer.load(project) -> Promise<{ ok: true, fragment } | { ok: false, reason }>
// reason: 'invalid-repo' | 'no-sanitizer' | 'rate-limit' | 'not-found' | 'offline' | 'error'
// Load order (all `defer`): dompurify -> readme-viewer.js -> macos.js.
(function () {
    'use strict';

    const CACHE_PREFIX = 'readme:';

    // Only https://github.com/<owner>/<repo> (optional .git and trailing slash) is accepted.
    function parseRepo(url) {
        if (typeof url !== 'string') return null;
        const m = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(url.trim());
        if (!m || m[2] === '.' || m[2] === '..') return null;
        return { owner: m[1], repo: m[2] };
    }

    // <pure:rewriteUrl>
    // Rewrites a repo-relative URL. kind 'img' -> raw.githubusercontent.com, 'link' -> github.com/blob.
    // Absolute URLs (any scheme or //host) and #fragments are returned unchanged.
    function rewriteUrl(value, kind, owner, repo) {
        if (typeof value !== 'string') return value;
        const v = value.trim();
        if (!v || v.startsWith('#') || v.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(v)) return value;
        // Resolve against a dummy root so "../" can never climb out of the repo path
        let u;
        try { u = new URL(v.replace(/^\/+/, ''), 'https://repo.invalid/'); } catch { return value; }
        const path = u.pathname.replace(/^\/+/, '') + u.search + u.hash;
        const base = kind === 'img'
            ? `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`
            : `https://github.com/${owner}/${repo}/blob/HEAD/`;
        return base + path;
    }
    // </pure:rewriteUrl>

    function rewriteSrcset(value, owner, repo) {
        return value.split(',').map(part => {
            const bits = part.trim().split(/\s+/);
            if (!bits[0]) return '';
            bits[0] = rewriteUrl(bits[0], 'img', owner, repo);
            return bits.join(' ');
        }).filter(Boolean).join(', ');
    }

    function readCache(key) {
        try { return sessionStorage.getItem(key); } catch { return null; }
    }

    function writeCache(key, html) {
        try { sessionStorage.setItem(key, html); } catch { /* storage blocked or full */ }
    }

    async function fetchReadme(owner, repo) {
        let res;
        try {
            res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
                headers: { Accept: 'application/vnd.github.html+json' }
            });
        } catch {
            return { ok: false, reason: 'offline' };
        }
        if (res.status === 403 || res.status === 429) return { ok: false, reason: 'rate-limit' };
        if (res.status === 404) return { ok: false, reason: 'not-found' };
        if (res.status !== 200) return { ok: false, reason: 'error' };
        try {
            return { ok: true, html: await res.text() };
        } catch {
            return { ok: false, reason: 'offline' };
        }
    }

    function sanitize(html) {
        return window.DOMPurify.sanitize(html, {
            FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['style'],
            RETURN_DOM_FRAGMENT: true
        });
    }

    function postProcess(fragment, owner, repo) {
        // Permalink anchors carry the heading id. Move the id onto the heading, then drop the link.
        fragment.querySelectorAll('a.anchor').forEach(a => {
            const heading = a.parentElement && a.parentElement.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading && a.id && !heading.id) heading.id = a.id;
            a.remove();
        });

        fragment.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src) img.setAttribute('src', rewriteUrl(src, 'img', owner, repo));
            const srcset = img.getAttribute('srcset');
            if (srcset) img.setAttribute('srcset', rewriteSrcset(srcset, owner, repo));
            img.setAttribute('loading', 'lazy');
        });
        fragment.querySelectorAll('source[srcset]').forEach(s => {
            s.setAttribute('srcset', rewriteSrcset(s.getAttribute('srcset'), owner, repo));
        });

        fragment.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href.trim().startsWith('#')) return; // in-page: handled by the window
            a.setAttribute('href', rewriteUrl(href, 'link', owner, repo));
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
    }

    async function load(project) {
        const parsed = parseRepo(project && project.repo);
        if (!parsed) return { ok: false, reason: 'invalid-repo' };
        if (!window.DOMPurify || typeof window.DOMPurify.sanitize !== 'function') {
            return { ok: false, reason: 'no-sanitizer' };
        }

        const { owner, repo } = parsed;
        const key = `${CACHE_PREFIX}${owner}/${repo}`;
        let html = readCache(key);
        if (typeof html !== 'string' || !html) {
            const result = await fetchReadme(owner, repo);
            if (!result.ok) return result;
            html = result.html;
            writeCache(key, html); // raw HTML only; sanitized again on every render
        }

        try {
            const fragment = sanitize(html);
            postProcess(fragment, owner, repo);
            return { ok: true, fragment };
        } catch {
            return { ok: false, reason: 'error' };
        }
    }

    window.ReadmeViewer = { load };
})();
