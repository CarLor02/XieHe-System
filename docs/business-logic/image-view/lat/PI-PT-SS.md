# 脊柱影像标注规范：SS / PT / PI

## 1. 适用范围

本规范用于 脊柱侧位 X 光影像 中三项骨盆参数的标注与计算：

- SS（Sacral Slope，骶骨倾角）
- PT（Pelvic Tilt，骨盆倾斜角）
- PI（Pelvic Incidence，骨盆入射角）

---

## 2. 核心结论（重要）

- SS 标注完成后（2点），**PI 和 PT 只需要额外 1 个点即可计算**
- 三个参数**共享同一组解剖结构**
- 必须复用标注点，避免重复标注

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

### 3.3 股骨头中心（Femoral Head Center）
- 点 C：双侧股骨头中心的中点（或单侧几何中心）

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

### Step 2：标注 PI / PT（1点）

用户操作：
- 点击 C（股骨头中心）

---

### Step 3：自动计算

系统基于 A、B、C 计算：

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
PI / PT : (若已有骶骨两点)请标注股骨头中心 或 (没有骶骨两点)请标注骶骨两点和股骨头中心

## 8. 与其他指标的联系以及结构建议
S1终板（A, B）  ← 全局共享
│
├── SS（用 AB）
├── PT（用 A,B → M + C）
├── PI（用 A,B → normal + C）
├── L1-S1（用 AB + L1终板）
└── L4-S1（用 AB + L4终板）

Landmarks（基础层）
- S1_endplate: A, B
- femoral_head_center: C
- L1_endplate: D, E
- L4_endplate: F, G

Measurements（计算层）
- SS ← S1_endplate
- PT ← S1_endplate + femoral_head_center
- PI ← S1_endplate + femoral_head_center
- L1-S1 ← L1_endplate + S1_endplate
- L4-S1 ← L4_endplate + S1_endplate