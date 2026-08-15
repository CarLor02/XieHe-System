# 影像中心缩略图访问

影像中心只通过批量地址接口请求 `variant: "thumbnail"`。标注查看器、裁剪、下载和导出
继续使用 `original`，两者不允许隐式互相回退。

访问 URL 缓存 key 同时包含影像 ID、variant 和原图版本。原图 ETag 变化后，两种 variant
都会产生新缓存身份；按影像 ID 清理缓存时也会同时清除两类 URL。

缩略图还未完成时，预览队列按 1、2、4、8、16 秒重试。重试耗尽，或者后端返回
`thumbnail_failed`、`thumbnail_unsupported` 后，卡片稳定显示占位图，不下载原图。
真正进入 `<img>` 的 URL 继续受有序并发窗口控制，因此页面按当前影像顺序优先下载。

卡片使用 `aspect-[3/4]`、黑色背景和 `object-contain`。缩略图保持原始构图和宽高比，
不会用 `object-cover` 裁掉医学影像内容。
