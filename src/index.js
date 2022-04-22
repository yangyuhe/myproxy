const AnyProxy = require("@mi/anyproxy");
const utils = require("./utils");

//安装证书
utils.installCERT();

//代理端口
const PORT = 8001;
//ui界面端口
const UI_PORT = 8002;

const options = {
  port: PORT,
  rule: require("./rules.js"),
  webInterface: {
    enable: true,
    webPort: UI_PORT,
  },
  throttle: 10000,
  forceProxyHttps: true,
  wsIntercept: true, // 开启websocket代理
  silent: false,
};
const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on("ready", () => {
  /* */
});
proxyServer.on("error", (e) => {
  /* */
});

//开启本地http(s)代理
utils.enableProxy(PORT);

//启动代理服务器
proxyServer.start();

//接受ctrl+c
process.on("SIGINT", () => {
  proxyServer.close();
  //恢复本地http(s)代理设置
  utils.closeProxy();
  process.exit(0);
});
