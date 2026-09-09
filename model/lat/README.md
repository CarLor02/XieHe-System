# LAT AI Measurement Service

侧位 X 光片 AI 测量服务。服务按 DDD 分层组织：

当前模型契约与 Model1 最终联合推理一致：

- `corner_model.pt`：20 类 Pose 模型，类别顺序为 `C2、C7、T1-T13、L1-L5`，每个椎体 4 个角点。
- `cfh_model.pt`：单类 `pelvis` Pose 模型，依次返回 `CFH、S1_left、S1_right` 三个关键点。

服务启动时会校验任务类型、类别顺序和关键点形状，并按 Model1 的参考推理尺寸 `1280` 运行。pelvis 后两个点会转换成现有的 `S1-1`、`S1-2` 检测层数据，供 SVA、TPA、PI、PT、SS 与腰椎角度测量使用。

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
