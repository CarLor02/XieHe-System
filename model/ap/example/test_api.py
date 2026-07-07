#!/usr/bin/env python3
"""
Spine Analysis API 测试脚本

使用方法:
    1. 先启动服务: python app.py
    2. 运行测试: python example/test_api.py

依赖:
    pip install requests
"""

import requests
import json
import sys
from pathlib import Path

# API 配置
API_BASE_URL = "http://localhost:8000"
TEST_IMAGE = Path(__file__).parent / "test_spine.png"
OUTPUT_FILE = Path(__file__).parent / "result.json"


def test_health():
    """测试健康检查接口"""
    print("=" * 50)
    print("测试健康检查接口: GET /health")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        response.raise_for_status()
        result = response.json()
        print(f"状态: {result['status']}")
        print(f"Pose 模型: {'✅ 已加载' if result['pose_model'] else '❌ 未加载'}")
        print(f"Pose Corner 模型: {'✅ 已加载' if result['pose_corner_model'] else '❌ 未加载'}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败！请确保服务已启动: python app.py")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def test_predict():
    """测试推理接口"""
    print("\n" + "=" * 50)
    print("测试推理接口: POST /api/measurement")
    print("=" * 50)
    print("AP service no longer exposes upload prediction. Use object-storage /api/measurement.")
    return False


def main():
    """主函数"""
    print("\n🔬 Spine Analysis API 测试\n")
    
    # 测试健康检查
    if not test_health():
        sys.exit(1)
    
    # 测试推理
    if not test_predict():
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ 所有测试通过!")
    print("=" * 50)


if __name__ == "__main__":
    main()
