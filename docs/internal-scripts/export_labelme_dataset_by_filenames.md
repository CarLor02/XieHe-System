# 按 Excel 文件名导出侧位 LabelMe 数据集

该命令读取 Excel 中的影像名称，从当前环境的数据库和对象存储导出已经保存的侧位标注。它不会重新运行 AI，因此医生手工调整后的关键点和测量结果会被保留。

## 输入和输出

输入工作簿必须包含 `Sheet1`，并至少包含以下列：

```text
影像名称,T1 slope,C2-7,T2-5,T5-12,T10-L2,T12-L1,L1-4,L4-S1,L1-S1,PI,PT,SS
```

输出目录结构：

```text
labelme-export/
├── <PatientID>/
│   ├── <影像名>.png
│   └── <影像名>.json
├── measurements.xlsx
└── export-summary.json
```

`measurements.xlsx` 保留输入工作簿的行顺序、样式和备注，并新增 `export_manifest` Sheet。`T12-L1` 只读取历史标注中明确存在的同名测量，不根据关键点推测计算。

完整椎体的四角点导出为 LabelMe polygon，S1 导出为 line，CFH 和单独关键点导出为 point。当前模型不提供椎体轮廓，因此 `mask` 为 `null`；polygon 不是像素级分割掩模。

## 在服务器运行

建议将输入和输出目录作为 volume 挂载到 Backend。若只是临时执行，可先查询
Compose 创建的实际容器 ID，再复制输入文件，避免依赖可能被 Compose 重建改名的
`container_name`：

```bash
BACKEND_ID="$(./scripts/compose.sh ps -q backend)"
docker cp all-image-names.xlsx "$BACKEND_ID":/data/all-image-names.xlsx
```

输出目录应使用宿主机挂载目录。以 `/data/labelme-export` 已挂载为例：

```bash
./scripts/compose.sh exec backend python \
  -m app.contexts.imaging.interface.cli.export_labelme_dataset \
  --input /data/all-image-names.xlsx \
  --output /data/labelme-export \
  --exam-type 侧位X光片 \
  --team-name "脊柱研究团队" \
  --overwrite
```

如果没有固定挂载，可以先在容器中输出，再复制到宿主机：

```bash
docker cp "$BACKEND_ID":/data/labelme-export ./labelme-export
```

`--team-name` 是可选参数。提供后，脚本按启用团队的名称精确匹配，并且只导出 `image_file_team_visibility` 中明确归属于该团队的影像；不通过上传者的团队成员身份推断影像归属。不提供该参数时，保持原有的跨团队文件名匹配行为。

团队名称在当前模型中具有唯一约束。若名称不存在、团队已停用，或历史异常数据导致名称无法唯一解析，脚本会在读取影像前退出并返回退出码 `2`，避免导出错误团队的数据。

脚本按文件名精确匹配，过滤已删除、`UPLOADING`、`DELETED` 和非侧位记录。同名候选从最新 ID 开始检查，选择首个 PatientID 完整、对象存在且大小一致的记录。

## 状态和退出码

- `exported`：PNG、JSON 和测量结果均已处理。
- `missing_annotation`：原图存在，但没有 `vertebraeLayer`；输出空 `shapes` JSON。
- `not_found`：数据库中没有符合条件的侧位影像。
- `object_missing`：候选对象不存在或对象大小不一致。
- `storage_unavailable`：storage-service 暂时不可用。
- `export_failed`：下载、图片解码或文件写入失败。

脚本会继续处理单张失败的影像。只要存在未匹配或失败项，最终退出码为 `1`，详细原因见 `export_manifest`；全部成功时退出码为 `0`。
