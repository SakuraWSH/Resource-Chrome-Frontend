document.addEventListener('DOMContentLoaded', function() {
    const doActionButton = document.getElementById('doAction');
    
    doActionButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "doAction"}, function(response) {
                console.log('Response:', response);
            });
        });
    });
});
    