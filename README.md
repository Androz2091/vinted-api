# Vinted API

Simple library that uses the Vinted API to search new posts.

## Example

```js
const vinted = require('vinted-api');

vinted.search('https://www.vinted.fr/vetements?brand_id[]=53').then((posts) => {
    console.log(posts); // all the posts that match this query
});
```
