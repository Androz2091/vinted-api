const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const cookie = require('cookie');
const { HttpsProxyAgent } = require('https-proxy-agent');

const cookies = new Map();

/**
 * Fetches a new public cookie from Vinted.fr
 */
const fetchCookie = (domain = 'fr') => {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const agent = process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined;
        if (agent) {
            console.log(`[*] Using proxy ${process.env.VINTED_API_HTTPS_PROXY}`);
        }
        fetch(`https://vinted.${domain}`, {
            signal: controller.signal,
            agent,
            headers: {
                'user-agent': new UserAgent().toString()
            }
        }).then((res) => {
            const sessionCookie = res.headers.get('set-cookie');
            controller.abort();
            const c = cookie.parse(sessionCookie)['secure, _vinted_fr_session'];
            if (c) {
                console.log(c);
                cookies.set(domain, c);
            }
            resolve();
        }).catch(() => {
            controller.abort();
            reject();
        });
    });
}

/**
 * Parse a vinted URL to get the querystring usable in the search endpoint
 */
const parseVintedURL = (url, disableOrder, allowSwap, customParams = {}) => {
    try {
        const decodedURL = decodeURI(url);
        const matchedParams = decodedURL.match(/^https:\/\/www\.vinted\.([a-z]+)/);
        if (!matchedParams) return {
            validURL: false
        };

        const missingIDsParams = ['catalog', 'status'];
        const params = decodedURL.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z 0-9._À-ú+%]*)&?)/g);
        if (typeof matchedParams[Symbol.iterator] !== 'function') return {
            validURL: false
        };
        const mappedParams = new Map();
        for (let param of params) {
            let [ _, paramName, isArray, paramValue ] = param.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z 0-9._À-ú+%]*)&?)/);
            if (paramValue?.includes(' ')) paramValue = paramValue.replace(/ /g, '+');
            if (isArray) {
                if (missingIDsParams.includes(paramName)) paramName = `${paramName}_id`;
                if (mappedParams.has(`${paramName}s`)) {
                    mappedParams.set(`${paramName}s`, [ ...mappedParams.get(`${paramName}s`), paramValue ]);
                } else {
                    mappedParams.set(`${paramName}s`, [paramValue]);
                }
            } else {
                mappedParams.set(paramName, paramValue);
            }
        }
        for (let key of Object.keys(customParams)) {
            mappedParams.set(key, customParams[key]);
        }
        const finalParams = [];
        for (let [ key, value ] of mappedParams.entries()) {
            finalParams.push(typeof value === 'string' ? `${key}=${value}` : `${key}=${value.join(',')}`);
        }

        return {
            validURL: true,
            domain: matchedParams[1],
            querystring: finalParams.join('&')
        }
    } catch (e) {
        return {
            validURL: false
        }
    }
}

/**
 * Searches something on Vinted
 */
const search = (url, disableOrder = false, allowSwap = false, customParams = {}) => {
    return new Promise(async (resolve, reject) => {

        const { validURL, domain, querystring } = parseVintedURL(url, disableOrder ?? false, allowSwap ?? false, customParams);
        
        if (!validURL) {
            console.log(`[!] ${url} is not valid in search!`);
            return resolve([]);
        }

        const c = cookies.get(domain) ?? process.env[`VINTED_API_${domain.toUpperCase()}_COOKIE`];
        if (c) console.log(`[*] Using cached cookie for ${domain}`);
        if (!c) {
            console.log(`[*] Fetching cookie for ${domain}`);
            await fetchCookie(domain).catch(() => {});
        }

        const controller = new AbortController();
        fetch(`https://www.vinted.be/api/v2/catalog/items?${querystring}`, {
            signal: controller.signal,
            //agent: process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined,
            headers: {
                cookie: '_vinted_fr_session=' + cookie,
                'user-agent': new UserAgent().toString(),
                accept: 'application/json, text/plain, */*'
            }
        }).then((res) => {
            res.text().then((text) => {
                controller.abort();
                try {
                    resolve(JSON.parse(text));
                } catch (e) {
                    reject(text);
                }
            });
        }).catch((e) => {
            try {
                if (JSON.parse(e).message === `Token d'authentification invalide`) {
                    fetchCookie();
                }
            } catch {}
            controller.abort();
            reject('Can not fetch search API');
        });
    
    });
}

module.exports = {
    fetchCookie,
    parseVintedURL,
    search
}
