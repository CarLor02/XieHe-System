# 批量 AI 测量脚本使用说明

本脚本用于内部批量评估：对一批本地图片执行模型推理、测量项派生，并输出 Excel。输出结果与模型服务 `POST /api/measurement` 的生产 pipeline 使用同一套 application/domain 逻辑。

## 前置条件

1. 在对应模型目录准备 Python venv 并安装依赖。
   - 正位：`model/ap/.venv`
   - 侧位：`model/lat/.venv`
2. 模型权重已放在默认位置。
   - 正位：`model/ap/weights/pose.pt`、`model/ap/weights/pose_corner.pt`
   - 侧位：`model/lat/models/corner_model.pt`、`model/lat/models/cfh_model.pt`
3. 图片是本地文件，不需要先上传到服务器或对象存储。
4. 从仓库根目录执行命令，脚本会自动把 `model/` 加入 import path。

## 图片目录

把待测图片放入任意本地目录，例如：

```text
/data/ai-batch/ap/
  case001.png
  case002.jpg

/data/ai-batch/lat/
  case101.png
  case102.jpg
```

支持扩展名：`.jpg`、`.jpeg`、`.png`、`.tif`、`.tiff`、`.bmp`。

## 正位批量导出

```bash
cd /path/to/XieHe-System
model/ap/.venv/bin/python model/ap/scripts/export_ai_measurements.py \
  --input-dir /data/ai-batch/ap \
  --output /data/ai-batch/ap_measurements.xlsx \
  --raw-output-dir /data/ai-batch/ap_raw
```

可选指定指标：

```bash
--metrics cobb1,cobb2,cobb3,t1-tilt,ca,pelvic,sacral,ts
```

正位 metric enum：

```text
cobb1, cobb2, cobb3, t1-tilt, ca, pelvic, sacral, ts
```

## 侧位批量导出

```bash
cd /path/to/XieHe-System
model/lat/.venv/bin/python model/lat/scripts/export_ai_measurements.py \
  --input-dir /data/ai-batch/lat \
  --output /data/ai-batch/lat_measurements.xlsx \
  --raw-output-dir /data/ai-batch/lat_raw
```

可选指定指标：

```bash
--metrics t1-slope,cl,tk-t2-t5,tk-t5-t12,t10-l2,ll-l1-s1,ll-l1-l4,ll-l4-s1,sva,tpa,pi,pt,ss
```

侧位 metric enum：

```text
t1-slope, cl, tk-t2-t5, tk-t5-t12, t10-l2, ll-l1-s1, ll-l1-l4, ll-l4-s1, sva, tpa, pi, pt, ss
```

## 左右翻转

如果图片方向与训练数据相反，检测可能失败。可在推理前左右翻转：

```bash
--lr_flip
```

示例：

```bash
model/lat/.venv/bin/python model/lat/scripts/export_ai_measurements.py \
  --input-dir /data/ai-batch/lat \
  --output /data/ai-batch/lat_measurements_flipped.xlsx \
  --lr_flip
```

## 输出

Excel 包含：

- `measurements` sheet：首列 `id` 为文件名 stem，后续列为测量指标值。
- `errors` sheet：仅当某些图片失败时生成，记录文件和错误信息。

如果指定 `--raw-output-dir`，每张图片还会保存一份完整 JSON，便于排查缺失关键点或派生结果。

常用参数：

```text
--input-dir          待测图片目录，必填
--output             Excel 输出路径，必填
--metrics            逗号分隔的 metric enum，不填则导出全部
--recursive          递归读取子目录
--raw-output-dir     保存每张图片完整 JSON
--lr_flip            推理前左右翻转图片
```
