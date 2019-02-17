# Sava Cart Store Front Service 
The sava-cart store front is a fork of [gtsopour/nodejs-shopping-cart](https://github.com/gtsopour/nodejs-shopping-cart)

The store front provides a responsive web app consisting of a products page, a shopping cart and a checkout page.

The `sava-cart` service is used in the Vamp tutorials, starting with tutorial 5: [Smarter Releasing on Kubernetes](https://vamp.io/documentation/tutorials/smarter-releasing-on-kubernetes/)

### Version 1.0

**Depends on:**
* `sava-product` 1.x or later

**Environment variables:**
* `LOCALE`: the store front locale. (Default: `EN`)
* `PRODUCT_SERVICE_ADDR`: the address (hostname and port) of the product service. (Default: http://sava-product:9070)

### Version 2.0

Adds product images and basic multi-tenant support.

**Depends on:**
* `sava-product` service 2.x or later. It also works with `sava-product` 1.x but not product images will be shown

Environment variables:
* `LOCALE`: the store front locale. (Default: `EN`)
* `PRODUCT_SERVICE_ADDR`: the address (hostname and port) of the product service. (Default: http://sava-product:9070)
* `BASE_PATH`: (Default: `\<LOCALE>\`)

### Version 2.1

Adds product star ratings.

**Depends on:**
* `sava-product` service 2.x or later. It also works with `sava-product` 1.x but not product images will be shown
* `sava-ratings` service 0.1 or later

**Environment variables:**
* `LOCALE`: the store front locale. (Default: `EN`)
* `PRODUCT_SERVICE_ADDR`: the address (hostname and port) of the product service. (Default: http://sava-product:9070)
* `BASE_PATH`: (Default: `\<LOCALE>\`)
* `SHOW_RATINGS`: toggles whether product ratings are show (Default: true)
* `RATINGS_SERVICE_ADDR`: the address (hostname and port) of the ratings service. (Default: http://sava-ratings:9085)

## Running Locally using Docker

The minimal Docker command is:

`docker run -dit -p 3000:3000 vampio/sava-cart:2.1.0`

This exposes the latest version of the `sava-cart` service on http://127.0.0.1:3000/en/.

**Note:** assuming `sava-product` service is not accessible at http://sava-product:9070, the cart shows a list of fruit (a throw back to the original project).

To add the `sava-product` and `sava-ratings` dependencies, use the following Docker command:

`docker run -dit -p 3000:3000 -e LOCALE=IE -e PRODUCT_SERVICE_ADDR=http://<addr> -e RATINGS_SERVICE_ADDR=http://<addr> vampio/sava-cart:2.1.0`
