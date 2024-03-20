// Injecting a chat panel into the page
function injectChatPanel() {

    chrome.storage.local.get(["unique_id"]).then((storage) => {
        let storageElement = storage["unique_id"];
        if (storageElement === undefined || storageElement === null) {
            chrome.storage.local.set({"unique_id": crypto.randomUUID()})
        }
    })



    basket = []
    for (const basket_entry of document.querySelector('[data-testid="basket-items-container"]')?.getElementsByClassName("basket-tile") ?? []) {
        try {
            let quantity = basket_entry.getElementsByTagName("h5")[0]?.innerText;
            if (quantity !== undefined && quantity !== null) {
                basket.push({
                    "name": basket_entry.getElementsByTagName("h4")[0].innerText,
                    "quantity": quantity,
                })
            } else {
                basket.push({
                    "name": basket_entry.getElementsByTagName("h4")[0].innerText,
                    "status": "out of stock",
                })
            }
        } catch (e) {
            console.log(e)
        }
    }
    chrome.storage.local.set({"basket": basket})

    const chatPanel = document.createElement('div');
    chatPanel.innerHTML = `
<div id="my-chat-panel" style="position: fixed; bottom: 10px; right: 10px; background-color: white; border: 1px solid #ddd; padding: 10px; z-index: 1000; width: 400px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); border-radius: 15px;">
    <div id="login-warning" style="background-color: yellow; color: black; padding: 5px; text-align: center; border-radius: 10px; display: none;">
        Warning: You cannot order unless you are logged in.
    </div>
    <button id="toggle-chat" style="height: 40px; width: 100%; background-color: #4CAF50; color: white; font-size: 16px; border: none; border-radius: 15px; cursor: pointer; transition: background-color 0.3s ease;">
        <span style="margin-right: 10px;">&#9660;</span> Toggle Chat
    </button>
    <div id="chat-content" style="height: 670px; overflow: hidden;">
        <div id="messages-container" style="height: 560px; overflow-y: auto; padding: 10px;">
            <div id="chat-messages"></div>
        </div>
        <input type="text" id="chat-input" placeholder="Type a message..." style="width: calc(100% - 20px); flex-grow: 1; margin-right: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 15px;">
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <button id="send-btn" style="width: calc(100% - 20px); background-color: #4CAF50; color: white; border: none; border-radius: 15px; padding: 5px 10px;">Send</button>
            <button id="clear-btn" style="width: calc(100% - 20px); background-color: #f44336; color: white; border: none; border-radius: 15px; padding: 5px 10px; margin-left: 5px;">Clear Chat</button>
        </div>
    </div>
</div>
    `;
    document.body.appendChild(chatPanel);

    chrome.storage.local.get(["logged_out"]).then((storage) => {
        console.log("handling logged out ")
        let logged_out = storage["logged_out"];
        console.log("loggedout     " + logged_out)
        logged_out = document.getElementById("utility-header-login-link")?.innerText.toLowerCase() === "sign in";
        chrome.storage.local.set({"logged_out": logged_out})
        console.log("logged out equals " + logged_out)
        if (logged_out) {
            document.getElementById('login-warning').style.display = 'block';
        } else {
            console.log("user is logged in")
            document.getElementById('login-warning').style.display = 'none';
        }
    })

    // Toggle chat panel
    document.getElementById('toggle-chat').addEventListener('click', function () {
        const chatContent = document.getElementById('chat-content');
        if (chatContent.style.display === 'none') {
            chatContent.style.display = 'block';
        } else {
            chatContent.style.display = 'none';
        }
        var messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    document.getElementById('clear-btn').addEventListener('click', () => {
        chrome.storage.local.set({"conversation": [], "basket": []});
        var chatMessages = document.getElementById('chat-messages');

        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    });

    // Handle sending messages
    document.getElementById('send-btn').addEventListener('click', sendMessage);

    document.getElementById('chat-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !event.shiftKey) {
            e.preventDefault();  // Prevent the default action to stop from adding a newline
            sendMessage();

        }
    });

    chrome.storage.local.get(["conversation"]).then((messages) => {
        let message = messages["conversation"];
        if(message === undefined || message === null){
            message = []
            chrome.storage.local.set({"conversation": []})
        }
        for (const a of message) {
            if (a.role === "user") {
                document.getElementById('chat-messages').appendChild(userMessage(a.content))
            } else if (a.role === "assistant" && a.content !== undefined && a.content !== null) {
                document.getElementById('chat-messages').appendChild(assistantMessage(a.content))
            }
        }

        if (message.length === 0) {
            makeGptCall()
        }
    });
}

function userMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        background-color: #4CAF50; /* Lighter green color */
        color: white;
        padding: 10px;
        margin: 8px;
        border-radius: 15px;
        text-align: left;
        max-width: 70%; /* Ensuring messages do not take full width */
        word-wrap: break-word; /* This ensures that the text breaks to prevent spillover */
        box-sizing: border-box; /* This ensures padding is included in width */
        position: relative;
        margin-left: auto; /* Right align for user's messages */
                font-size: 16px;
        font-family: 'Arial', sans-serif;
        `;
    return messageDiv
}

function assistantMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = message.replace(/\.\n/g, '.<br>').replace(/\n-/g, '<br>-').replace("<option>Would you like me to order this for you?</option>", "");
    messageDiv.style.cssText = `
        background-color: #007bff; /* Blue color */
        color: white;
        padding: 10px;
        margin: 8px;
        border-radius: 15px;
        text-align: left;
        max-width: 70%; /* Ensuring messages do not take full width */
        position: relative;
        margin-right: auto; /* Left align for received messages */
        font-size: 16px;
        font-family: 'Arial', sans-serif;
        \`;
    `;

    if (message.startsWith("<option>Would you like me to order this for you?</option>")) {
        const orderButton = document.createElement('button');
        orderButton.textContent = 'Click here to order all ingredients';
        orderButton.style.cssText = `
            background-color: #4CAF50; /* Green color */
            color: white;
            border: none;
            border-radius: 5px;
            padding: 5px 10px;
            margin-top: 10px;
            cursor: pointer;
        `;
        // Add an event listener to the button (optional)
        orderButton.addEventListener('click', async function () {
            const result = await chrome.storage.local.get(["conversation"])
            console.log("JSON.stringify(result)  " + JSON.stringify(result))
            result["conversation"].push({
                "role": "user",
                "content": "Yeah please order everything on that list for me!"
            })
            await chrome.storage.local.set({"conversation": result["conversation"]})
            console.log("after set  " + await chrome.storage.local.get(["conversation"]))
            orderButton.disabled = true;
            orderButton.style.backgroundColor = '#ccc'; // Optional: Change the button color to indicate it's disabled
            orderButton.style.cursor = 'default'; // Optional: Change the cursor to default
            await makeGptCall()

        });

        messageDiv.appendChild(orderButton);
    }
    var messagesContainer = document.getElementById('messages-container');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv
}

async function sendMessage() {

    const input = document.getElementById('chat-input');
    const message = input.value.trim()

    if (message) {
        const result = await chrome.storage.local.get(["conversation"])
        console.log("JSON.stringify(result)  " + JSON.stringify(result))
        result["conversation"].push({"role": "user", "content": message})
        await chrome.storage.local.set({"conversation": result["conversation"]})
        console.log("after set  " + await chrome.storage.local.get(["conversation"]))

        document.getElementById('chat-messages').appendChild(userMessage(message));
        input.value = '';
        await makeGptCall();
    }
    var messagesContainer = document.getElementById('messages-container');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// Run the function to inject the chat panel
injectChatPanel();
