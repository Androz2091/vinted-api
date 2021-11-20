const vinted = require("./");

test('fetch cookie', () => {
    return expect(vinted.fetchCookie()).resolves.not.toBeNull();
});

test('search url', () => {
    return expect(vinted.search('https://www.vinted.fr/vetements?search_text=pantalon')).resolves.not.toBeNull();
});

test('works for basic URLs', () => {
    return expect(vinted.parseVintedURL('https://www.vinted.fr/vetements?search_text=pokemon')).toEqual({
        validURL: true,
        querystring: 'search_text=pokemon',
        domain: 'fr'
    });
});

test('works for invalid URLs', () => {
    expect(vinted.parseVintedURL('https://google.com/https://www.vinted.fr/vetements?search_text=pokemon')).toEqual({
        validURL: false
    });
    return expect(vinted.parseVintedURL('htts://www.vinted.fr/vetements?search_text=chsiuhs&search_id=3579137773')).toEqual({
        validURL: false
    });
});

test('works for it URLs', () => {
    return expect(vinted.parseVintedURL('https://www.vinted.it/vetements?search_text=pokemon')).toEqual({
        validURL: true,
        querystring: 'search_text=pokemon',
        domain: 'it'
    });
});

test('works for hard-coded URLs', () => {
    return expect(vinted.parseVintedURL('https://www.vinted.fr/vetements?search_text=&brand_id%5B%5D=53&brand_id%5B%5D=304&brand_id%5B%5D=14&brand_id%5B%5D=88&size_id%5B%5D=208&size_id%5B%5D=784&status%5B%5D=2&currency=EUR&order=newest_first')).toEqual({
        validURL: true,
        querystring: 'search_text=&brand_ids=53,304,14,88&size_ids=208,784&status_ids=2&currency=EUR&order=newest_first',
        domain: 'fr'
    });
});

test('works for weird URLs with &', () => {
    return expect(vinted.parseVintedURL('https://www.vinted.fr/vetements?search_text=coucou%20%26%20sell&size_id[]=208&currency=EUR&order=newest_first')).toEqual({
        validURL: true,
        querystring: 'search_text=coucou+%26+sell&size_ids=208&currency=EUR&order=newest_first',
        domain: 'fr'
    });
});
