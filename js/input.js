let keyPressed = {};
let keyPressedOnce = {};
let keyPressedHistory = {};

function OnKeyDown(event) {
    if (keyPressed[event.key] != undefined) {
        keyPressed[event.key]++;
    }
    else {
        keyPressed[event.key] = 1;
    }
}

function OnKeyUp(event) {
    keyPressed[event.key] = 0;
}

//should be called at the start of each frame
function UpdateKeyPressedOnce() {
    for (var keyName in keyPressed) {
        if (keyPressed[keyName] == 0) {
            //clear from tracking if its there
            keyPressedHistory[keyName] = 0;
        }
        else if (keyPressed[keyName] == 1 && !keyPressedHistory[keyName]) {
            //track it, only trigger once
            keyPressedHistory[keyName] = 1;
            keyPressedOnce[keyName] = 1;
        }
    }
}

//should be called at the end of each frame
function FlushKeyPressedOnce() {
    keyPressedOnce = {};
}

function KeyPressed(keyName) {
    return keyPressed[keyName];
}

function KeyPressedOnce(keyName) {
    return keyPressedOnce[keyName];
}

window.addEventListener("keydown", OnKeyDown);
window.addEventListener("keyup", OnKeyUp);

export { KeyPressed, KeyPressedOnce, UpdateKeyPressedOnce, FlushKeyPressedOnce };
