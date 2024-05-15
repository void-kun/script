// ==UserScript==
// @name         us downloader
// @version      0.0.1
// @description  try to take over the world!
// @author       Zrik

// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/jszip@3.1.5/dist/jszip.min.js
// @require      https://unpkg.com/file-saver@2.0.4/dist/FileSaver.min.js
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?v=a834d46
// @require      https://unpkg.com/ejs@3.1.6/ejs.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.3/jquery-ui.min.js
// @require      https://unpkg.com/jepub@2.1.0/dist/jepub.min.js

// @run-at       document-end
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function ($, window, document) {
"use strict";

// ================================================================
// ========================== Downloader ==========================
// ================================================================
$.widget("us.downloader", {
    options: {
        ui: {
        wrapper_class: null,
        component: null,
        },
        state: {
        general: {
            host: location.host,
            pathname: location.pathname,
            referrer: location.protocol + "//",
            pageName: document.title,
        },
        regularExp: {
            chapter: ["s*Chươngs*d+s?:.*[^<\n]", "g"], //eslint-disable-line
            novel: ["s*Tiểus*thuyếts?:.*[^<\n]", "g"], //eslint-disable-line
            chineseSpecialChars: [
            "[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]+",
            "gm",
            ],
            alphanumeric: ['s[a-zA-Z0-9]{6,8}(="")?s', "gm"], //eslint-disable-line
            alphabet: ["[A-Z]"],
            number: ["d+"], //eslint-disable-line
            buttons: ["([^(]+<button[^/]+</button>[^)]*)s*", "gi"], //eslint-disable-line
            eoctext: [
            "(ps:|hoan nghênh quảng đại bạn đọc quang lâm|Huyền ảo khoái trí ân cừu)",
            "i",
            ],
            breakline: ["\n", "g"],
            chapList: ['(?:href=")[^")]+(?=")', "g"],
        },
        },
    },
    _create: function () {
        // create ui
        let ui = this.options.ui;
        $(ui.wrapper_class).append(ui.component);
    },

    // clean content
    createRegExp: function (regExp) {
        if (!regExp.length) {
        return;
        }

        return new RegExp(regExp[0], regExp[1]);
    },
    cleanupHtml: function (html) {
        let options = this.options.state;

        html = html.replace(options.regularExp.chapter, "");
        html = html.replace(options.regularExp.novel, "");
        html = html.replace(options.regularExp.chineseSpecialChars, "");
        html = html.replace(
        options.regularExp.alphanumeric,
        function (key, attr) {
            if (attr) return " ";
            if (!isNaN(key)) return key;
            if (key.split(options.regularExp.alphabet).length > 2) return " ";
            if (key.split(options.regularExp.number).length > 1) return " ";
            return key;
        },
        );
        html = html.replace(options.regularExp.buttons, "");
        html = html.split(this.createRegExp(options.regularExp.eoctext))[0];
        html = html.replace("<br> <br>", "<br />");

        return "<div>" + html + "</div>";
    },
    generateUUID: function () {
        var d = new Date().getTime();
        var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == "x" ? r : (r & 0x7) | 0x8).toString(16);
        },
        );

        return uuid;
    },

    // logger
    _error: function (msg) {
        console.error(`[${(new Date()).toUTCString()}] - [ERROR]: ${msg}`);
    },
    _info: function (msg) {
        console.info(`[${(new Date()).toUTCString()}] - [INFO]: ${msg}`);
    },
});

})(jQuery, window, document);
  