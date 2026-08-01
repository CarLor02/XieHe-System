"""Redis state infrastructure exceptions."""


class RedisStateUnavailable(RuntimeError):
    """Raised when durable security or coordination state cannot be accessed."""
