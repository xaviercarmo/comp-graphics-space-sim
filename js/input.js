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

function OnMouseDown(event) {
    switch (event.button) {
        case 0:
            keyPressed["leftMouse"] = 1;
            break;
        case 1:
            keyPressed["middleMouse"] = 1;
            break;
        case 2:
            keyPressed["rightMouse"] = 1;
            break;
        default:
            console.log(event);
    }
}

function OnMouseUp(event) {
    switch (event.button) {
        case 0:
            keyPressed["leftMouse"] = 0;
            break;
        case 1:
            keyPressed["middleMouse"] = 0;
            break;
        case 2:
            keyPressed["rightMouse"] = 0;
            break;
    }
}

function OnContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
}

function OnKeyDown(event) {
    keyPressed[event.code] = 1;

    if (event.code[0] != "F") {
        event.preventDefault();
        event.stopPropagation();
    }
}

function OnKeyUp(event) {
    keyPressed[event.code] = 0;

    event.preventDefault();
    event.stopPropagation();
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
window.addEventListener("mousedown", OnMouseDown); //moisueupp
window.addEventListener("mouseup", OnMouseUp); //moisueupp
window.addEventListener("contextmenu", OnContextMenu);

export { KeyPressed, KeyPressedOnce, UpdateKeyPressedOnce, FlushKeyPressedOnce };
