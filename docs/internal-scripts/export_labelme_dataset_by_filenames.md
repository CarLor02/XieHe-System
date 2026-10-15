# 按 Excel 文件名或整个团队导出 LabelMe 数据集

该命令读取 Excel 中的影像名称，从当前环境的数据库和对象存储导出已经保存的侧位标注。它不会重新运行 AI，因此医生手工调整后的关键点和测量结果会被保留。

也可以使用 `--all-team-images` 导出指定团队的全部有效影像，不需要 Excel，不区分正侧位；没有标注的影像也会导出。两种模式共用图片和 LabelMe 输出流程，原 Excel 命令保持兼容。

## 输入和输出

Excel 模式的输入工作簿必须包含 `Sheet1`，并至少包含以下列：

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

## Excel 模式在服务器运行

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

Excel 模式按文件名精确匹配，过滤已删除、`UPLOADING`、`DELETED` 和不符合 `--exam-type` 的记录（默认只选侧位）。同名候选从最新 ID 开始检查，选择首个 PatientID 完整、对象存在且大小一致的记录。

## 团队全量导出

```bash
./scripts/compose.sh exec backend python \
  -m app.contexts.imaging.interface.cli.export_labelme_dataset \
  --all-team-images \
  --team-name "中国青少年标准脊柱序列研究影像" \
  --output /data/labelme-export \
  --overwrite
```

- `--all-team-images` 与 `--input` 互斥，必须提供 `--team-name`，不接受 `--exam-type`。不限检查类型，也包括未填写检查类型的记录。
- 团队解析和显式影像归属规则与 Excel 模式一致。排除已删除影像、已删除患者，以及 `UPLOADING`、`DELETED` 状态；无 PatientID、对象缺失等记录会记为失败，不静默忽略。
- 按影像 ID 升序分页读取，`--query-batch-size` 默认 200；不按文件名去重，每条记录分别处理。分页期间的进度显示为 `[已处理数量/?]`，最终输出准确统计。
- 仍输出 `<PatientID>/<原文件名去扩展名>.png` 和同名 `.json`，不添加影像 ID。PNG 之外的可解码图片会转换为 PNG；路径非法字符仍按原逻辑替换。
- `--overwrite` 允许覆盖上次导出的文件，但同一批次若有多个有效候选映射到同一个输出路径，后续记录会标记 `export_failed`，不会覆盖先前记录。不同扩展名和非法字符替换也可能造成路径冲突。
- 没有标注的影像输出 PNG 和空 `shapes` 的 LabelMe JSON，状态为 `missing_annotation`，计入成功。
- 自动生成 `measurements.xlsx`：`Sheet1` 为文件名及原有侧位测量列，`export_manifest` 记录每条影像的 ID、PatientID、检查类型、原文件名、输出路径和状态。**测量列仍是侧位指标，不是正位全部测量指标的导出。**
- LabelMe 导出已保存的 `vertebraeLayer` 关键点/椎体及 CFH，不是所有查看器图层或原始标注 JSON 的完整备份。没有完整四角点时不会推测补点，也不会重新运行 AI。
- 这是在线逐条读取，不是冻结的数据集快照。建议导出期间避免修改该团队的影像和标注。空团队会生成零条记录的清单，退出码为 `0`。

输出目录挂载或通过 `docker cp` 复制到宿主机的方式与前文相同。

## 状态和退出码

- `exported`：PNG、JSON 和测量结果均已处理。
- `missing_annotation`：原图存在，但没有 `vertebraeLayer`；输出空 `shapes` JSON。
- `not_found`：Excel 模式下，数据库中没有符合条件的影像。
- `invalid_candidate`：候选缺少 PatientID 等必要信息。
- `object_missing`：候选对象不存在或对象大小不一致。
- `storage_unavailable`：storage-service 暂时不可用。
- `export_failed`：下载、图片解码、文件写入失败，或团队模式中输出路径重名。

脚本会继续处理单张失败的影像。只要存在未匹配或失败项，最终退出码为 `1`，详细原因见 `export_manifest`；全部成功时退出码为 `0`。
