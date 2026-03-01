var display = require("display");
var keyboard = require("keyboard");
var storage = require("storage");

var W = display.width();
var H = display.height();

var BG = display.color(0,0,0);
var FG = display.color(255,255,255);
var HI = display.color(80,150,255);
try {
    if (display.getBgColor) BG = display.getBgColor();
    if (display.getFgColor) FG = display.getFgColor();
    if (display.getPrimaryColor) HI = display.getPrimaryColor();
} catch(e) {}

var GRAY = display.color(100,100,100);
var RED = display.color(255,0,0);

var DIR = "/lock_for_bruce";
var DATA_FILE = DIR + "/data.json";
var LOG_FILE = DIR + "/logs.txt";

var state = "LOCK";
var input = "";
var tempCode = "";
var msg = "";
var baseKeys = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
var keys = baseKeys.slice();
var sel = 0;
var emptyOkCount = 0;
var exitApp = false;
var redraw = true;
var targetToggle = -1;

var db = {
    code: "",
    shuffle: false,
    delayEnabled: false,
    fails: 0
};

function simpleHash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h += (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24);
    }
    return (h >>> 0).toString(16);
}

function writeLog(event) {
    var entry = "[" + now() + "] " + event + "\n";
    try {
        var existing = "";
        try { existing = storage.read(LOG_FILE, false); } catch(e1) {}
        storage.write(LOG_FILE, existing + entry, "w");
    } catch(e2) {}
}

function applyShuffle() {
    keys = baseKeys.slice();
    if (!db.shuffle) return;
    var nums = keys.slice(0, 9);
    for (var i = nums.length - 1; i > 0; i--) {
        var j = Math.floor((now() % 1000 / 1000) * (i + 1));
        var t = nums[i];
        nums[i] = nums[j];
        nums[j] = t;
    }
    for (var k = 0; k < 9; k++) keys[k] = nums[k];
}

function loadData() {
    try {
        db = JSON.parse(storage.read(DATA_FILE, false));
        state = (db.code === "") ? "INIT" : "LOCK";
    } catch (e) { state = "INIT"; }
    applyShuffle();
}

function saveData() {
    storage.write(DATA_FILE, JSON.stringify(db), "w");
}

function handleWrongDelay() {
    if (!db.delayEnabled || db.fails < 3) return;
    var sec = 5;
    if (db.fails === 4) sec = 15;
    if (db.fails === 5) sec = 60;
    if (db.fails === 6) sec = 300;
    if (db.fails >= 7) sec = 1800;
    while (sec > 0) {
        display.drawFillRect(0, 0, W, H, BG);
        display.setTextColor(RED);
        display.drawString("Bruce is disabled", 10, H/2 - 20);
        display.setTextColor(FG);
        var m = sec >= 60 ? Math.ceil(sec/60) + " min" : sec + " sec";
        display.drawString("Try again in " + m, 10, H/2 + 10);
        delay(1000);
        sec--;
    }
    redraw = true;
}

function draw() {
    if (!redraw) return;
    redraw = false;
    display.drawFillRect(0, 0, W, H, BG);
    display.setTextColor(FG);
    display.setTextSize(2);

    var title = "LOCK";
    if (state === "INIT") title = "SET CODE";
    if (state === "CONFIRM_NEW") title = "RE-ENTER";
    if (state === "VERIFY" || state === "VERIFY_TOGGLE") title = "AUTH CODE";
    if (state === "SETTINGS") title = "SETTINGS";
    display.drawString(title, 10, 5);

    if (state !== "SETTINGS") {
        display.drawRect(10, 30, W - 20, 26, HI);
        var stars = "";
        for (var i = 0; i < input.length; i++) stars += "*";
        display.drawString(stars, 16, 36);

        var keyH = Math.floor((H - 72) / 4);
        var keyW = Math.floor((W - 20) / 3);

        for (var j = 0; j < keys.length; j++) {
            var x = 10 + (j % 3) * keyW;
            var y = 62 + Math.floor(j / 3) * keyH;
            if (j === sel) {
                display.drawFillRect(x+1, y+1, keyW-3, keyH-3, HI);
                display.setTextColor(BG);
            } else {
                display.drawRect(x+1, y+1, keyW-3, keyH-3, GRAY);
                display.setTextColor(FG);
            }
            display.drawString(keys[j], x + keyW/2 - 8, y + keyH/2 - 8);
        }
    } else {
        var opts = ["Shuffle: "+(db.shuffle?"ON":"OFF"), "Delay: "+(db.delayEnabled?"ON":"OFF"), "RFID Unlock", "Reset Code", "Version 0.1", "Back"];
        for (var k = 0; k < opts.length; k++) {
            if (k === sel) {
                display.drawFillRect(10, 35+k*22, W-20, 20, HI);
                display.setTextColor(BG);
            } else display.setTextColor(FG);
            display.setTextSize(1);
            display.drawString(opts[k], 16, 40+k*22);
        }
    }
    if (msg) {
        display.setTextColor(RED);
        display.setTextSize(1);
        display.drawString(msg, 10, H - 12);
    }
}

function confirm() {
    if (state === "INIT") {
        if (input.length >= 3) {
            tempCode = input;
            input = "";
            state = "CONFIRM_NEW";
            msg = "Repeat code";
        } else msg = "Min 3 digits!";
    }
    else if (state === "CONFIRM_NEW") {
        if (input === tempCode) {
            db.code = simpleHash(input);
            saveData();
            writeLog("CODE_CHANGED");
            input = ""; tempCode = ""; state = "LOCK"; applyShuffle();
            msg = "Code Saved!";
        } else {
            input = ""; tempCode = ""; state = "INIT";
            msg = "Mismatch!";
        }
    }
    else if (state === "VERIFY_TOGGLE") {
        if (simpleHash(input) === db.code) {
            if (targetToggle === 0) db.shuffle = !db.shuffle;
            if (targetToggle === 1) db.delayEnabled = !db.delayEnabled;
            saveData();
            applyShuffle();
            state = "SETTINGS";
            input = "";
            msg = "Updated!";
        } else {
            msg = "Wrong Code!";
            input = "";
            state = "SETTINGS";
        }
    }
    else if (state === "LOCK" || state === "VERIFY") {
        if (input.length === 0 && state === "LOCK") {
            emptyOkCount++;
            if (emptyOkCount >= 5) {
                emptyOkCount = 0; sel = 0; state = "SETTINGS";
            }
        } else if (simpleHash(input) === db.code) {
            if (state === "VERIFY") {
                state = "INIT"; input = ""; msg = "Verified!";
            } else {
                db.fails = 0; saveData();
                writeLog("LOGIN_SUCCESS");
                exitApp = true;
            }
        } else {
            db.fails++; saveData();
            writeLog("FAIL_#" + db.fails);
            msg = "Wrong!"; input = "";
            emptyOkCount = 0;
            handleWrongDelay();
        }
    }
    redraw = true;
}

loadData();

while (!exitApp) {
    if (keyboard.getPrevPress()) {
        msg = "";
        var m1 = (state === "SETTINGS" ? 6 : 12);
        sel = (sel - 1 + m1) % m1;
        redraw = true; delay(120);
    }
    if (keyboard.getNextPress()) {
        msg = "";
        var m2 = (state === "SETTINGS" ? 6 : 12);
        sel = (sel + 1) % m2;
        redraw = true; delay(120);
    }
    if (keyboard.getSelPress()) {
        msg = "";
        if (state === "SETTINGS") {
            if (sel === 0 || sel === 1) {
                targetToggle = sel;
                state = "VERIFY_TOGGLE";
                input = "";
            }
            else if (sel === 2) { msg = "RFID coming soon..."; }
            else if (sel === 3) { state = "VERIFY"; input = ""; sel = 0; }
            else if (sel === 5) { state = "LOCK"; sel = 0; applyShuffle(); }
            saveData();
        } else {
            var kv = keys[sel];
            if (kv === "del") input = input.slice(0, -1);
            else if (kv === "ok") confirm();
            else if (input.length < 8) { input += kv; emptyOkCount = 0; }
        }
        redraw = true; delay(150);
    }
    draw();
    delay(40);
}
