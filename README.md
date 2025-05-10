# Vinted API

Simple library that uses the Vinted API to search new posts.

This fork was created to address the issue raised in: https://github.com/Androz2091/vinted-api/issues/23

## Example

```js
const VintedAPI = require('./index.js');

const orderList = {
    "pertinence": "relevance",
    "prix décroissant": "price_high_to_low",
    "prix croissant": "price_low_to_high",
    "le plus récent": "newest_first"
};

const qualiteList = {
    "neuf avec étiquette": 6,
    "neuf sans étiquette": 1,
    "très bon état": 2,
    "bon état": 3,
    "satisfaisant": 4,
    "certaines pièces ne fonctionnent pas": 7
};

const params = {
    price_form: 2,
    price_to: 200,
    status_ids: qualiteList["bon état"],
    marque: "Nike",
    pays: "FR",
}

const text = "chaussures";
const url = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=500&search_text=${text}`;
console.log(`[*] URL générée : ${url}`);
console.log(`[*] Paramètres : ${JSON.stringify(params)}`);

const items = await VintedAPI.search(url, false, false, customParams);
console.log(`[*] Items reçus : ${items.length}`);
```
