"""Patient interface public entrypoint."""

from .http.v1 import router

__all__ = ["router"]
