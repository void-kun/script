// ==UserScript==
// @name         Metruyenchu
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       Zrik
// @match        https://metruyencv.com/truyen/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=metruyencv.com
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

  $(document).ready(function () {
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
        console.error(`[${new Date().toUTCString()}] - [ERROR]: ${msg}`);
      },
      _info: function (msg) {
        console.info(`[${new Date().toUTCString()}] - [INFO]: ${msg}`);
      },
    });

    // ================================================================
    // =================== Metruyenchu Downloader =====================
    // ================================================================
    $.widget("us.mtcDownloader", $.us.downloader, {
      options: {
        ui: {
          wrapper_class: ".space-x-4.mb-6",
          component: $(`<button class=\"relative border border-title rounded px-2 py-1 text-title\">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon"><use href="#icon-8b3be0f9f47bafaac814c0f8bd47d7fb"></use></svg>
                                <span class="hidden sm:inline-flex">Download</span>
                            </span>
                       </button>`),
        },
        state: {
          classes: {
            title: ".font-semibold.text-lg.text-title",
            author: ".mb-6.text-gray-500",
            description: "#synopsis",
            tags: ".leading-10.space-x-4",
          },
          chapters: null,
          book_info: null,
          download_timeout_max: 1600, // miliseconds
          download_timeout_default: 100, // miliseconds
          download_timeout: 100, // miliseconds
          jepub: new jEpub(),
          book_img: $(".w-44.h-60.shadow-lg.rounded.mx-auto").attr("src"),
          xhr: {
              chapter: {
                  url: "https://backend.metruyencv.com/api/chapters",
              },
              content: {
                  url: null,
              }
          }
        },
      },
      _create: function () {
        this._super();

        // load book info
        this.options.state.book_info = this.load_book_info();

        // initialize jepub object
        this.options.state.jepub
          .init({ ...this.options.state.book_info, publisher: location.host })
          .uuid(this.generateUUID());

        // handle click event
        this.options.ui.component.one("click", (event) => {
          event.preventDefault();
          this.download_click(event, this);
        });
      },
      download_click: async function (event, self) {
        console.clear();
        document.title = "[...] Vui lòng chờ trong giây lát";

        // get list chapters
        self.options.state.chapters = await self.load_chapter_info();
        console.log("load chapter: ", self.options.state.chapters);

        // extract chapter and add to jepub
        self.load_chapter_content();
      },
      load_book_info: function () {
        const classes = this.options.state.classes;
        const book_info = {
          title: $(classes.title).text(),
          author: $(classes.author).text(),
          description: $(classes.description).text(),
          tags: $(classes.tags).text(),
        };

        return book_info;
      },
      load_chapter_info: async function () {
          const self = this
          const chapter_url = this.options.state.xhr.chapter.url;
          const book_id = $(".relative.border.border-title.rounded.px-2.py-1.text-title")[0]
                           .attributes["data-x-data"]
                           .value
                           .match(/\d/g)
                           .join("");

          const res = await $.ajax({
            url: `${chapter_url}?filter[book_id]=${book_id}&filter[type]=published`,
            error: function (err) {
             console.log(err)
             return [];
            },
          });

          const chapters = [];
          if (res.success) {
              res.data.forEach((item) => {
                  chapters.push({
                      pathname: `${location.pathname}/chuong-${item.index}`,
                      id: item.index
                  });
              });
          }

          return chapters;
      },
      load_chapter_content: function () {
        const self = this;
        const chapters = this.options.state.chapters;
        const download_timeout = this.options.state.download_timeout;
        const location = this.options.state.location;
        const jepub = this.options.state.jepub;

        setTimeout(function () {
          if (chapters.length === 0) {
            self.save_ebook();
            return;
          }
          let current_chapter = chapters[0];
          self._info(current_chapter.pathname);
          $.ajax({
            url: current_chapter.pathname,
            success: function (data) {
              const title = $(data).find(".flex.justify-center.space-x-2.items-center.px-2 > div > h2").html();
              const content = $(data).find("#chapter-detail > .break-words:nth-child(1)").html();

              jepub.add(title, self.cleanupHtml(content));
              document.title = `[${current_chapter.id}] Downloaded`;
              self._info(
                "Timeout: " + download_timeout,
                "for chapter: " + title,
              );

              // Shift the chapter loaded
              chapters.shift();
              self.calc_timeout(-self.options.state.download_timeout_default);
              self.load_chapter_content();
            },
            error: function () {
              self._error("reload this chapter");
              self.calc_timeout(self.options.state.download_timeout_max);

              self.load_chapter_content();
            },
          });
        }, download_timeout);
      },
      generate_ebook: function () {
        const state = this.options.state;

        state.jepub
          .generate("blob", function (metadata) {
            console.log(metadata);
          })
          .then(function (epubZipContent) {
            document.title = "[⇓] " + state.book_info.title;
            saveAs(epubZipContent, `${state.book_info.title}.epub`);
          })
          .catch(function (err) {
            this._error(err);
          });
      },
      save_ebook: function () {
        const self = this;
        const state = this.options.state;
        this._info(" === Bắt đầu tạo EPUB === ");

        GM.xmlHttpRequest({
          method: "GET",
          url: state.book_img,
          responseType: "arraybuffer",
          onload: function (response) {
            try {
              state.jepub.cover(response.response);
            } catch (err) {
              self._error(err);
            }
            self.generate_ebook();
          },
          onerror: function (err) {
            self._error(err);
            self.generate_ebook();
          },
        });
      },
      calc_timeout: function (gap) {
        if (
          gap < 0 &&
          this.options.state.download_timeout <=
            this.options.state.download_timeout_default
        ) {
          this.options.state.download_timeout =
            this.options.state.download_timeout_default + 0;
        } else if (gap >= this.options.state.download_timeout_max) {
          this.options.state.download_timeout = gap;
        } else {
          this.options.state.download_timeout += gap;
        }
      },
    });

    $(this).mtcDownloader();
  });
})(jQuery, window, document);
