#!/usr/bin/env python3
"""
生产版可视化脚本

两层叠加:
  Layer 1 (细框): 所有检测到的椎体角点 (C7, T1-T12, L1-L5)
  Layer 2 (粗线): 各指标测量线 (T1 Tilt / Cobb-* / CA / ...)

用法:
  # 直接调用 API（最简单）
  python example/visualize_result.py --image example/1.png --out example/vis.png

  # 用已有的 JSON 文件（离线）
  python example/visualize_result.py --image example/1.png \
      --result example/result.json --keypoints example/keypoints_result.json \
      --out example/vis.png
"""
import json
import argparse
import requests
import cv2
import numpy as np
from pathlib import Path

API_BASE_URL = "http://localhost:8000"

# ── 指标颜色 (BGR) ──────────────────────────────────────────────────────────
MEASURE_COLORS = {
    "T1 Tilt":           (255, 120,   0),   # 蓝橙
    "Cobb-Thoracic":     (  0, 210,   0),   # 绿
    "Cobb-Thoracolumbar":(  0, 200, 180),   # 青绿
    "Cobb-Lumbar":       (  0, 180, 255),   # 黄绿
    "CA":                (  0,   0, 220),   # 红
    "Pelvic":            (180,   0, 180),   # 紫
    "Sacral":            (  0, 180, 180),   # 青
    "AVT":               (  0, 140, 255),   # 橙
    "TS":                (  0, 215, 255),   # 金
}
DEFAULT_COLOR = (180, 180, 180)

# ── 椎骨颜色 ─────────────────────────────────────────────────────────────────
def vert_color(name: str):
    if name == "C7":
        return (200, 200, 200)
    if name.startswith("T"):
        n = int(name[1:])
        r = int(80 + (n - 1) * 14)
        return (60, 100 + n * 8, r)     # 偏暖色
    if name.startswith("L"):
        n = int(name[1:])
        return (120 + n * 20, 80, 200)  # 偏冷色
    return (160, 160, 160)


def text_bg(img, text, pt, scale=0.42, color=(255, 255, 255), bg=(0, 0, 0), thick=1):
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), bl = cv2.getTextSize(text, font, scale, thick)
    x, y = int(pt[0]), int(pt[1])
    cv2.rectangle(img, (x - 2, y - th - 2), (x + tw + 2, y + bl), bg, -1)
    cv2.putText(img, text, (x, y), font, scale, color, thick, cv2.LINE_AA)


# ── Layer 1: 椎体角点框 ──────────────────────────────────────────────────────
def draw_vertebrae(img, vertebrae, sx, sy):
    order = {"C": 0, "T": 1, "L": 2}
    def sort_key(name):
        return (order.get(name[0], 9), int(name[1:]) if name[1:].isdigit() else 0)

    for name, v in sorted(vertebrae.items(), key=lambda x: sort_key(x[0])):
        c = v["corners"]
        color = vert_color(name)
        pts = np.array([
            [c["top_left"]["x"]     * sx, c["top_left"]["y"]     * sy],
            [c["top_right"]["x"]    * sx, c["top_right"]["y"]    * sy],
            [c["bottom_right"]["x"] * sx, c["bottom_right"]["y"] * sy],
            [c["bottom_left"]["x"]  * sx, c["bottom_left"]["y"]  * sy],
        ], dtype=np.int32)
        cv2.polylines(img, [pts], True, color, 1, cv2.LINE_AA)
        for p in pts:
            cv2.circle(img, tuple(p), 3, color, -1)
        cx = int(pts[:, 0].mean())
        cy = int(pts[:, 1].mean())
        text_bg(img, name, (cx - 14, cy + 5), scale=0.38, color=(255, 255, 255), bg=color)


# ── Layer 2: 指标测量线 ──────────────────────────────────────────────────────
def draw_measurements(img, measurements, sx, sy):
    for m in measurements:
        mtype = m.get("type", "")
        pts   = m.get("points", [])
        color = MEASURE_COLORS.get(mtype, DEFAULT_COLOR)
        angle = m.get("angle")

        if mtype.startswith("Cobb") and len(pts) == 4:
            p = [(int(q["x"] * sx), int(q["y"] * sy)) for q in pts]
            cv2.line(img, p[0], p[1], color, 3, cv2.LINE_AA)   # 上端椎终板
            cv2.line(img, p[2], p[3], color, 3, cv2.LINE_AA)   # 下端椎终板
            # 延长线辅助
            cv2.line(img, p[1], p[3], color, 1, cv2.LINE_AA)
            for pt in p:
                cv2.circle(img, pt, 5, color, -1)
            mx = (p[0][0] + p[1][0]) // 2
            my = (p[0][1] + p[1][1]) // 2
            label = mtype.replace("Cobb-", "")
            upper = m.get("upper_vertebra", "")
            lower = m.get("lower_vertebra", "")
            if angle is not None:
                label = f"{label} {angle:.1f}° ({upper}→{lower})"
            text_bg(img, label, (mx + 6, my - 6), color=color)

        elif len(pts) >= 2:
            p1 = (int(pts[0]["x"] * sx), int(pts[0]["y"] * sy))
            p2 = (int(pts[1]["x"] * sx), int(pts[1]["y"] * sy))
            cv2.line(img, p1, p2, color, 3, cv2.LINE_AA)
            cv2.circle(img, p1, 5, color, -1)
            cv2.circle(img, p2, 5, color, -1)
            mx = (p1[0] + p2[0]) // 2
            my = (p1[1] + p2[1]) // 2
            label = mtype
            if angle is not None:
                label = f"{mtype} {angle:.1f}°"
            text_bg(img, label, (mx + 6, my - 6), color=color)


# ── 图例 ─────────────────────────────────────────────────────────────────────
def draw_legend(img, measurements):
    y = 20
    seen = set()
    for m in measurements:
        mtype = m.get("type", "")
        if mtype in seen:
            continue
        seen.add(mtype)
        color = MEASURE_COLORS.get(mtype, DEFAULT_COLOR)
        cv2.rectangle(img, (8, y - 10), (22, y + 4), color, -1)
        text_bg(img, mtype, (28, y + 4), scale=0.42, color=color, bg=(0, 0, 0))
        y += 22



# ── 主程序 ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="脊柱分析结果可视化（生产版）")
    parser.add_argument("--image",     required=True,  help="原始 X 光图片路径")
    parser.add_argument("--result",    default=None,   help="predict JSON 文件（不传则调 API）")
    parser.add_argument("--keypoints", default=None,   help="detect_keypoints JSON 文件（不传则调 API）")
    parser.add_argument("--out",       default="example/vis.png", help="输出可视化图片路径")
    parser.add_argument("--api",       default=API_BASE_URL, help="API 地址")
    args = parser.parse_args()

    img = cv2.imread(args.image)
    if img is None:
        raise FileNotFoundError(f"找不到图片: {args.image}")
    h, w = img.shape[:2]

    # ── 获取 predict 结果 ────────────────────────────────────────────────────
    if args.result:
        with open(args.result) as f:
            predict_data = json.load(f)
        print(f"📂 加载 predict JSON: {args.result}")
    else:
        print(f"🌐 调用 API /predict ...")
        with open(args.image, "rb") as f:
            resp = requests.post(
                f"{args.api}/predict",
                files={"file": (Path(args.image).name, f, "image/png")},
                params={"image_id": Path(args.image).stem}
            )
        resp.raise_for_status()
        predict_data = resp.json()

    measurements = predict_data.get("measurements", [])
    res_w = predict_data.get("imageWidth",  w)
    res_h = predict_data.get("imageHeight", h)
    sx = w / res_w if res_w else 1.0
    sy = h / res_h if res_h else 1.0

    # ── 获取 detect_keypoints 结果 ──────────────────────────────────────────
    vertebrae = {}
    if args.keypoints:
        with open(args.keypoints) as f:
            kp_data = json.load(f)
        vertebrae = kp_data.get("vertebrae", {})
        print(f"📂 加载 keypoints JSON: {args.keypoints}")
    else:
        print(f"🌐 调用 API /detect_keypoints ...")
        with open(args.image, "rb") as f:
            resp = requests.post(
                f"{args.api}/detect_keypoints",
                files={"file": (Path(args.image).name, f, "image/png")},
                params={"image_id": Path(args.image).stem}
            )
        if resp.ok:
            vertebrae = resp.json().get("vertebrae", {})
        else:
            print("⚠️  /detect_keypoints 调用失败，跳过椎体层")

    # ── 绘制 ─────────────────────────────────────────────────────────────────
    if vertebrae:
        draw_vertebrae(img, vertebrae, sx, sy)
        sorted_names = sorted(vertebrae.keys(),
                              key=lambda n: (n[0], int(n[1:]) if n[1:].isdigit() else 0))
        print(f"   椎体数量: {len(vertebrae)}  ({', '.join(sorted_names)})")
    else:
        print("⚠️  无椎体角点数据，仅绘制指标层")

    draw_measurements(img, measurements, sx, sy)
    draw_legend(img, measurements)

    # ── 保存 ─────────────────────────────────────────────────────────────────
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(args.out, img)
    print(f"✅ 保存至: {args.out}  ({w}x{h})")
    print(f"   指标数量: {len(measurements)}")
    for m in measurements:
        angle = m.get("angle")
        suffix = f"  {angle:.1f}°" if angle is not None else ""
        print(f"   · {m['type']}{suffix}")


if __name__ == "__main__":
    main()
