#!/usr/bin/env python3
"""
调试脚本：查看检测到的椎骨信息
"""

import requests
import json
from pathlib import Path

API_BASE_URL = "http://localhost:8000"
TEST_IMAGE = Path(__file__).parent / "test_spine.png"

def debug_vertebrae():
    """调试：查看检测到的椎骨"""
    print("=" * 60)
    print("调试：查看椎骨检测结果")
    print("=" * 60)
    
    if not TEST_IMAGE.exists():
        print(f"❌ 测试图片不存在: {TEST_IMAGE}")
        return
    
    try:
        with open(TEST_IMAGE, "rb") as f:
            files = {"file": (TEST_IMAGE.name, f, "image/png")}
            params = {"image_id": "DEBUG_TEST"}
            response = requests.post(
                f"{API_BASE_URL}/predict",
                files=files,
                params=params
            )
        
        response.raise_for_status()
        result = response.json()
        
        print(f"\n图片ID: {result['imageId']}")
        print(f"图片尺寸: {result.get('imageWidth')} x {result.get('imageHeight')}")
        print(f"\n检测到的测量项数量: {len(result['measurements'])}")
        
        # 统计各类型
        type_counts = {}
        for m in result['measurements']:
            mtype = m['type']
            type_counts[mtype] = type_counts.get(mtype, 0) + 1
        
        print("\n测量项类型统计:")
        print("-" * 60)
        for mtype, count in sorted(type_counts.items()):
            print(f"  {mtype:25s}: {count}")
        
        # 显示Cobb角详情
        cobb_measurements = [m for m in result['measurements'] if m['type'].startswith('Cobb')]
        
        if cobb_measurements:
            print(f"\n✓ 检测到 {len(cobb_measurements)} 个Cobb角:")
            print("-" * 60)
            for m in cobb_measurements:
                upper = m.get('upper_vertebra', 'N/A')
                apex = m.get('apex_vertebra', 'N/A')
                lower = m.get('lower_vertebra', 'N/A')
                print(f"  {m['type']:25s}: {m.get('angle', 'N/A'):6.2f}° ({upper} → {apex} → {lower})")
        else:
            print("\n✗ 未检测到Cobb角")
            print("\n可能原因:")
            print("  1. 检测到的椎骨数量不足（每个区域需要至少2个椎骨）")
            print("  2. 计算出的Cobb角度小于10度（被过滤）")
            print("  3. 椎骨检测置信度过低（被过滤）")
            print("\n请查看服务端控制台的 [DEBUG] 输出获取详细信息")
        
        # 显示所有测量项
        print("\n所有测量项详情:")
        print("-" * 60)
        for i, m in enumerate(result['measurements'], 1):
            print(f"\n{i}. {m['type']}")
            if 'angle' in m:
                angle = m['angle']
                if angle > 0:
                    print(f"   角度: {angle:.2f}° (左边高)")
                elif angle < 0:
                    print(f"   角度: {angle:.2f}° (右边高)")
                else:
                    print(f"   角度: {angle:.2f}° (水平)")
            if 'upper_vertebra' in m:
                print(f"   上端椎: {m['upper_vertebra']}")
            if 'apex_vertebra' in m:
                print(f"   顶椎: {m['apex_vertebra']}")
            if 'lower_vertebra' in m:
                print(f"   下端椎: {m['lower_vertebra']}")
            print(f"   点数: {len(m['points'])}")
            for j, p in enumerate(m['points'], 1):
                print(f"     点{j}: ({p['x']:.1f}, {p['y']:.1f})")
        
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败！请确保服务已启动: python app.py")
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_vertebrae()

