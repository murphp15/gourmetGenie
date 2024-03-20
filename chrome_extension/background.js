chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "search" && message.url) {
        console.log("Going to do a search")
        chrome.tabs.update(sender.tab.id, {url: message.url}, (tab) => {
            chrome.tabs.onUpdated.addListener(function (updatedTabId, changeInfo, updatedTab) {
                if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "scrapeProducts"
                    });
                    chrome.tabs.onUpdated.removeListener(arguments.callee);
                }

            })
        })
    }else{
        console.log("we are going to " + message.url)
        chrome.tabs.update(sender.tab.id, {url: message.url}, (tab) => {
            chrome.tabs.onUpdated.addListener(function (updatedTabId, changeInfo, updatedTab) {
                if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "purchaseProducts", quantity: message.quantity
                    });
                    chrome.tabs.onUpdated.removeListener(arguments.callee);
                }
            })
        })
    }
})
