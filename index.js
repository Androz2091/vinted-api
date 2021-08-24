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
const getVintedQuerystring = (url) => {
    const params = url.match(/(?:([a-z_]+)(\[\])?=([a-z0-9]*)&?)/g);
    const finalParams = new URLSearchParams();
    for (let param of params) {
        const [ _, paramName, isArray, paramValue ] = param.match(/(?:([a-z_]+)(\[\])?=([a-z0-9]*)&?)/);
        finalParams.set(isArray ? `${paramName}s` : paramName, paramValue);
    }
    return finalParams;
}

/**
 * Searches something on Vinted
 */
const search = (url) => {
    return new Promise((resolve, reject) => {

        const params = getVintedQuerystring(url);

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

module.exports.fetchCookie = fetchCookie;
module.exports.search = search;
