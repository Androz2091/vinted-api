const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const querystring = require('querystring');
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
 * Searches something on Vinted
 */
const search = (query, options = {}) => {
    return new Promise((resolve, reject) => {

        const params = querystring.encode({
            search_text: query,
            ...options
        });

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
