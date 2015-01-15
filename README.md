Amazon Amiibo Checker
===================


Check Amazon.com for additions to the Amiibo parent ASIN.

Current the parent ASIN has 18 Amiibo under it. When that value changes, that means preorder Amiibos should be available for purchase. An email is sent out to let you know with a link to the parent ASIN Amiibo page.

Also checks Amazon.com for added offers to the Legend of Zelda: Majora's Mask 3DS XL Game System as well as the 3DS Game Bundle.

Configuration
-----------------

```
git clone <repo> /path/to/dump/repo
cd /path/to/dump/repo
npm install
cp config.js.template config.js
vim config.js
npm start
```

License
-----------

[MIT](http://brutalhonesty.mit-license.org/)
[TL;DR](https://tldrlegal.com/license/mit-license)
