# Imaging Module Feature Architecture

`frontend/app/imaging/page.tsx` is the route shell for the image list. It should
stay thin and delegate state orchestration to `application/hooks` and business
or UI slices to `features/`.

## Directory Layout

```text
imaging/
├── application/
│   └── hooks/useImagingPageController.ts
├── domain/
│   └── imagingFilters.ts
├── features/
│   ├── image-actions/
│   ├── image-list/
│   ├── image-preview/
│   └── search-filters/
├── page.tsx
└── viewer/
```

## Responsibilities

- `application/hooks/useImagingPageController.ts` composes auth routing, URL
  filters, image list loading, preview state, and image actions for the route.
- `domain/imagingFilters.ts` owns review-status URL parsing, exam type options,
  list view mode types, and API filter construction.
- `features/image-preview` owns blob preview loading, retry, timeout, abort, and
  object URL cleanup.
- `features/image-actions` owns download/delete actions, action-menu placement,
  and exam-type update modal state.
- `features/search-filters` renders the search, advanced filters, view switch,
  and upload/batch action surface.
- `features/image-list` renders loading/error frames, grid/list rows, empty
  states, status badges, and pagination.

## Import Rules

- `page.tsx` imports the controller and top-level feature components only.
- Feature hooks may call `frontend/services/imageServices`, but feature
  components receive data/actions through props.
- Viewer code lives under `imaging/viewer`; list-page features should not import
  viewer internals except route links to `/imaging/viewer?id=...`.

## Validation Checklist

- `wc -l frontend/app/imaging/page.tsx frontend/app/imaging/viewer/page.tsx`
  should show both route files remain thin.
- `rg "@/app/imaging/viewer/image-viewer|./image-viewer|image-viewer/public" frontend`
  should not show active imports.
- `npm --prefix frontend run build` should prerender both `/imaging` and
  `/imaging/viewer`.
