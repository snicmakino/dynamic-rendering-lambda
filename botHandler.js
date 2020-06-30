"use strict";

const redirectUrls = {};

const botPattern =
    "Googlebot|bingbot|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator";

const excludeSuffixes = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "css",
    "js",
    "json",
    "txt",
    "ico",
    "map"
];

const HTTP_HEAD_NEED_DR = "x-need-dynamic-render";

exports.run = async (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    if (redirectUrls[request.uri]) {
        const response = {
            status: "301",
            statusDescription: "Moved Permanently",
            headers: {
                location: [
                    {
                        key: "Location",
                        value: redirectUrls[request.uri]
                    }
                ]
            }
        };
        callback(null, response);
    }

    if (isCrawler(headers) && isHtml(request.uri)) {
        request.headers[HTTP_HEAD_NEED_DR] = [
            {
                key: "X-Need-Dynamic-Render",
                value: "true"
            }
        ];
    }

    console.log(`uri: "${request.uri}"`);
    callback(null, request);
};

const isCrawler = headers => {
    var re = new RegExp(botPattern, "i");
    let isCrawler = re.test(headers["user-agent"][0]["value"]);

    console.log(`crawler: "${isCrawler}"`);
    return isCrawler;
};

const isHtml = uri => {
    let suffix =
        uri == null || uri == "/"
            ? ""
            : uri
                .split(".")
                .pop()
                .toLowerCase();
    let result = !excludeSuffixes.some(es => es === suffix);
    console.log(`maybeHtml: "${result}"`);

    return result;
};
