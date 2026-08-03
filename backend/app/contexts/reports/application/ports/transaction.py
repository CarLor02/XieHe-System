"""Transaction boundary for report-management use cases."""

from typing import Protocol


class ReportTransaction(Protocol):
    def commit(self) -> None: ...

    def rollback(self) -> None: ...
