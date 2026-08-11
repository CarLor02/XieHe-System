# Legacy ORM registrations

This package only contains persistence models that have not yet been assigned to a
bounded context. New business models must live under
`app/contexts/<context>/infrastructure/persistence/`.

Imaging models are owned and exported by
`app.contexts.imaging.infrastructure.persistence`; imaging lifecycle values are
owned by `app.contexts.imaging.domain`.
