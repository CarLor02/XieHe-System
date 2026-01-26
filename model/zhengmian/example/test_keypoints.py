#!/usr/bin/env python3
"""
测试 /detect_keypoints 接口
返回所有检测到的关键点坐标
"""

import requests
import json
from pathlib import Path

API_BASE_URL = "http://localhost:8000"
TEST_IMAGE = Path(__file__).parent / "test_spine.png"
OUTPUT_FILE = Path(__file__).parent / "keypoints_result.json"


def test_detect_keypoints():
    """测试关键点检测接口"""
    print("=" * 80)
    print("测试关键点检测接口: POST /detect_keypoints")
    print("=" * 80)
    
    if not TEST_IMAGE.exists():
        print(f"❌ 测试图片不存在: {TEST_IMAGE}")
        return False
    
    print(f"测试图片: {TEST_IMAGE}")
    
    try:
        with open(TEST_IMAGE, "rb") as f:
            files = {"file": (TEST_IMAGE.name, f, "image/png")}
            params = {"image_id": "KEYPOINTS_TEST"}
            response = requests.post(
                f"{API_BASE_URL}/detect_keypoints",
                files=files,
                params=params
            )
        
        response.raise_for_status()
        result = response.json()
        
        # 保存结果
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"✅ 结果已保存到: {OUTPUT_FILE}")
        
        # 打印结果摘要
        print(f"\n图片ID: {result['imageId']}")
        print(f"图片尺寸: {result['imageWidth']} x {result['imageHeight']}")
        
        # 躯干关键点
        pose_keypoints = result.get('pose_keypoints', {})
        print(f"\n躯干关键点数量: {len(pose_keypoints)}")
        print("-" * 80)
        for name, data in pose_keypoints.items():
            print(f"  {name:4s}: ({data['x']:7.1f}, {data['y']:7.1f}) | 置信度: {data['confidence']:.3f}")
        
        # 椎骨
        vertebrae = result.get('vertebrae', {})
        print(f"\n检测到的椎骨数量: {len(vertebrae)}")
        print("-" * 80)
        
        # 按椎骨名称排序
        vertebrae_sorted = sorted(vertebrae.items(), key=lambda x: (
            0 if x[0] == 'C7' else
            1 if x[0].startswith('T') else
            2 if x[0].startswith('L') else 3,
            int(x[0][1:]) if len(x[0]) > 1 and x[0][1:].isdigit() else 0
        ))
        
        for name, data in vertebrae_sorted:
            corners = data['corners']
            center = corners['center']
            conf = data['confidence']
            print(f"\n  {name:4s} (置信度: {conf:.3f})")
            print(f"    中心: ({center['x']:7.1f}, {center['y']:7.1f})")
            print(f"    左上: ({corners['top_left']['x']:7.1f}, {corners['top_left']['y']:7.1f})")
            print(f"    右上: ({corners['top_right']['x']:7.1f}, {corners['top_right']['y']:7.1f})")
            print(f"    左下: ({corners['bottom_left']['x']:7.1f}, {corners['bottom_left']['y']:7.1f})")
            print(f"    右下: ({corners['bottom_right']['x']:7.1f}, {corners['bottom_right']['y']:7.1f})")
        
        # 统计
        print("\n" + "=" * 80)
        print("统计信息:")
        print("-" * 80)
        c7_count = 1 if 'C7' in vertebrae else 0
        t_count = sum(1 for name in vertebrae.keys() if name.startswith('T'))
        l_count = sum(1 for name in vertebrae.keys() if name.startswith('L'))
        
        print(f"  C7: {c7_count}")
        print(f"  胸椎 (T1-T12): {t_count}")
        print(f"  腰椎 (L1-L5): {l_count}")
        print(f"  总计: {len(vertebrae)}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败！请确保服务已启动: python app.py")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    test_detect_keypoints()

