const AnyProxy = require("@mi/anyproxy");

// 配置127.0.0.1:8001为全局http代理服务器
module.exports.enableProxy = function (port = 8001) {
  AnyProxy.utils.systemProxyMgr.enableGlobalProxy("127.0.0.1", port);
  AnyProxy.utils.systemProxyMgr.enableGlobalProxy("127.0.0.1", port, "https");
};

// 关闭全局代理服务器
module.exports.closeProxy = function () {
  AnyProxy.utils.systemProxyMgr.disableGlobalProxy();
  AnyProxy.utils.systemProxyMgr.disableGlobalProxy("https");
};

/**如果证书不存在就安装证书 */
module.exports.installCERT = function () {
  const exec = require("child_process").exec;

  if (!AnyProxy.utils.certMgr.ifRootCAFileExists()) {
    AnyProxy.utils.certMgr.generateRootCA((error, keyPath) => {
      // let users to trust this CA before using proxy
      if (!error) {
        const certDir = require("path").dirname(keyPath);
        console.log("The cert is generated at", certDir);
        const isWin = /^win/.test(process.platform);
        if (isWin) {
          exec("start .", { cwd: certDir });
        } else {
          exec("open .", { cwd: certDir });
        }
      } else {
        console.error("error when generating rootCA", error);
      }
    });
  }
};
