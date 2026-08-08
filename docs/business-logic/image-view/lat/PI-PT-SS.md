# 脊柱影像标注规范：SS / PT / PI / TPA

## 1. 适用范围

本规范用于脊柱侧位 X 光影像中骨盆参数及 TPA 的标注与计算：

- SS（Sacral Slope，骶骨倾角）
- PT（Pelvic Tilt，骨盆倾斜角）
- PI（Pelvic Incidence，骨盆入射角）
- TPA（T1 Pelvic Angle，T1 骨盆角）

---

## 2. 核心结论（重要）

- SS 标注完成后（2点），单 FH 模式下 **PI 和 PT 只需要额外 1 个点即可计算**
- 三个参数**共享同一组解剖结构**
- 必须复用标注点，避免重复标注
- PI/PT/TPA 支持单 FH 与双 FH 两种模式，三者统一使用 `effectiveCFH` 参与计算。

---

## 3. 解剖标志定义

“终板”（Vertebral Endplate）
是指椎体上下与椎间盘接触的那一层近似平面的骨性结构。
在脊柱侧位影像标注中，通常以两个点确定该平面的一条代表线（终板线）。
这条线作为几何基准，用于计算多种关键参数
例如：以 S1 上终板线与水平线的夹角得到 SS，以该线的法线参与计算 PI，并作为 L1-S1、L4-S1 等角度的下边界。
终板在标注中的作用是提供稳定且可复用的参考方向与基准平面，其准确性直接影响所有相关测量结果。

所有参数基于以下三个关键点：

### 3.1 骶骨终板两点（Sacral Endplate）
- 点 A：骶骨上终板左端
- 点 B：骶骨上终板右端

### 3.2 骶骨终板中点（自动计算）
- 点 M = midpoint(A, B)

### 3.3 有效股骨头中心（effectiveCFH）

- 单 FH：保存关键点 `CFH`，`effectiveCFH = CFH`。
- 双 FH：保存关键点 `FH-1`、`FH-2`，分别作为用户指定的两个股骨头圆心，
  `effectiveCFH = midpoint(FH-1, FH-2)`。
- `effectiveCFH` 是计算值，不单独持久化为关键点。
- `CFH` 与任意 `FH-*` 互斥；出现混合历史数据时不自动删除任一侧，也不自动派生新的 PI/PT/TPA。

---

## 4. 标注流程（推荐）

### Step 1：标注 SS（2点）

用户操作：
- 点击 A（骶骨终板一端）
- 点击 B（骶骨终板另一端）

系统计算：
- 线 AB（骶骨终板）
- 中点 M
- 法线 normal(AB)

---

### Step 2：选择股骨头模式

点击 PI、PT 或 TPA 后，先选择：

- 单 FH：沿用三点工具行为。
- 双 FH：使用 6 点工具并显示两个辅助圆。

### Step 3：完成 PI / PT

单 FH 用户操作：

- 依次确定 `CFH`、`S1-1`、`S1-2`；已有关键点自动继承并跳过。

双 FH 用户操作顺序是稳定契约：

| measurement 点位 | 含义 | 是否写入关键点 |
| --- | --- | --- |
| 0 | `FH-1` 圆心 | 是，写入 `FH-1` |
| 1 | `FH-1` 半径控制点 | 否 |
| 2 | `FH-2` 圆心 | 是，写入 `FH-2` |
| 3 | `FH-2` 半径控制点 | 否 |
| 4 | `S1-1` | 是 |
| 5 | `S1-2` | 是 |

`FH-1` 与 `FH-2` 由用户的第一个、第二个圆心落点确定，不按屏幕 X 坐标重新排序。
圆的显示使用共享 `CircleGeometry(center, radiusHandle)` 领域结构。

TPA 在上述骨盆六点前固定保存 T1 四角点，因此双 FH TPA 的新数据结构为 10 点：

`[T1-1,T1-2,T1-3,T1-4,FH-1圆心,FH-1半径点,FH-2圆心,FH-2半径点,S1-1,S1-2]`

已有同模式 PI/PT 时，TPA 继承其完整骨盆六点，只补缺失的 T1 四点。单 FH TPA
继续使用原 7 点结构 `[T1四点,CFH,S1-1,S1-2]`。

### Step 4：自动计算

系统基于 A、B、`effectiveCFH` 计算：

- SS
- PT
- PI

---

## 5. 参数定义与计算

### 5.1 SS（骶骨倾角）

定义：
- 骶骨终板（AB）与水平线的夹角
计算： SS = angle(AB, horizontal)

---

### 5.2 PT（骨盆倾斜角）

定义：
- 向量（C → M）与垂直线的夹角
计算： PT = angle(C→M, vertical)

---

### 5.3 PI（骨盆入射角）

定义：
- 向量（C → M）与骶骨终板法线的夹角
计算： PI = angle(C→M, normal(AB))

---

## 6. 数学关系（必须满足）
三者存在严格关系： PI = PT + SS
- 当股骨中点在骶骨中心后方时，PT应该为负值，才能满足PI=PT+SS
- 骶骨前后端点的中点做竖直线，如果股骨中心点在该线的左侧/患者前方，PT为正值。如果股骨中心点在该线的右侧/患者后方，PT为负值

建议：
- 实现校验： abs(PI - (PT + SS)) < epsilon

## 7. UI / Tooltip 设计建议
❌ 不推荐
PI/PT 需要标注三个点
问题：
- 会误导用户重复标注骶骨终板
- 导致数据不一致

✅ 推荐
SS :标注骶骨终板两点
PI / PT / TPA：点击后先选择“单FH”或“双FH”；已有依赖点自动继承，只提示剩余点。

## 8. 交互与同步

- PI、PT 与双 FH TPA 共享同一组骨盆点和两个双 FH 圆。完成 TPA 后按全量派生
  规则生成 PI、PT、SS；这是创建时规则，不改变用户后续一级删除测量项的行为。
- 双 FH 的两个圆心以实线连接，连线中点显示为 `CFH` 交互句柄；这个句柄表示
  `effectiveCFH`，不作为第 7 个测量点持久化，也不创建 `CFH` 关键点。
- 拖动 `effectiveCFH` 句柄时，两个圆心和各自半径控制点等量平移；圆半径、圆心间距
  及 S1 两点不变。圆心连线本身不可拖动。
- 拖动双 FH 圆心时，对应半径控制点按相同位移平移，圆半径不变。
- 拖动半径控制点时只修改对应圆半径。
- 拖动 PI/PT 的任一共享点后，PI、PT 实时使用相同几何并重算。
- TPA 也依赖 `effectiveCFH`。双 FH 模式下拖动 TPA 的有效中心，会平移 `FH-1`、`FH-2`
  及现有 PI/PT 圆，不创建 `CFH`。
- 只有关键点而没有双 FH 圆半径信息时，自动派生使用影像短边 3% 作为默认半径；
  无有效影像尺寸时使用 20 图像像素，并把半径点放在圆心右侧。

## 9. 持久化兼容

- 新 PI/PT/TPA 保存 `pelvicMetadata = { schemaVersion: 2, femoralHeadMode }`。
- 历史 PI/PT 三点数据和历史 TPA 没有该 metadata，永久按单 FH 解释。
- 双 FH PI/PT 保存 6 点；双 FH TPA 保存 `T1四点 + 同一组六点骨盆数据`，共 10 点。
  半径控制点属于 measurement，不写入关键点层。
- 旧版本已可能保存带 bilateral metadata 的 7 点 TPA，其第 5 点为派生
  `effectiveCFH`；该结构永久按旧布局读取，不按新 10 点下标迁移。
- `FH-1`、`FH-2` 作为独立关键点写入 `vertebraeLayer`。

## 10. 与其他指标的联系以及结构建议
S1终板（A, B）  ← 全局共享
│
├── SS（用 AB）
├── PT（用 A,B → M + C）
├── PI（用 A,B → normal + C）
├── L1-S1（用 AB + L1终板）
└── L4-S1（用 AB + L4终板）

Landmarks（基础层）
- S1_endplate: A, B
- effective_femoral_head_center: `CFH` 或 `midpoint(FH-1,FH-2)`
- L1_endplate: D, E
- L4_endplate: F, G

Measurements（计算层）
- SS ← S1_endplate
- PT ← S1_endplate + femoral_head_center
- PI ← S1_endplate + femoral_head_center
- L1-S1 ← L1_endplate + S1_endplate
- L4-S1 ← L4_endplate + S1_endplate
