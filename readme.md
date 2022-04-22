### 为什么使用myproxy?
方便我们将线上资源代理到本地开发环境，进行线上问题调试和本地开发。

### 功能
- 支持将http(s)请求重定向到其他url
- 支持将http(s)请求代理到本地文件
- 支持自定义https(s)请求的响应内容
- 支持将websocket请求代理到其他的url
### myproxy使用说明
myproxy基于[anyproxy](https://github.com/alibaba/anyproxy)提供的强大功能，提供了一些快捷的配置方法，让你可以更加轻松的代理本地网络请求。

1. 开始使用
   1. 克隆或者下载这个项目
   2. `yarn`安装依赖
   3. 在rules文件夹下面添加自己的配置
   4. npm start启动项目

> myproxy开启了https代理，因此会在程序启动的时候检查和尝试安装自己的签名。安装签名遇到问题可以查看[anyproxy的官网指南](https://github.com/alibaba/anyproxy/tree/master/docs-src/cn)

2. 遵守的约定
   1. 建议一个规则文件代表一个站点的代理
   2. 规则文件必须放在rules文件夹下
   3. 规则文件是以js文件的形式存在
   4. 规则文件需要在enable-list文件中开启
3. 规则文件书写  
   规则文件是一个js文件，从中导出一个规则或者一组规则，如下
   ```javascript
   module.exports={
     //配置项
   }
   ```
   或者
   ```javascript
   module.exports=[{
     //配置项
   }]
   ```
4. 简单的配置方式
   ```typescript
   {
     //发出的请求url（匹配前缀）
     from:string;
     //重定向到的url
     to:string;
     //排除的url（匹配前缀）
     excludes:string[];
     //优先级，当多个匹配规则同时被匹配上时使用该字段决定使用哪个规则
     priority:number;
     //指定返回的http响应头
     headers:{
       //指定的http响应头，例如：
       //'X-Proxy-By':'AnyProxy'
     }
   }
   ```
   举例

     1. 
   ```typescript
   module.exports={
     from:'https://www.demo.com/';
     //重定向到的url
     to:'http://localhost:3001/';
     //排除的url（匹配前缀）
     excludes:['https://www.demo.com/api'];
     headers:{
       'foo-x':'bar'
     },
     //优先级，当多个匹配规则同时被匹配上时使用该字段决定使用哪个规则
     priority:1;
   }
   ```
   作用：
   - 这里的请求被重定向
   ``https://www.demo.com/static/main.js => http://localhost:3001/staic/main.js``  
   并且http响应头会包含'foo-x':'bar'
   - 下面的请求不受影响  
   ``https://www.demo.com/api/user => https://www.demo.com/api/user``

   2. 
   ```typescript
   module.exports={
    from: "wss://10.224.198.100/",
    to: "ws://localhost:3000/",
    priority: 2,
   }
   ```
   作用：将`wss://10.224.198.100/`的websocket请求到本地3000的端口, 常用于webpack本地开发时的热刷新功能。

5. 高级配置方式  
   高级方式接受一个fn的函数，在函数中自己判断是否匹配，如果不匹配返回false；如果匹配的话，可以返回一个Result对象
   ```typescript
   {
     //参数是请求的url
     //返回值：如果url匹配不上
     fn:(url:string)=>false|Result
   }
   ```
    Result对象的解释如下：  
    ```typescript
    //Result对象可以是以下类型中的一种
    type Result=LocalMode|BodyMode|UrlMode

    interface LocalMode{
      //local标识一个本地路径的字符串，local字段用以指定使用本地的某个文件来代替某个请求的响应
      local:string;
      headers:{
        //http响应头
      }
    }
    interface BodyMode{
      header:{
        //http响应头
      },
      //响应码
      statusCode:number,
      //返回的字符串
      body:string;
    }
    interface UrlMode{
      //重定向的url
      url:string;
      headers:{
        //http响应头
      }
    }
    ```
    举例：

    1. 下面的设置，将对 *https://www.demo.com/static/10fdd0a.js* 的资源请求代理到了本地的1.js文件。
    ```javascript
    module.exports=[{
      fn(url){
        if(url==='https://www.demo.com/static/10fdd0a.js'){
          return {
            local:'/{localpath}/1.js',
            headers:{
              'Content-Type':'application/javascript'
            }
          }
        }
        return false;
      }
    }]
    ```
    2. 下面的设置,将对 *https://www.demo.com/user/info* 的接口请求代理成了自定义的一段json。
   ```javascript
    module.exports=[{
      fn(url){
        if(url==='https://www.demo.com/user/info'){
          return {
            header:{
              'Content-Type':'application/json'
            },
            body:JSON.stringify({
              name:'Jerry'
            }),
            statusCode:200
          }
        }
        return false;
      }
    }]
    ```
    3. 下面的设置,将对 *https://www.demo.com/static/10fdd0a.js* 的资源请求代理到了本地3001端口的main.js。
   ```javascript
    module.exports=[{
      fn(url){
        if(url==='https://www.demo.com/static/10fdd0a.js'){
          return {
            url:'http://localhost:3001/static/main.js'
          }
        }
        return false;
      }
    }]
    ```