# 移动端 API 功能范围

更新：2026-10-22。范围是四个 Tab 及原型中的患者、影像编辑、报告、组织和个人资料页面。
业务 HTTP 请求复用 `@xiehe/api-sdk`、生成 DTO 与 Stellarmesh 认证适配。没有新增后端路由。

| 模块 | 移动端接入的真实能力 |
| --- | --- |
| 工作台 / 动态 | dashboard stats、recent-activities；待处理影像列表 |
| 认证 / 个人资料 | 登录、恢复/刷新/退出、读取/修改本人资料、改密码、头像预签名分片 PUT / complete / delete |
| 患者 | patients list/get/create/update/delete；患者影像与报告分页；身份证号、医保号和紧急联系人 |
| 影像 | list/get/patient-list、缩略图、原始文件 GET、原始文件删除、rename、info/update（检查类型与团队）、assignable-teams |
| 上传 | 会话创建、原有签名 PUT、完成、状态确认；不以字节传完代替成功 |
| 标注 | annotation/save(expected_version)、annotation-history/list/get；绘图、点位拖动、手动绑定、标尺、撤销/重做 |
| AI | 原有 ai/predict 原始 JSON 协议，shared core 归一化测量/检测层/关键点；进入待保存草稿 |
| 报告 | report-generation/generate；reports list/get/create/update/delete；文字分享 |
| 团队 | my/search/create/update/apply；join-requests list/review/cancel；members list/update-role/remove；invite；本人 invitations my/respond |

## 数据约束

- 影像标注文档中的 reportText 与独立诊断报告记录属于两个现有持久化入口。前者随标注版本保存，后者通过报告 CRUD 保存。现有 API 没有可靠的 imageId → studyId 映射，不做伪关联。
- AI 替换前确认；完整替换可撤销；需要显式保存。网络失败保留旧草稿，409 保留修改并阻止静默覆盖。
- TIFF 只请求服务端预览，原图坐标从文档或模型获得；PNG/JPEG 使用原图。其他历史格式可管理元数据及原始文件，不开放预览、编辑或新上传。
- 头像和影像 PUT 不携带 API 令牌，必须有 ETag 才调用完成接口。原有对象存储接口未改动。
- 团队角色/移除保护复用 access-core；邀请等操作只在用户点击对应按钮后请求，开发验证未向真实用户发送邀请。

## 明确不接入的范围

- 用户暂缓：同步数据和批量操作。
- 当前没有完整真实后端契约：报告审核/驳回/审核记录、报告模板、PDF/Word 导出、独立消息的已读状态/推送、撤回已发团队邀请。Web 的部分页面在本地模拟这些结果，移动端不复制该行为。
- 模型中心、系统运维和权限后台不属于本轮移动端页面范围。
- 原始 TIFF 解码、原生窗宽窗位、离线同步、自动保存及应用被系统终止后的草稿恢复未实现。

## 验证方式

- 应用层测试覆盖 AI 替换/撤销、报告生成与版本保存、失败保留、请求锁、晚到响应、TIFF 原图尺寸和点位绑定。
- 真实 SDK 对本机 HTTP 测试服务器验证报告 CRUD、历史查询和团队操作的 URL、POST body、认证及空字段语义；对象存储测试验证分片字节、无认证 PUT 与 ETag 完成条件。
- Expo 浏览器在 393×852 下，用独立内存 API 与合成影像实际操作：登录、报告编辑/保存/重开、影像重命名、AI 测量→报告→标注保存→详情和历史回读、团队详情和编辑。
- 临时测试服务器位于 /tmp，不加入应用，没有演示账号、演示网关或测试路由留在生产路径。
- Android/iOS/Web 导出属于打包验证；不等同于真实设备触控、相册/相机、系统分享或真实后端账号验收。
