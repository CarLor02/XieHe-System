"""Team-domain failures independent from FastAPI and SQLAlchemy."""


class TeamDomainError(Exception):
    """Base class for expected team business failures."""


class TeamValidationError(TeamDomainError):
    """A team command contains invalid data or an invalid state transition."""


class TeamNotFound(TeamDomainError):
    def __init__(self, message: str = "团队不存在或已停用") -> None:
        super().__init__(message)


class TeamUserNotFound(TeamDomainError):
    def __init__(self, message: str = "用户不存在") -> None:
        super().__init__(message)


class TeamPermissionDenied(TeamDomainError):
    """The current actor cannot perform the requested team operation."""


class TeamConflict(TeamDomainError):
    """A team resource conflicts with an existing record."""


class JoinRequestNotFound(TeamDomainError):
    def __init__(self, message: str = "加入申请不存在") -> None:
        super().__init__(message)


class InvitationNotFound(TeamDomainError):
    def __init__(self, message: str = "邀请不存在") -> None:
        super().__init__(message)
