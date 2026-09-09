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

使用模型共享 Python 3.12 / uv 0.12.10 环境，详见 [共享环境说明](../README.md)。从仓库根目录运行：

```bash
cd model
uv run --locked --no-dev uvicorn ap.interfaces.http.app:app --host 0.0.0.0 --port 8001
```

宿主机部署可继续使用：

```bash
cd model/ap
./start_host.sh
```

## 六点左右语义

服务固定采用新规范：画面左侧`CL/IL/SL`、画面右侧`CR/IR/SR`，不再执行
`CR/CL、IR/IL、SR/SL`运行时标签交换。部署后访问`GET /health`，应确认：

```json
{"pose_lr_mode":"normalized"}
```

本代码必须与按新规范训练的`pose.pt`一起部署，不能继续搭配旧权重。

## 正位推理契约

- 六点Pose使用完整原图单阶段推理，显式固定`imgsz=800`，与最新版模型训练和正式评测尺寸一致。保留box置信度和点跨度安全检查；Pose被拒绝时不再根据Corner结果静默估算六点或继续生成相关自动测量。
- Pose Corner使用完整原图单阶段推理，显式固定`imgsz=800`。椎体编号严格使用模型原生class ID，每类只保留最高置信候选，不再按纵向位置连续重编号。
- 标准接口只输出class 0–17，对应C7、T1–T12、L1–L5。20类模型的class 18/19当前不进入标准18节列表，也不会用于补齐缺失类别。
- 两个模型的候选阈值显式固定为0.25，最终box接受阈值为0.5。

## Batch Export

```bash
cd model
uv run --locked --no-dev python ap/scripts/export_ai_measurements.py \
  --input-dir /path/to/images \
  --output /path/to/ap_measurements.xlsx
```

可选参数见 [批量导出说明](../../docs/internal-scripts/use_batch_ai_measurement.md)。
