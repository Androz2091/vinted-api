const vinted = require("./");

test('fetch cookie', () => {
    return expect(vinted.fetchCookie()).resolves.not.toBeNull();
});

test('search url', () => {
    return expect(vinted.search('https://www.vinted.fr/vetements?search_text=pantalon')).resolves.not.toBeNull();
});

test('parse url', () => {
    return expect(vinted.getVintedQuerystring('https://www.vinted.fr/vetements?search_text=or%20plaqué&currency=EUR&catalog[]=79&catalog[]=1816&size_id[]=207&size_id[]=208&brand_id[]=53&price_to=20&status[]=3&status[]=2&status[]=1&status[]=6&order=newest_first', false, false, {
        per_page: '10'
    }))
        .toBe('search_text=or+plaqué&currency=EUR&catalog_ids=79,1816&size_ids=207,208&brand_ids=53&price_to=20&status_ids=3,2,1,6&order=newest_first&is_for_swap=0&per_page=10')
});
