let keyPressed = {};
let keyPressedOnce = {};
let keyPressedHistory = {};
let keyAliases = {
    shift: ["ShiftLeft", "ShiftRight"],
    ctrl: ["ControlLeft", "ControlRight"],
    alt: ["AltLeft", "AltRight"],
    esc: ["Escape"],
    space: ["Space"],
    tab: ["Tab"],
    caps: ["CapsLock"]
}

function OnKeyDown(event) {
    keyPressed[event.code] = 1;

    event.preventDefault();
    event.stopPropagation();
}

function OnKeyUp(event) {
    keyPressed[event.code] = 0;

    event.preventDefault();
    event.stopPropagation();
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
    var result = 0;

    if (keyAliases[keyName] != undefined) {
        for (let alias of keyAliases[keyName]) {
            result |= keyPressed[alias];
        }
    }
    else {
        result = keyPressed[GetKeyCodeFromName(keyName)];
    }

    return result;
}

function KeyPressedOnce(keyName) {
    var result = 0;

    if (keyAliases[keyName] != undefined) {
        for (let alias of keyAliases[keyName]) {
            result |= keyPressedOnce[alias];
        }
    }
    else {
        result = keyPressedOnce[GetKeyCodeFromName(keyName)];
    }

    return result;
}

function GetKeyCodeFromName(keyName) {
    if (typeof(keyName) == "string" && keyName.length == 1) {
        return `Key${keyName.toUpperCase()}`;
    }
    else if (typeof(keyName) == "number") {
        return `Digit${keyName}`;
    }
    else {
        return keyName;
    }
}

window.addEventListener("keydown", OnKeyDown);
window.addEventListener("keyup", OnKeyUp);

export { KeyPressed, KeyPressedOnce, UpdateKeyPressedOnce, FlushKeyPressedOnce };
