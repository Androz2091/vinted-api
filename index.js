const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const cookie = require('cookie');

/**
 * Fetches a new public cookie from Vinted.fr
 */
const fetchCookie = () => {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        fetch('https://vinted.fr', {
            signal: controller.signal
        }).then((res) => {
            const sessionCookie = res.headers.get('set-cookie');
            controller.abort();
            resolve(cookie.parse(sessionCookie)['secure, _vinted_fr_session']);
        }).catch(() => {
            controller.abort();
            reject();
        });
    });
}

/**
 * Parse a vinted URL to get the querystring usable in the search endpoint
 */
const getVintedQuerystring = (url, newestFirst) => {
    const missingIDsParams = ['catalog', 'status'];
    const params = url.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z0-9_]*)&?)/g);
    const mappedParams = new Map();
    for (let param of params) {
        let [ _, paramName, isArray, paramValue ] = param.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z0-9_]*)&?)/);
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
    if (!mappedParams.has('order') && newestFirst) mappedParams.set('order', 'newest_first');
    const finalParams = [];
    for (let [ key, value ] of mappedParams.entries()) {
        finalParams.push(typeof value === 'string' ? `${key}=${value}` : `${key}=${value.join(',')}`);
    }
    return finalParams.join('&');
}

/**
 * Searches something on Vinted
 */
const search = (url, options = {
    newestFirst: false
}) => {
    return new Promise((resolve, reject) => {

        const params = getVintedQuerystring(url, options.newestFirst ?? false);

        fetchCookie().then((cookie) => {
            const controller = new AbortController();
            fetch('https://www.vinted.fr/api/v2/items?' + params, {
                signal: controller.signal,
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
            }).catch(() => {
                controller.abort();
                reject('Can not fetch search API');
            });
        }).catch(() => reject('Can not fetch cookie'));
    });
}

module.exports = {
    fetchCookie,
    getVintedQuerystring,
    search
}
