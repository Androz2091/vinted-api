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
        const agent = process.env.VINTED_API_HTTPS_PROXY ? new HtsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined;
        if (agent) {
            console.log(`[*] Using proxy ${process.env.VINTED_API_HTTPS_PROXY}`);
        }

        // Request to the main page
        const mainResponse = await fetch(`https://www.vinted.${domain}`, {
            headers: {
                'user-agent': new UserAgent().toString(),
            },
            agent,
        });

        const mainCookies = mainResponse.headers.get('set-cookie') || '';
        console.log(`[*] Cookies from main page: ${mainCookies}`);

        // Request to the session configuration API
        const configResponse = await fetch(`https://www.vinted.${domain}/api/v2/configurations/session_defaults`, {
            headers: {
                'user-agent': new UserAgent().toString(),
            },
            agent,
        });

        const configCookies = configResponse.headers.get('set-cookie') || '';
        console.log(`[*] Cookies from session_defaults: ${configCookies}`);

        // Combine cookies into a single string, avoiding duplicates
        const combinedCookies = [];
        const cookieSet = new Set();

        // Process main page cookies
        if (mainCookies) {
            mainCookies.split(',').forEach(cookie => {
                const trimmedCookie = cookie.trim();
                if (trimmedCookie && !cookieSet.has(trimmedCookie)) {
                    combinedCookies.push(trimmedCookie);
                    cookieSet.add(trimmedCookie);
                }
            });
        }

        // Process session_defaults cookies
        if (configCookies) {
            configCookies.split(',').forEach(cookie => {
                const trimmedCookie = cookie.trim();
                if (trimmedCookie && !cookieSet.has(trimmedCookie)) {
                    combinedCookies.push(trimmedCookie);
                    cookieSet.add(trimmedCookie);
                }
            });
        }

        if (combinedCookies.length === 0) {
            throw new Error('No cookies received from either endpoint');
        }

        // Join cookies into a string
        const sessionCookie = combinedCookies.join('; ');
        
        // Check for _vinted_fr_session
        const parsedCookies = cookie.parse(sessionCookie);
        if (!parsedCookies['_vinted_fr_session']) {
            console.warn(`[!] No _vinted_fr_session cookie found in combined cookies`);
        }

        cookies.set(domain, sessionCookie);
        console.log(`[*] Fetched and combined cookie for ${domain}: ${sessionCookie}`);
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

        console.log(response.status);

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

/**
 * Fetches similar items for a given item ID
 * @param {number} itemId - The ID of the item to find similar items for
 * @param {string} domain - The Vinted domain (e.g., 'fr', 'be')
 * @returns {Promise<Object[]>} - Array of similar items
 */
const fetchSimilarItems = async (itemId, domain = 'fr') => {
    try {
        let sessionCookie = cookies.get(domain) || process.env[`VINTED_API_${domain.toUpperCase()}_COOKIE`];
        if (!sessionCookie) {
            console.log(`[*] No cached cookie for ${domain}, fetching new one`);
            sessionCookie = await fetchCookie(domain);
        }

        const response = await fetch(`https://www.vinted.${domain}/api/v2/items/${itemId}/plugins/items?name=similar_items`, {
            headers: {
                'user-agent': new UserAgent().toString(),
                'accept': 'application/json, text/plain, */*',
                'cookie': `_vinted_fr_session=${sessionCookie}`,
            },
            agent: process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined,
        });

        console.log(`[*] Similar items fetch status: ${response.status}`);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log(`[!] Invalid cookie for ${domain}, refreshing`);
                cookies.delete(domain);
                sessionCookie = await fetchCookie(domain);
                return fetchSimilarItems(itemId, domain);
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error(`[!] Failed to fetch similar items for item ${itemId}: ${error.message}`);
        return [];
    }
};

module.exports = {
    fetchCookie,
    parseVintedURL,
    search,
    fetchSimilarItems,
};
