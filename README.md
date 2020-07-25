![](https://i.postimg.cc/6pYfMBv7/image.png)

# Cendertron

> Cendertron = Crawler + cendertron

Crawl AJAX-heavy client-side Single Page Applications (SPAs), deploying with docker, focusing on scraping requests(page urls, apis, etc.), followed by pentest tools(Sqlmap, etc.). Cendertron can be used for extracting requests(page urls, apis, etc.) from your Web 2.0 page.

[Cendertron](https://url.wx-coder.cn/HinPM) 是基于 Puppeteer 的 Web 2.0 动态爬虫与敏感信息泄露检测工具。其依托于 [xe-crawler](https://github.com/wx-chevalier/xe-crawler) 的通用爬虫、调度与缓存模型，新增了 Monkey Test 以及 Request Intercept 等特性，以期尽可能多地挖掘页面与请求。同时针对渗透测试的场景，Cendertron 内置了目录扫描、敏感文件扫描的能力，能够模拟用户实际在浏览器登录状态下的自定义字典爆破。Cendertron 在大量实践的基础上设置了自身的去重策略，能够尽可能地避免重复爬取，加快扫描速度。Cendertron 同时也是正在闭源开发的 [Chaos-Scanner](https://github.com/wx-chevalier/Chaos-Scanner) 模块化安全扫描解决方案的一部分，为基础扫描与智能扫描提供前置输入。

![](https://i.postimg.cc/8PcCmt6t/image.png)

# Nav | 导航

系统设计相关请参考 [系统设计](./系统设计.md)，更多子模块参考：

- [cendertron-bypass](https://github.com/BE-Kits/cendertron-bypass)

# Usage | 使用

## Locally Development | 本地开发

在本地开发中，我们只需要如正常的 Node 项目一样启动，其会使用 Puppeteer 内置的 Headless Chrome 来执行界面渲染操作：

```sh
$ git clone https://github.com/wx-chevalier/Chaos-Scanner
$ cd cendertron
$ yarn install
$ npm run dev
```

启动之后可以按提示打开浏览器界面：

![](https://i.postimg.cc/Tw8Y2cKc/image.png)

这里我们可以以 [DVWA](http://www.dvwa.co.uk/) 作为测试目标，在输入框内输入 `http://localhost:8082/` 然后执行爬取，即可得到如下结果：

```json
{
  "isFinished": true,
  "metrics": {
    "executionDuration": 116177,
    "spiderCount": 51,
    "depth": 4
  },
  "spiderMap": {
    "http://localhost:8082/vulnerabilities/csrf/": [
      {
        "url": "http://localhost:8082/vulnerabilities/view_source.php?id=csrf&security=low",
        "parsedUrl": {
          "host": "localhost:8082",
          "pathname": "/vulnerabilities/view_source.php",
          "query": {
            "id": "csrf",
            "security": "low"
          }
        },
        "hash": "localhost:8082#/vulnerabilities/view_source.php#idsecurity",
        "resourceType": "document"
      }
      // ...
    ]
  }
}
```

需要说明的是，因为 DVWA 是需要登录后爬取，因此如果想进行完整的测试请参考下文的 POST 方式创建任务。

## Deploy in Docker | 部署在 Docker 中

```sh
# build image
$ docker build -t cendertron .

# run as contaner
$ docker run -it --rm -p 3033:3000 --name cendertron-instance cendertron

# run as container, fix with Jessie Frazelle seccomp profile for Chrome.
$ wget https://raw.githubusercontent.com/jfrazelle/dotfiles/master/etc/docker/seccomp/chrome.json -O ~/chrome.json
$ docker run -it -p 3033:3000 --security-opt seccomp=$HOME/chrome.json --name cendertron-instance cendertron

# or
$ docker run -it -p 3033:3000 --cap-add=SYS_ADMIN --name cendertron-instance cendertron

# use network and mapping logs
$ docker run -d -p 3033:3000 --cap-add=SYS_ADMIN --name cendertron-instance --network wsat-network cendertron
```

## Deploy as FC | 以函数式计算方式部署

Install cendertron from NPM:

```sh
# set not downloading chromium
$ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

$ yarn add cendertron
# or
$ npm install cendertron -S
```

Import `Crawler` and use in your code:

```js
const crawler = new Crawler(browser, {
  onFinish: () => {
    callback(crawler.spidersRequestMap);
  },
});

let pageUrl =
  evtStr.length !== 0 && evtStr.indexOf("{") !== 0
    ? evtStr
    : "https://www.aliyun.com";

crawler.start(pageUrl);
```

If you want to use it in Alibaba Function Computing Service, [cendertron-fc](./deploy/fc) provides simple template.

## Deploy as Cluster | 分布式集群模式部署

```yml
version: "3"
services:
  crawlers:
    image: cendertron
    ports:
      - "${CENDERTRON_PORT}:3000"
    deploy:
      replicas: 2
    volumes:
      - wsat_etc:/etc/wsat

volumes:
  wsat_etc:
    driver: local
    driver_opts:
      o: bind
      type: none
      device: /etc/wsat/
```

```json
{
    "redis": {
      "host": "x.x.x.x",
      "port": 6379,
      "password": "xx-xx-xx-xx"
    }
  }
}
```

```sh
# 创建服务
> docker stack deploy wsat --compose-file docker-compose.yml --resolve-image=changed

# 指定实例
> docker service scale wsat_crawlers=5
```

# About

## Test Target

- http://testphp.vulnweb.com/AJAX/#
- http://demo.aisec.cn/demo/
- https://jsonplaceholder.typicode.com/
- [DVWA](http://www.dvwa.co.uk/)

## Roadmap

- [x] 将自定义参数的爬虫全部划归到 POST 中，POST 请求会进行 Body 存储与匹配
- [x] 引入自定义的 BrowserEventEmitter，全局仅注册单个 Browser 监听器
- [x] add https://github.com/winstonjs/winston as logger
- https://123.125.98.210/essframe
- [ ] 分别添加调度器级别与爬虫级别的监控

## Motivation & Credits

- [gremlins.js](https://github.com/marmelab/gremlins.js/): Monkey testing library for web apps and Node.js

- [weakfilescan](https://github.com/ring04h/weakfilescan): 基于爬虫，动态收集扫描目标相关信息后进行二次整理形成字典规则，利用动态规则的多线程敏感信息泄露检测工具，支持多种个性化定制选项。

- [Retire.js #Project#](https://github.com/RetireJS/retire.js): Scanner detecting the use of JavaScript libraries with known vulnerabilities.

- [Awesome Node.js for pentesters #Project#](https://github.com/jesusprubio/awesome-nodejs-pentest): ☠️ Delightful Node.js packages useful for penetration testing, exploiting, reverse engineer, cryptography ...

- [pentest-tool-lite #Project#](https://github.com/juffalow/pentest-tool-lite): Test your page against basic security, html, wordpress, ... check lists
