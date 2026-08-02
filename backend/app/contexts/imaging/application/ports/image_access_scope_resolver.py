"""影像访问范围解析端口。"""

from typing import Protocol

from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope


class ImageAccessScopeResolver(Protocol):
    def resolve_scope(self, actor: ImageAccessActor) -> ImageAccessScope: ...
