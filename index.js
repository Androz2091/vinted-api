const UserAgent = require('user-agents');
const cookie = require('cookie');
const { HttpsProxyAgent } = require('https-proxy-agent');

const cookies = new Map();

/**
 * Fetches a new public cookie from Vinted
 * @param {string} domain - The Vinted domain (e.g., 'fr', 'be')
 * @returns {Promise<string>} - Resolves with the session cookie
 */
const fetchCookie = async (domain = 'fr') => {
    try {
        const agent = process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY): undefined;
        if (agent) {
            console.log(`[*] Using proxy ${process.env.VINTED_API_HTTPS_PROXY}`);
        }

        const response = await fetch(`https://www.vinted.${domain}`, {
            headers: {
                'user-agent': new UserAgent().toString(),
            },
            agent,
        });

        const sessionCookie = response.headers.get('set-cookie');
        if (!sessionCookie) {
            throw new Error('No cookie received');
        }

        cookies.set(domain, sessionCookie);
        return sessionCookie;
    } catch (error) {
        console.error(`[!] Failed to fetch cookie for ${domain}: ${error.message}`);
        throw error;
    }
};

/**
 * Parses a Vinted URL to extract query parameters
 * @param {string} url - The Vinted search URL
 * @param {boolean} disableOrder - Whether to disable default sorting
 * @param {boolean} allowSwap - Whether to include swap items
 * @param {Object} customParams - Additional query parameters
 * @returns {Object} - Parsed URL details
 */
const parseVintedURL = (url, disableOrder = false, allowSwap = false, customParams = {}) => {
    try {
        const decodedURL = decodeURI(url);
        const matchedParams = decodedURL.match(/^https:\/\/www\.vinted\.([a-z]+)/);
        if (!matchedParams) {
            return { validURL: false };
        }

        const domain = matchedParams[1];
        const urlObj = new URL(decodedURL);
        const searchParams = new URLSearchParams(urlObj.search);

        const mappedParams = new Map();
        for (const [key, value] of searchParams.entries()) {
            if (value.includes(' ')) {
                mappedParams.set(key, value.replace(/ /g, '+'));
            } else if (key.endsWith('[]')) {
                const paramName = key.slice(0, -2);
                const arrayKey = `${paramName}s`;
                mappedParams.set(arrayKey, mappedParams.get(arrayKey) ? [...mappedParams.get(arrayKey), value] : [value]);
            } else {
                mappedParams.set(key, value);
            }
        }

        for (const [key, value] of Object.entries(customParams)) {
            mappedParams.set(key, value);
        }

        if (!disableOrder && !mappedParams.has('order')) {
            mappedParams.set('order', 'newest_first');
        }

        if (allowSwap) {
            mappedParams.set('swap', '1');
        }

        const finalParams = [];
        for (const [key, value] of mappedParams.entries()) {
            finalParams.push(Array.isArray(value) ? `${key}=${value.join(',')}` : `${key}=${value}`);
        }

        return {
            validURL: true,
            domain,
            querystring: finalParams.join('&'),
        };
    } catch (error) {
        console.error(`[!] Error parsing URL: ${error.message}`);
        return { validURL: false };
    }
};

/**
 * Searches Vinted for items based on a URL
 * @param {string} url - The Vinted search URL
 * @param {boolean} disableOrder - Whether to disable default sorting
 * @param {boolean} allowSwap - Whether to include swap items
 * @param {Object} customParams - Additional query parameters
 * @returns {Promise<Object>} - Search results
 */
const search = async (url, disableOrder = false, allowSwap = false, customParams = {}) => {
    try {
        const { validURL, domain, querystring } = parseVintedURL(url, disableOrder, allowSwap, customParams);
        if (!validURL) {
            console.log(`[!] Invalid URL: ${url}`);
            return [];
        }

        let sessionCookie = cookies.get(domain) || process.env[`VINTED_API_${domain.toUpperCase()}_COOKIE`];
        if (!sessionCookie) {
            console.log(`[*] No cached cookie for ${domain}, fetching new one`);
            sessionCookie = await fetchCookie(domain);
        }

        const response = await fetch(`https://www.vinted.${domain}/api/v2/catalog/items?${querystring}`, {
            headers: {
                'user-agent': new UserAgent().toString(),
                'accept': 'application/json, text/plain, */*',
                'cookie': `_vinted_fr_session=${sessionCookie}`,
            },
            agent: process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined,
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log(`[!] Invalid cookie for ${domain}, refreshing`);
                cookies.delete(domain);
                sessionCookie = await fetchCookie(domain);
                return search(url, disableOrder, allowSwap, customParams);
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error(`[!] Search failed: ${error.message}`);
        return [];
    }
};

module.exports = {
    fetchCookie,
    parseVintedURL,
    search,
};
