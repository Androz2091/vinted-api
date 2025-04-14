# Vinted API

Simple library that uses the Vinted API to search new posts.

This fork was created to address the issue raised in: https://github.com/Androz2091/vinted-api/issues/23

## Example

```js
const vinted = require('./index.js');

vinted.search('https://www.vinted.fr/vetements?brand_id[]=53').then((posts) => {
    console.log(posts); // all the posts that match this query
});
```
