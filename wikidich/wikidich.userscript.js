// ==UserScript==
// @name         Wikidich
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       Zrik
// @match        https://truyenwikidich.net/truyen/*
// @match        https://wikisach.net/truyen/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikidich3.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/jszip@3.1.5/dist/jszip.min.js
// @require      https://unpkg.com/file-saver@2.0.4/dist/FileSaver.min.js
// @require      https://unpkg.com/jepub@2.1.4/dist/jepub.min.js
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?v=a834d46
// @require      https://unpkg.com/ejs@3.1.6/ejs.min.js
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function ($, window, document) {
  "use strict";

  let chapterTimeout = 1000;

  function main() {
    // default values
    let ebookTitle = $(".cover-info div h2").text();
    let jepub = new jEpub();
    let chapterList = [];
    var chapters = [];
    var classNames = {
      downloadWrapper: ".control-btns",
      downloadButton: "btn waves-effect waves-light orange-btn",
    };

    var $download = $("<a></a>", {
      href: "#download",
      class: "btn waves-effect waves-light orange-btn",
      text: "⇓",
    });
    $download.insertAfter(".control-btns");
    $download.before("\r\n");
    $download.one("click", function (e) {
      e.preventDefault();
      document.title = "[...] Vui lòng chờ trong giây lát";

      jepub
        .init({
          title: ebookTitle,
          author: $(".cover-info div p:nth-child(3) a").text(),
          publisher: location.host,
          description: "not thing",
          tags: ["book"],
        })
        .uuid(location.protocol + "//" + location.host + location.pathname);

      this.chapters = $(".chapter-name")
        .map(function (id) {
          var ch = $(this).find(".truncate");
          if (ch.attr("href")) {
            return {
              pathname: ch.attr("href"),
              id: id + 1,
            };
          }
        })
        .get();
      this.chapters = this.chapters.filter((chapter) => chapter !== undefined);
      loadChapter(location.origin, this.chapters);
    });

    function loadChapter(location, chapters) {
      setTimeout(function () {
        if (chapters.length === 0) {
          saveEbook();
          return;
        }
        let currentChapter = chapters[0];
        $.ajax({
          url: location + currentChapter.pathname,
          success: function (data) {
            const title = $($(data).find(".book-title")[1]).html();
            const content = $(data).find("#bookContentBody").html();
            jepub.add(title, content);
            document.title = `[${currentChapter.id}] Download`;
            console.log("Timeout: " + chapterTimeout, "for chapter: " + title);
            // Shift the chapter loaded
            chapters.shift();
            loadChapter(location, chapters);
            calcTimeout(-500);
          },
          error: function () {
            console.log(
              `Error - increase timeout (1 second) : ${chapterTimeout} - reload this chapter`,
            );
            calcTimeout(2500);
            loadChapter(location, chapters);
          },
        });
      }, chapterTimeout);
    }

    function genEbook() {
      jepub
        .generate("blob", function (metadata) {
          console.log(
            "Đang nén <strong>" + metadata.percent.toFixed(2) + "%</strong>",
          );
        })
        .then(function (epubZipContent) {
          document.title = "[⇓] " + ebookTitle;
          saveAs(epubZipContent, `${ebookTitle}.epub`);
        })
        .catch(function (err) {
          console.error(err);
        });
    }

    function saveEbook() {
      console.log("Bắt đầu tạo EPUB");

      GM.xmlHttpRequest({
        method: "GET",
        url: $(".material-placeholder img").attr("src"),
        responseType: "arraybuffer",
        onload: function (response) {
          try {
            jepub.cover(response.response);
          } catch (err) {
            console.error(err);
          }
          genEbook();
        },
        onerror: function (err) {
          console.error(err);
          genEbook();
        },
      });
    }

    function calcTimeout(gap) {
      if (gap < 0 && chapterTimeout <= 500) {
        chapterTimeout = 500;
      } else if (gap >= 2500) {
        chapterTimeout = gap;
      } else {
        chapterTimeout += gap;
      }
    }
  }

  $(document).ready(function () {
    main();
  });
})(jQuery, window, document);
