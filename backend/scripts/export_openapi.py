"""离线导出当前 FastAPI 契约，不启动 lifespan 或连接外部服务。"""

import argparse
import json
from pathlib import Path

from app.main import app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "apiContract" / "openapi.json",
    )
    parser.add_argument(
        "--check", action="store_true", help="只检查导出文件是否与源码一致"
    )
    arguments = parser.parse_args()
    target = arguments.output
    schema = app.openapi()
    content = json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if arguments.check:
        if not target.exists() or target.read_text(encoding="utf-8") != content:
            raise SystemExit("OpenAPI 已漂移，请在仓库根目录执行 npm run api:update")
        print(f"OpenAPI is up to date: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(target)
    print(f"Exported {len(schema['paths'])} API paths to {target}")


if __name__ == "__main__":
    main()
