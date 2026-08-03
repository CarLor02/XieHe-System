"""Object lifecycle application failures."""


class ObjectDeletionError(RuntimeError):
    """A storage object could not be physically deleted."""
