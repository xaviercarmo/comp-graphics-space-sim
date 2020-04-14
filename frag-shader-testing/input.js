const KeyPressed = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0, k: 0, l: 0, m: 0, n: 0, o: 0,
                     p: 0, q: 0, r: 0, s: 0, t: 0, u: 0, v: 0, w: 0, x: 0, y: 0, z: 0,
				     one: 0, two: 0, three: 0, four: 0, five: 0,
				     space: 0, ctrl: 0, shift: 0, alt: 0, esc: 0,
				     upArrow: 0, downArrow: 0, leftArrow: 0, rightArrow: 0
                   };

function OnKeyDown(event) {
    var e = event.keyCode;
    switch (e) {
		case 16:
			KeyPressed.shift = 1;
			break;
		case 17:
			KeyPressed.ctrl = 1;
			break;
		case 18:
			KeyPressed.alt = 1;
			break;
		case 27:
			if (KeyPressed.esc == 1){
				KeyPressed.esc = 0;
			}
			else {
				KeyPressed.esc = 1;
			}
			break;
		case 32:
			KeyPressed.space = 1;
			break;
		case 37:
			KeyPressed.leftArrow = 1;
			break;
		case 38:
			KeyPressed.upArrow = 1;
			break;
		case 39:
			KeyPressed.rightArrow = 1;
			break;
		case 40:
			KeyPressed.downArrow = 1;
			break;
		case 49:
			KeyPressed.one = 1;
			break;
		case 50:
			KeyPressed.two = 1;
			break;
		case 51:
			KeyPressed.three = 1;
			break;
		case 52:
			KeyPressed.four = 1;
			break;
		case 53:
			KeyPressed.five = 1;
			break;
		case 65:
			KeyPressed.a = 1;
			break;
		case 66:
			KeyPressed.b = 1;
			break;
		case 67:
			KeyPressed.c = 1;
			break;
		case 68:
			KeyPressed.d = 1;
			break;
		case 69:
			KeyPressed.e = 1;
			break;
		case 70:
			KeyPressed.f = 1;
			break;
		case 71:
			KeyPressed.g = 1;
			break;
		case 72:
			KeyPressed.h = 1;
			break;
		case 73:
			KeyPressed.i = 1;
			break;
		case 74:
			KeyPressed.j = 1;
			break;
		case 75:
			KeyPressed.k = 1;
			break;
		case 76:
			KeyPressed.l = 1;
			break;
		case 77:
			KeyPressed.m = 1;
			break;
		case 78:
			KeyPressed.n = 1;
			break;
		case 79:
			KeyPressed.o = 1;
			break;
		case 80:
			KeyPressed.p = 1;
			break;
		case 81:
			KeyPressed.q = 1;
			break;
		case 82:
			KeyPressed.r = 1;
			break;
		case 83:
			KeyPressed.s = 1;
			break;
		case 84:
			KeyPressed.t = 1;
			break;
		case 85:
			KeyPressed.u = 1;
			break;
		case 86:
			KeyPressed.v = 1;
			break;
		case 87:
			KeyPressed.w = 1;
			break;
		case 88:
			KeyPressed.x = 1;
			break;
		case 89:
			KeyPressed.y = 1;
			break;
		case 90:
			KeyPressed.z = 1;
			break;
    }
}
function OnKeyUp(event) {
    var k = event.keyCode;
    switch (k) {
		case 16:
			KeyPressed.shift = 0;
			break;
		case 17:
			KeyPressed.ctrl = 0;
			break;
		case 18:
			KeyPressed.alt = 0;
			break;
		case 32:
			KeyPressed.space = 0;
			break;
		case 37:
			KeyPressed.leftArrow = 0;
			break;
		case 38:
			KeyPressed.upArrow = 0;
			break;
		case 39:
			KeyPressed.rightArrow = 0;
			break;
		case 40:
			KeyPressed.downArrow = 0;
			break;
		case 49:
			KeyPressed.one = 0;
			break;
		case 50:
			KeyPressed.two = 0;
			break;
		case 51:
			KeyPressed.three = 0;
			break;
		case 52:
			KeyPressed.four = 0;
			break;
		case 53:
			KeyPressed.five = 0;
			break;
		case 65:
			KeyPressed.a = 0;
			break;
		case 66:
			KeyPressed.b = 0;
			break;
		case 67:
			KeyPressed.c = 0;
			break;
		case 68:
			KeyPressed.d = 0;
			break;
		case 69:
			KeyPressed.e = 0;
			break;
		case 70:
			KeyPressed.f = 0;
			break;
		case 71:
			KeyPressed.g = 0;
			break;
		case 72:
			KeyPressed.h = 0;
			break;
		case 73:
			KeyPressed.i = 0;
			break;
		case 74:
			KeyPressed.j = 0;
			break;
		case 75:
			KeyPressed.k = 0;
			break;
		case 76:
			KeyPressed.l = 0;
			break;
		case 77:
			KeyPressed.m = 0;
			break;
		case 78:
			KeyPressed.n = 0;
			break;
		case 79:
			KeyPressed.o = 0;
			break;
		case 80:
			KeyPressed.p = 0;
			break;
		case 81:
			KeyPressed.q = 0;
			break;
		case 82:
			KeyPressed.r = 0;
			break;
		case 83:
			KeyPressed.s = 0;
			break;
		case 84:
			KeyPressed.t = 0;
			break;
		case 85:
			KeyPressed.u = 0;
			break;
		case 86:
			KeyPressed.v = 0;
			break;
		case 87:
			KeyPressed.w = 0;
			break;
		case 88:
			KeyPressed.x = 0;
			break;
		case 89:
			KeyPressed.y = 0;
			break;
		case 90:
			KeyPressed.z = 0;
			break;
    }
}

export { KeyPressed, OnKeyDown, OnKeyUp };
