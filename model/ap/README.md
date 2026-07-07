# AP AI Measurement Service

正位 X 光片 AI 测量服务。服务按 DDD 分层组织：

- `interfaces/http/`：FastAPI 入口，只暴露生产接口。
- `application/`：AI 测量编排，供 HTTP 与本地批量脚本共用。
- `domain/`：测量派生、Cobb v2 计算、导出列定义。
- `infrastructure/`：YOLO 模型加载与推理后处理。

## Production API

```bash
POST /api/measurement
```

请求体：

```json
{
  "bucket": "medical-image-files",
  "object_key": "path/to/image.png",
  "image_id": "IMG001"
}
```

服务会从对象存储读取图片，一次性完成模型推理、关键点生成和测量项派生。旧的 `/predict`、`/detect_keypoints`、`/detect_keypoints_object` 不再暴露。

## Local Run

从仓库根目录运行：

```bash
cd model
PYTHONPATH="$PWD" uvicorn ap.interfaces.http.app:app --host 0.0.0.0 --port 8001
```

宿主机部署可继续使用：

```bash
cd model/ap
./start_host.sh
```

## Batch Export

```bash
cd model
python ap/scripts/export_ai_measurements.py \
  --input-dir /path/to/images \
  --output /path/to/ap_measurements.xlsx
```

可选参数见 `docs/use_batch_ai_measurement.md`。
