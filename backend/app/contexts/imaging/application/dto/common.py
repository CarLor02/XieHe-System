"""影像应用层跨用例共享的数据结构。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class PageResult(Generic[T]):
    """与 HTTP 表达无关的分页查询结果。"""

    items: list[T]
    total: int
