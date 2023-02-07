// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://wikidich3.com/truyen/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikidich3.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/jszip@3.1.5/dist/jszip.min.js
// @require      https://unpkg.com/file-saver@2.0.4/dist/FileSaver.min.js
// @require      https://unpkg.com/ejs@3.1.6/ejs.min.js
// @require      https://unpkg.com/jepub@2.1.4/dist/jepub.min.js
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?v=a834d46
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @inject-into  auto
// ==/UserScript==

(function ($, window, document) {
  'use strict';

  function main() {
    let chapterList = [];
    let endDownload = false;
    let ebookTitle = $('.cover-info div h2').text();
    let jepub = new jEpub();
    jepub
      .init({
        title: ebookTitle,
        author: $('.cover-info div p:nth-child(3) a').text(),
        publisher: location.host,
        description: 'not thing',
        tags: ['book'],
      })
      .uuid(location.protocol + '//' + location.host + location.pathname);

    $(document).ready(function () {
      var chapters = $('.chapter-name')
        .map(function () {
          var ch = $(this).find('.truncate');
          return {
            pathname: ch.attr('href'),
          };
        })
        .get();

      var location = 'https://wikisach.net';
      chapters = chapters.filter((chapter) => chapter !== undefined);
      loadChapter(location, chapters);
    });

    function loadChapter(location, chapters) {
      setTimeout(function () {
        if (chapters.length === 0) {
          saveEbook();
          return;
        }
        let pathname = location + chapters.shift().pathname;
        $.ajax({
          url: pathname,
          success: function (data) {
            jepub.add(
              $(data).find('.book-title').text(),
              $(data).find('#bookContentBody').text()
            );
            document.title = `[${chapterList.length}] Download`;

            loadChapter(location, chapters);
          },
          error: function (xhr, ajaxOptions, thrownError) {
            saveEbook();
            return;
          },
        });
      }, 1000);
    }

    function genEbook() {
      jepub
        .generate('blob', function (metadata) {
          console.log(
            'Đang nén <strong>' + metadata.percent.toFixed(2) + '%</strong>'
          );
        })
        .then(function (epubZipContent) {
          document.title = '[⇓] ' + ebookTitle;
          saveAs(epubZipContent, 'book.epub');
        })
        .catch(function (err) {
          console.error(err);
        });
    }

    function saveEbook() {
      if (endDownload) return;
      endDownload = true;
      console.log('Bắt đầu tạo EPUB');

      GM.xmlHttpRequest({
        method: 'GET',
        url: $('.material-placeholder img').attr('src'),
        responseType: 'arraybuffer',
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
  }

  main();
})(jQuery, window, document);
