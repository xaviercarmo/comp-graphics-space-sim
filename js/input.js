const KeyPressed = {};

function OnKeyDown(event) {
    if (KeyPressed[event.key] != undefined) {
        KeyPressed[event.key]++;
    }
    else {
        KeyPressed[event.key] = 1;
    }
}

function OnKeyUp(event) {
    KeyPressed[event.key] = 0;
}

export { KeyPressed, OnKeyDown, OnKeyUp };
