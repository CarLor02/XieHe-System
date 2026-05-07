# Image Viewer Feature Architecture

`frontend/app/imaging/viewer/page.tsx` only owns the Next.js route boundary. The
viewer implementation is isolated in `frontend/app/imaging/viewer/` and is now
organized by feature instead of by a single horizontal component tree.

## Principles

- `page.tsx` is a thin render shell: it reads the route query, calls the
  application controller, and
  renders the page layout.
- `application/hooks/useImageViewerController.ts` is the root application layer:
  it composes feature hooks and maps them into header, canvas, toolbar, and
  dialog props.
- Business rules live in feature `domain/` and `usecases/`; UI components do not
  own measurement, keypoint, AI, persistence, or import/export rules.
- Feature internals are not imported from outside the viewer. External modules
  use `viewer/public.ts`.
- `shared/` is only for cross-feature types, constants, geometry helpers, and
  text/label helpers.

## Directory Layout

```text
viewer/
├── application/
│   └── hooks/
├── page.tsx
├── public.ts
├── shared/
│   ├── constants/
│   ├── geometry/
│   ├── labels/
│   └── types.ts
└── features/
    ├── ai-measurement/
    ├── annotation-canvas/
    ├── bindings/
    ├── keypoints/
    ├── measurements/
    ├── report/
    ├── study/
    └── toolbar/
```

## Feature Responsibilities

### `features/study`

Owns study/image data loading and user capability checks.

- `hooks/useStudyDataLoader.ts` loads image metadata and persisted annotations.
- `hooks/useImageStudy.ts` owns page-level study state.
- `hooks/useImageListFetcher.ts` owns viewer image list fetches.
- `hooks/useStudyHeaderActions.ts` owns save and AI measurement header actions.
- `domain/viewer-permissions.ts` maps user roles to viewer capabilities.
- `components/StudyHeader.tsx` renders the header actions and state.

### `features/measurements`

Owns measurement tools, formulas, persistence, JSON import/export, and
dependency rules between measurements.

- `catalog/` defines AP, lateral, and auxiliary tools.
- `domain/annotation-calculation.ts` contains pure measurement formulas.
- `domain/annotation-inheritance.ts` contains inherited/shared point rules.
- `domain/annotation-uniqueness.ts` defines uniqueness and duplicate filtering.
- `usecases/addMeasurementUseCase.ts` creates/replaces measurements.
- `usecases/saveMeasurementsUseCase.ts` persists measurements and annotation
  payloads.
- `usecases/annotationJsonUseCase.ts` handles JSON import/export.
- `usecases/measurementDependencyUseCase.ts` handles lateral CFH/S1 dependency
  cleanup and restoration.
- `hooks/useMeasurementCalculation.ts` builds calculation context and value
  helpers.
- `hooks/useMeasurementWorkflow.ts` owns measurement add/delete, inherited-point
  preload, JSON import/export wiring, and automatic measurement restoration.
- `hooks/useStandardDistanceActions.ts` owns standard-distance toolbar actions
  and AVT/TTS gating.

### `features/keypoints`

Owns keypoint state, vertebra derivation, and measurement rebuilding from
keypoints.

- `domain/keypoint-state.ts` is the keypoint state model and conversion layer.
- `domain/vertebrae-derive.ts` derives measurements from vertebra annotations.
- `domain/measurement-keypoint-writeback.ts` maps measurement point edits back
  into keypoints/vertebrae.
- `usecases/keypointMeasurementUseCase.ts` creates AP keypoint measurements,
  rebuilds derived measurements, and keeps bound Cobb/AVT/TTS/center
  measurements consistent.
- `hooks/useKeypointMeasurementWorkflow.ts` owns keypoint layer state, derived
  measurement rebuilds, vertebra drag callbacks, keypoint add/delete callbacks,
  and detection-layer toggling.

### `features/ai-measurement`

Owns AI measurement and AI keypoint detection workflows.

- `usecases/aiDetectionUseCase.ts` runs AP/lateral keypoint detection.
- `usecases/aiMeasurementWorkflowUseCase.ts` parses AI measurement responses,
  scales points, filters S1-derived lateral data, updates bindings, and uses the
  lateral detection cache for non-S1 derived measurements.

### `features/bindings`

Owns point binding state and UI.

- `domain/annotation-binding.ts` defines binding groups and cleanup/merge rules.
- `hooks/useAnnotationEngine.ts` owns automatic and manual binding state.
- `components/BindingPanel.tsx` renders the binding controls.

### `features/annotation-canvas`

Owns the image canvas interaction surface.

- `AnnotationCanvas.tsx` composes viewport, pointer, drag, drawing, selection,
  and overlay hooks.
- `components/StandardDistanceWarningDialog.tsx` renders the shared
  standard-distance prerequisite dialog.
- `domain/` contains canvas-only pure helpers for hit testing, tool state, and
  coordinate transforms.
- `hooks/` owns canvas interaction state and event handlers.
- `layers/` renders image, measurements, previews, overlays, selection, and
  vertebrae.
- `renderers/` renders medical measurement tools and support shapes.
- `panels/` renders canvas-local controls, hints, and measurement results.

### `features/toolbar`

Owns the right-side tool surface and icons. It consumes measurement, keypoint,
binding, and report state through props; it does not mutate domain data itself.

### `features/report`

Owns report display and report generation.

- `components/ReportPanel.tsx` renders generated report text.
- `hooks/useReportActions.ts` owns generate/copy report callbacks.
- `usecases/generateReportUseCase.ts` calls the backend report generator.

## Import Rules

- `page.tsx` imports only the application controller and feature components
  needed for page layout.
- The application controller may compose feature barrels such as
  `./features/measurements`, but feature business rules should stay in their own
  `hooks/`, `domain/`, and `usecases/`.
- Cross-feature imports should target another feature's public `index.ts` or a
  clearly owned domain/usecase file.
- External modules, such as `frontend/app/data-export`, must import viewer
  types/render helpers from `@/app/imaging/viewer/public`.
- Do not reintroduce root-level `components/`, `domain/`, `hooks/`, `usecase/`,
  `catalog/`, or `canvas/` directories under `viewer/`.

## Validation Checklist

- `rg "@/app/imaging/viewer/image-viewer|./image-viewer|image-viewer/public" frontend`
  should not show active imports.
- `npm --prefix frontend run type-check` should not introduce new
  viewer errors.
- `npm --prefix frontend run build` should render the viewer route with the new
  feature paths.
