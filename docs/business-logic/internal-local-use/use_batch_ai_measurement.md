# 批量 AI 测量脚本使用说明

本文档说明如何在本地直接使用模型服务脚本批量测量图片，并导出 Excel 表格。

## 前置条件

- 图片必须按检查类型分批处理：正位图片使用 `model/ap`，侧位图片使用 `model/lat`。
- 模型权重必须存在：
  - 正位：`model/ap/weights/pose.pt`、`model/ap/weights/pose_corner.pt`
  - 侧位：`model/lat/models/corner_model.pt`、`model/lat/models/cfh_model.pt`
- 已安装对应模型目录依赖：

```bash
python -m pip install -r model/ap/requirements.txt
python -m pip install -r model/lat/requirements.txt
```

脚本会直接加载本地模型，不需要启动后端服务，也不需要把图片上传到系统对象存储。

## 图片放置

可以把同一检查类型的图片放在任意本地目录，例如：

```text
/tmp/xiehe-ai-batch/ap/
  case001.png
  case002.jpg

/tmp/xiehe-ai-batch/lat/
  case101.png
  case102.jpg
```

支持扩展名：`.jpg`、`.jpeg`、`.png`、`.tif`、`.tiff`、`.bmp`。

## 正位批量测量

```bash
python model/ap/scripts/export_ai_measurements.py \
  --input-dir /tmp/xiehe-ai-batch/ap \
  --metrics cobb1,cobb2,cobb3,t1-tilt,ca,ts \
  --output /tmp/xiehe-ai-batch/ap-results.xlsx \
  --raw-output-dir /tmp/xiehe-ai-batch/ap-raw
```

正位可用指标：

```text
cobb1
cobb2
cobb3
t1-tilt
ca
pelvic
sacral
ts
```

## 侧位批量测量

```bash
python model/lat/scripts/export_ai_measurements.py \
  --input-dir /tmp/xiehe-ai-batch/lat \
  --metrics t1-slope,tk-t5-t12,t10-l2,ll-l1-s1,pi,pt,ss \
  --output /tmp/xiehe-ai-batch/lat-results.xlsx \
  --raw-output-dir /tmp/xiehe-ai-batch/lat-raw
```

侧位可用指标：

```text
t1-slope
cl
tk-t2-t5
tk-t5-t12
t10-l2
ll-l1-s1
ll-l1-l4
ll-l4-s1
sva
tpa
pi
pt
ss
```

## 常用参数

- `--input-dir`：图片目录，必填。
- `--metrics`：需要导出的指标，逗号分隔；不传则导出该检查类型支持的全部指标。
- `--output`：输出 Excel 路径，必填。
- `--recursive`：递归读取子目录图片。
- `--raw-output-dir`：可选，保存每张图片的完整 AI 测量 JSON，便于排查。
- `--lr_flip`：可选，在 AI 推理前对每张图片做左右翻转。用于处理图片方向与模型训练方向相反、导致模型无法检测的批次。

如果同时使用 `--lr_flip` 和 `--raw-output-dir`，raw JSON 中的关键点坐标对应翻转后的图像坐标。

## Excel 输出

Excel 默认包含：

- `measurements` sheet：首列 `id` 为图片文件名去掉扩展名，后续每列为一个测量指标值。
- `errors` sheet：仅当某些图片处理失败时生成，记录文件名、路径和错误信息。

如果某张图片没有检测到某个指标，该指标单元格留空。

## 常见问题

- **未找到图片**：确认 `--input-dir` 路径正确，图片扩展名在支持列表内。
- **模型权重不存在**：确认对应模型文件已经放在上面的权重路径。
- **导出 Excel 失败**：确认已安装 `pandas` 和 `openpyxl`。
- **某些指标为空**：通常是对应关键点未检测到，例如侧位 `PI/PT/TPA` 依赖 `CFH` 和 `S1`。
