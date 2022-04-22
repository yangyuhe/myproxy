const fs = require("fs");
const path = require("path");
const URL = require("url").URL;
//读取规则文件
let files = fs.readdirSync(path.resolve(__dirname, "rules"));
//支持的规则列表
let allRules = [];
let enableList = fs
  .readFileSync(path.resolve(__dirname, "rules/enable-list"), {
    encoding: "utf-8",
  })
  .trim()
  .split("\n")
  .map((item) => item + ".js");
files.forEach((file) => {
  if (enableList.includes(file)) {
    let filepath = path.resolve(__dirname, "rules/" + file);
    let rules = require(filepath);
    if (!Array.isArray(rules)) {
      rules.rules = [rules];
    }
    allRules = allRules.concat(rules);
  }
});

/**转换结果 */
function transfer(rule, sourceUrl) {
  if (typeof rule.fn !== "function") {
    let targetUrl = new URL(rule.to);
    let protocol = targetUrl.protocol;
    let leftPath = sourceUrl.slice(rule.from.length);
    return {
      hostname: targetUrl.hostname,
      pathname: targetUrl.pathname + leftPath,
      port: targetUrl.port,
      protocol,
    };
  } else {
    let res = rule.fn(sourceUrl);
    //如果返回local，则直接从本地文件读取
    if (res.local) {
      let content = fs.readFileSync(res.local, { encoding: "utf-8" });
      return { content, rule };
    }
    if (res.body) {
      return res;
    } else {
      let targetUrl = new URL(res.url);
      let protocol = targetUrl.protocol;
      return {
        hostname: targetUrl.hostname,
        pathname: targetUrl.pathname,
        port: targetUrl.port,
        protocol,
      };
    }
  }
}

/**
 * 匹配
 */
function isMatch(rule, url) {
  if (typeof rule.fn !== "function") {
    return (
      url.startsWith(rule.from) &&
      !(rule.excludes || []).some((item) => url.startsWith(item))
    );
  } else {
    return !!rule.fn(url);
  }
}

/**查找最匹配的规则 */
function findMatch(url) {
  let targetRule = null;
  allRules.forEach((rule, index) => {
    if (!isMatch(rule, url)) {
      return;
    }
    if (!targetRule) targetRule = rule;
    else {
      //如果有多条规则匹配，根据优先级来
      if (targetRule.priority <= rule.priority) {
        targetRule = rule;
      }
    }
  });
  return targetRule;
}
module.exports = {
  summary: "a rule to hack response",
  //发送请求的劫持
  *beforeSendRequest(requestDetail, responseDetail) {
    let targetRule = findMatch(requestDetail.url);
    if (!targetRule) return null;

    let newOption = Object.assign({}, requestDetail.requestOptions);

    let res = transfer(targetRule, requestDetail.url);

    //返回字符串则直接返回
    if (typeof res.content === "string") {
      return {
        response: {
          statusCode: 200,
          header: { "Access-Control-Allow-Origin": "*", ...res.rule.headers },
          body: res.content,
        },
      };
    }
    if (res.body) {
      return {
        response: { ...res, header: res.headers },
      };
    }

    if (res.hostname) {
      newOption.hostname = res.hostname;
      newOption.headers.Host = res.hostname;
    }
    if (res.port) {
      newOption.port = res.port;
    }
    if (res.pathname) {
      newOption.path = res.pathname;
    }

    return {
      protocol: res.protocol,
      requestOptions: newOption,
    };
  },
  //接收结果的劫持
  *beforeSendResponse(requestDetail, responseDetail) {
    const newResponse = responseDetail.response;
    let targetRule = findMatch(requestDetail.url);
    if (!targetRule) return null;

    let headers = {};
    if (typeof targetRule.fn === "function") {
      headers = targetRule.fn(requestDetail.url).headers || {};
    } else {
      headers = targetRule.headers || {};
    }

    Object.assign(newResponse.header, headers || {});

    return {
      response: newResponse,
    };
  },
  //发送websocket请求的劫持
  beforeSendWsRequest(wsReq) {
    let targetRule = null;
    allRules.forEach((rule) => {
      if (
        typeof rule.from === "string" &&
        (rule.from.startsWith("ws:") || rule.from.startsWith("wss:"))
      ) {
        let url = new URL(rule.from);
        if (
          wsReq.hostName === url.hostname &&
          wsReq.path.startsWith(url.pathname) &&
          wsReq.protocol === url.protocol.slice(0, -1)
        ) {
          if (!targetRule) targetRule = rule;
          else {
            if (targetRule.priority < rule.priority) {
              targetRule = rule;
            }
          }
        }
      }
    });
    if (targetRule) {
      let url = new URL(targetRule.to);
      wsReq.hostName = url.hostname;
      wsReq.protocol = url.protocol.slice(0, -1);
      wsReq.port = url.port;
    }
    return wsReq;
  },
};
