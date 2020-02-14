
denfield-webp-hero
=========

browser polyfill for the webp image format
------------------------------------------

This is a clone of webp-hero package with support for background images.

Please see original documentation [https://github.com/chase-moskal/webp-hero].

You can pass list of selectors to be find and the script will recognize if this is an image or div element with background-image style.

#### Example
```html
<script>
	var webpMachine = new webpHero.WebpMachine()
	webpMachine.polyfillDocument({selectors: "img, .bg"})
</script>
```