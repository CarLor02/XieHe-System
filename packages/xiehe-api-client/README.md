# @xiehe/api-client

跨 Web 与 Expo 复用的 API 协议和 Axios 传输包。

- `contracts` 定义 Envelope、错误和分页协议。
- `application` 定义平台无关的 HTTP 与会话端口。
- `axios` 提供可注入 Token、刷新流程和日志器的 Axios 实现。

包内不读取环境变量、浏览器存储，也不负责页面跳转。平台应用必须在
composition root 中注入这些能力。
