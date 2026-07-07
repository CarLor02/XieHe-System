# LAT AI Measurement Service

侧位 X 光片 AI 测量服务。服务按 DDD 分层组织：

- `interfaces/http/`：FastAPI 入口，只暴露生产接口。
- `application/`：AI 测量编排，供 HTTP 与本地批量脚本共用。
- `domain/`：侧位测量派生、S1/CFH 数据结构、导出列定义。
- `infrastructure/`：YOLO 模型加载与推理后处理。
- `legacy/`：不再暴露为 HTTP 接口的历史关键点/指标计算代码。

## Production API

```bash
POST /api/measurement
```

请求体：

```json
{
  "bucket": "medical-image-files",
  "object_key": "path/to/image.png",
  "image_id": "LAT001"
}
```

服务会从对象存储读取图片，一次性完成模型推理、关键点生成和测量项派生。旧的 `/api/detect`、`/api/detect_object`、`/api/keypoints`、`/api/detect_and_keypoints`、`/api/calculate_metrics` 不再暴露。

## Local Run

从仓库根目录运行：

```bash
cd model
PYTHONPATH="$PWD" uvicorn lat.interfaces.http.app:app --host 0.0.0.0 --port 8002
```

宿主机部署可继续使用：

```bash
cd model/lat
./start_host.sh
```

## Batch Export

```bash
cd model
python lat/scripts/export_ai_measurements.py \
  --input-dir /path/to/images \
  --output /path/to/lat_measurements.xlsx
```

可选参数见 `docs/use_batch_ai_measurement.md`。
