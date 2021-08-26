const vinted = require("./");

test('fetch cookie', () => {
    return expect(vinted.fetchCookie()).resolves.not.toBeNull();
});

test('search url', () => {
    return expect(vinted.search('https://www.vinted.fr/vetements?search_text=pantalon')).resolves.not.toBeNull();
});

test('parse url', () => {
    return expect(vinted.getVintedQuerystring('https://www.vinted.fr/vetements?search_text=pantalon&brand_id[]=53&brand_id[]=34'))
        .toBe('search_text=pantalon&brand_ids=53,34')
});
