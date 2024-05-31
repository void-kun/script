// ==UserScript==
// @name         Ntruyen
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       Zrik
// @match        https://gicungco.org/truyen/*
// @icon         https://gicungco.org//images/logo-gcc.png
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
        },
      },
      _create: function () {
        // create ui
        let ui = this.options.ui;
        $(ui.wrapper_class).append(ui.component);
      },

      // clean content
      cleanupHtml: function (html) {
        html = html.replace(/<div[\s\S]*\/div>/, "");

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
      delay: function (ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
          wrapper_class: ".story-info > .actions",
          component: $(`<button class=\"button button-primary\">
                          Download
                       </button>`),
        },
        state: {
          classes: {
            title: ".story-title > h1",
            author: ".story-title > span > a",
            description: "#work-information",
            tags: ".genres",
          },
          chapters: null,
          book_info: null,
          download_timeout_max: 1600, // miliseconds
          download_timeout_default: 100, // miliseconds
          download_timeout: 100, // miliseconds
          jepub: new jEpub(),
          book_img: $(".story-main > .flexbox > .cover > img").attr("src"),
          xhr: {
            chapter: {
              url: "/ajax/load_chapter",
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
        if (self.options.state.chapters.length > 0) {
            self.load_chapter_content();
        }
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
        const chapters = [];
        // const chapter_url = this.options.state.xhr.chapter.url;

        var paged = 1;
        var chapterPage = async function () {
          await API.post(
            '/ajax/load_chapter',
            null,
            { story_id: storyID, page: paged },
            false,
            async function (data) {
                data = JSON.parse(data);
                let start_idx = chapters.length;

                // extract chapters
                let chapter_li = data.chapters.split("</li>")
                chapter_li = chapter_li
                    .filter(ele => ele.length > 10)
                    .map(item => /href=\"(.*)\">/.exec(item))
                    .filter(item => item.length > 1)
                    .map((item, id) => ({pathname: item[1], id: start_idx + id + 1}));

                chapters.push(...chapter_li)
                // load next chapter page
                if (data.total > chapters.length) {
                    await chapterPage(++paged);
                }
            }
          );
        };
        await chapterPage();
        await this.delay(4000);

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
              const title = $(data).find(".chapter-infos > center").html();
              const content = $(data).find(".chapter-infos > #chapter-content").html();

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
