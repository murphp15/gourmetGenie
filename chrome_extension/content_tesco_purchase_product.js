function order_product(i) {
    new Promise(resolve => setTimeout(resolve, 50)).then(a => {
        let element = document.querySelector('button[data-auto$="quantity-controls-add-button"]');
        if (element === undefined || element === null) {
            const result_status = "this product is currently out of stock"
        } else {
            element.click()
            if (i !== 0) {
                order_product(i - 1)
            }
        }
    });
}


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "purchaseProducts") {
        console.log("we are in the purchase section   " + request.quantity)
        order_product(request.quantity - 1)
        const result = await chrome.storage.local.get(["conversation"])
        console.log("JSON.stringify(result)  " + JSON.stringify(result))

        result["conversation"].push({
            "role": "function", "name": "add_product_to_cart"
            , "content": "product_added"
        })
        chrome.storage.local.set({"conversation": result["conversation"]})
        await makeGptCall()
    }
})
;



function repeatedAction(){
    document.getElementById('chat-messages').lastChild.textContent = document.getElementById('chat-messages').lastChild.textContent + "."
}
// Function to add a received message
async function makeGptCall() {
    const messages = (await chrome.storage.local.get(["conversation"]))["conversation"]
    const basket = (await chrome.storage.local.get(["basket"]))["basket"]
    const logged_out = (await chrome.storage.local.get(["logged_out"]))["logged_out"]
    document.getElementById('chat-messages').appendChild(assistantMessage("."))
    let intervalId = setInterval(repeatedAction, 500);

    const response = await fetch("https://basket-python.azurewebsites.net/chrome_question", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            basket,
            logged_out,
            messages,
            "unique_id": (await chrome.storage.local.get(["unique_id"]))["unique_id"]
        })
    });
    clearInterval(intervalId);
    document.getElementById('chat-messages').removeChild(document.getElementById('chat-messages').lastChild)

    const message = await response.json();
    if (message.function_call?.name === "search_for_product") {

        const result = await chrome.storage.local.get(["conversation"])
        result["conversation"].push({
            "role": "assistant",
            content: null, // this needs to be heere of the api throws and error
            "function_call": message.function_call
        },)
        chrome.storage.local.set({"conversation": result["conversation"]})

        if (window.location.href.startsWith("https://www.tesco.ie/")) {
            chrome.runtime.sendMessage({
                action: "search", url: "https://www.tesco.ie/groceries/en-IE/search?query=" +
                    JSON.parse(message.function_call.arguments).search_term
            });
        } else {
            chrome.runtime.sendMessage({
                action: "search", url: "https://www.tesco.com/groceries/en-GB/search?query=" +
                    JSON.parse(message.function_call.arguments).search_term
            });
        }
    } else if (message.function_call?.name === "add_product_to_cart") {
        const result = await chrome.storage.local.get(["conversation"])
        result["conversation"].push({
            "role": "assistant",
            content: null, // this needs to be heere of the api throws and error
            "function_call": message.function_call
        },)
        chrome.storage.local.set({"conversation": result["conversation"]})
        console.log("what are the arguments to buy " + message.function_call.arguments)

        let result_on_search_page
        if (window.location.href.startsWith("https://www.tesco.ie/")) {
            console.log("in the ie section")
            result_on_search_page = document.querySelector('[action="/groceries/en-IE/trolley/items/' + JSON.parse(message.function_call.arguments).url.split("/").pop() + '?_method=PUT"]')
        } else {
            result_on_search_page = document.querySelector('[action="/groceries/en-GB/trolley/items/' + JSON.parse(message.function_call.arguments).url.split("/").pop() + '?_method=PUT"]')
        }


        if (result_on_search_page) {
            if (JSON.parse(message.function_call.arguments).quantity > 0) {
                result_on_search_page.querySelector('[data-auto="beans-quantity-controls-add-button"]').click()
            } else {
                result_on_search_page.querySelector('[data-auto="beans-quantity-controls-remove-button"]').click()
            }
            const result = await chrome.storage.local.get(["conversation"])
            console.log("JSON.stringify(result)  " + JSON.stringify(result))

            result["conversation"].push({
                "role": "function", "name": "add_product_to_cart"
                , "content": "product_added"
            })
            chrome.storage.local.set({"conversation": result["conversation"]})
            makeGptCall()
        } else {
            if (window.location.href.startsWith("https://www.tesco.com")) {
                chrome.runtime.sendMessage({
                    action: "navigate", url: "https://www.tesco.com" +
                        JSON.parse(message.function_call.arguments).url,
                    quantity: JSON.parse(message.function_call.arguments).quantity,
                });
            } else {
                chrome.runtime.sendMessage({
                    action: "navigate", url: "https://www.tesco.ie" +
                        JSON.parse(message.function_call.arguments).url,
                    quantity: JSON.parse(message.function_call.arguments).quantity,
                });
            }
        }
    } else {
        const result = await chrome.storage.local.get(["conversation"])
        result["conversation"].push({
            "role": "assistant",
            "content": message.content
        },)
        chrome.storage.local.set({"conversation": result["conversation"]})

        document.getElementById('chat-messages')
            .appendChild(assistantMessage(message.content));
    }
}
