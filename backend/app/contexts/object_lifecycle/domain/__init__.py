"""Object lifecycle domain rules."""

from .retention import (
    ObjectCleanupCandidate,
    ObjectOwnerKind,
    ObjectRetentionPolicy,
)

__all__ = [
    "ObjectCleanupCandidate",
    "ObjectOwnerKind",
    "ObjectRetentionPolicy",
]
