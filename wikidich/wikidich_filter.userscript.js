// ==UserScript==
// @name         Wikidich filter
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       Zrik
// @match        https://truyenwikidich.net/tim-kiem*
// @match        https://truyenwikidich.net/tim-kiem*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikidich3.com
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  const a = document.querySelectorAll('.author-item');
  Array.prototype.slice
    .call(document.querySelectorAll('.book-list-wrapper .stats-col'))
    .map((ele, i) => {
      if (!ele['children'][0]['children'][1].textContent.match(/[mk]/)) {
        a[i].remove();
      }
    });
  
  const b = document.querySelectorAll('.book-item');
  Array.prototype.slice
  .call(document.querySelectorAll('.info-col .book-stats-box'))
  .map((ele, i) => {
    if (!ele['children'][0]['children'][1].textContent.match(/[mk]/)) {
      b[i].remove();
    }
  });
})();
