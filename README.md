# Vinted API

Simple library that uses the Vinted API to search new posts.

## Example

```js
const vinted = require('vinted-api');

vinted.search('https://www.vinted.fr/vetements?brand_id[]=53').then((posts) => {
    console.log(posts); // all the posts that match this query
});
```

## Credits

This is a fork from [vinted-api](https://github.com/Androz2091/vinted-api) by [Androz2091](https://github.com/Androz2091)
But this one is currently working and updated.
