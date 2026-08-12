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

## 六点左右语义兼容

旧版`pose.pt`的六点左右语义与系统领域语义相反，服务默认设置
`POSE_LEGACY_LR_SWAP=true`，继续执行`CR/CL、IR/IL、SR/SL`标签交换。

替换为使用新规范训练的权重时，必须在同一次部署中设置：

```bash
POSE_LEGACY_LR_SWAP=false
```

新规范为画面左侧`CL/IL/SL`、画面右侧`CR/IR/SR`。部署后访问`GET /health`，应确认：

```json
{"pose_lr_mode":"normalized"}
```

如果仍使用旧权重，必须保持`legacy_swap`。不得只替换权重或只修改开关。

## Batch Export

```bash
cd model
python ap/scripts/export_ai_measurements.py \
  --input-dir /path/to/images \
  --output /path/to/ap_measurements.xlsx
```

可选参数见 `docs/use_batch_ai_measurement.md`。
