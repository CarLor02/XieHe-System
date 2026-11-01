"""标注文档的 HTTP JSON 契约。"""

from typing import TypeAlias

from pydantic import JsonValue, SerializeAsAny

# FastAPI 0.104 / Pydantic 2.5 的响应 TypeAdapter 会将递归 JsonValue 中的
# bool 按 int 序列化。保留 JSON 校验和 OpenAPI schema，输出时使用实际值类型。
AnnotationJson: TypeAlias = dict[str, SerializeAsAny[JsonValue]]
