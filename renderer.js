"use strict";

/**
 * Lambda@Edge: Origin Request trigger
 *
 * オリジンを見に行く時に起動
 *
 * ヘッダをチェックして、対象ならhtmlをDynamic renderingして返す
 */
const HTTP_HEAD_NEED_DR = "x-need-dynamic-render";
const S3_ENDPOINT =
  "http://xxxxxxxxxx.s3-website-ap-northeast-1.amazonaws.com";
const BASE_URL = "https://xxxxxxxxxx";

module.exports.run = async (event, context, callback) => {
  try {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    if (
      headers[HTTP_HEAD_NEED_DR] == null ||
      headers[HTTP_HEAD_NEED_DR][0].value !== "true"
    ) {
      console.log("Skip cause not needed");
      return callback(null, request);
    }

    return callback(null, {
      status: "200",
      statusDescription: "OK",
      headers: {
        "cache-control": [
          {
            key: "Cache-Control",
            value: "max-age=100"
          }
        ],
        "content-type": [
          {
            key: "Content-Type",
            value: "text/html"
          }
        ],
        "content-encoding": [
          {
            key: "Content-Encoding",
            value: "UTF-8"
          }
        ]
      },
      body: "<!doctype html>" + (await getContent(request))
    });
  } catch (err) {
    return callback(err);
  }
};

async function getContent(request) {
  const chromium = require('chrome-aws-lambda');

  function stripPage() {
    // Strip only script tags that contain JavaScript (either no type attribute or one that contains "javascript")
    const elements = document.querySelectorAll(
      'script:not([type]), script[type*="javascript"], link[rel=import]'
    );
    for (const e of Array.from(elements)) {
      e.remove();
    }
  }

  function injectBaseHref(origin) {
    const base = document.createElement("base");
    base.setAttribute("href", origin);

    const bases = document.head.querySelectorAll("base");
    if (bases.length) {
      // Patch existing <base> if it is relative.
      const existingBase = bases[0].getAttribute("href") || "";
      if (existingBase.startsWith("/")) {
        bases[0].setAttribute("href", origin + existingBase);
      }
    } else {
      // Only inject <base> if it doesn't already exist.
      document.head.insertAdjacentElement("afterbegin", base);
    }
  }

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.goto(`${S3_ENDPOINT}${request.uri}`, {
    waitUntil: "networkidle0"
  });

  await page.evaluate(stripPage);
  await page.evaluate(injectBaseHref, BASE_URL);
  let html = await page.evaluate("document.firstElementChild.outerHTML");

  await browser.close();
  return html;
}
