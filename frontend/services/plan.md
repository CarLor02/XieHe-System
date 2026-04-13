### “不补新 service”的前提下，当前仍保留直连的 page 有：

- frontend/app/reports/page.tsx
- frontend/app/reports/export/page.tsx
- frontend/app/model-center/page.tsx
- frontend/app/model-center/settings/page.tsx
- frontend/app/permissions/users/page.tsx
- frontend/app/permissions/roles/page.tsx
- frontend/app/imaging/viewer/image-viewer/index.tsx
- frontend/app/sync/page.tsx 里对外部同步服务的 fetch(...)

### 接口混用问题
- image 的标注可以从 api/v1/image-files/{image_id} 返回的 annotations 取
- image 的标注也可以从 api/v1/measurements/{image_id} 取
- 两个接口取到的字段不完全一致
- 上传标注需要用 measurements 那个接口
- 用 measurements 接口上传, 那么下次从 image 接口的 annotations 字段 能取到更新后的吗?