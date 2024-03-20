


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "scrapeProducts") {
        const scrapedProducts = []
        for(const product of document.getElementsByClassName("product-list")[0].getElementsByClassName("product-list--list-item")){
            try {
                scrapedProducts.push({
                    "desc": product.querySelector('[data-auto="product-tile--title"]').innerText,
                    "url": product.querySelector('[data-auto="product-tile--title"]').getAttribute("href"),
                    "price": product.getElementsByClassName("beans-price__text")[0].innerText,
                    "priceForVolume": product.getElementsByClassName("beans-price__subtext")[0].innerText
                })
            }catch(e){
                console.log(product.querySelector('[data-auto="product-tile--title"]').innerText)
            }
        }
        const result = await chrome.storage.local.get(["conversation"])
        result["conversation"].push({"role": "function","name": "search_for_product"
            ,"content" : JSON.stringify(scrapedProducts)})
        chrome.storage.local.set({"conversation": result["conversation"]})
         await makeGptCall()
    }
});
