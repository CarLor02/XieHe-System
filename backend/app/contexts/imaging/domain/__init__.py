"""影像领域规则。"""

from .access import (
    ImageAccessActor,
    ImageAccessScope,
    ImageAccessTarget,
    build_image_access_scope,
    can_choose_image_uploader,
    can_modify_image,
    can_view_image,
)
from .annotation import (
    AnnotationItem,
    AnnotationItemChange,
    AnnotationItemKind,
    AnnotationMutationReason,
    AnnotationSource,
    canonicalize_annotation,
    diff_annotation_items,
    extract_annotation_items,
    has_annotation_content,
    normalize_audit_item_id,
    snapshots_equal,
)
from .errors import (
    AnnotationVersionConflictError,
    ImageFileNotFoundError,
    ImageTeamAssignmentDeniedError,
)
from .team_visibility import normalize_team_ids, require_all_teams_assignable

__all__ = [
    "AnnotationItem",
    "AnnotationItemChange",
    "AnnotationItemKind",
    "AnnotationMutationReason",
    "AnnotationSource",
    "AnnotationVersionConflictError",
    "ImageAccessActor",
    "ImageAccessScope",
    "ImageAccessTarget",
    "ImageFileNotFoundError",
    "ImageTeamAssignmentDeniedError",
    "build_image_access_scope",
    "canonicalize_annotation",
    "can_choose_image_uploader",
    "can_modify_image",
    "can_view_image",
    "diff_annotation_items",
    "extract_annotation_items",
    "has_annotation_content",
    "normalize_audit_item_id",
    "normalize_team_ids",
    "require_all_teams_assignable",
    "snapshots_equal",
]
