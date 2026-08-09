# Image Viewer Feature Architecture

`frontend/app/imaging/viewer/page.tsx` only owns the Next.js route boundary.
The implementation is isolated in
`frontend/app/imaging/features/image-viewer/` and is organized by feature
instead of by a single horizontal component tree.

## Principles

- `page.tsx` is a thin render shell: it reads the route query, calls the
  application controller, and
  renders the page layout.
- `application/hooks/useImageViewerController.ts` is the root application layer:
  it composes feature hooks and maps them into header, canvas, toolbar, and
  dialog props.
- Cross-platform business rules live in `@xiehe/imaging-core`; Web-specific
  orchestration lives in feature `application/` and `usecases/`. UI components
  do not own measurement, keypoint, AI, persistence, or import/export rules.
- Feature internals are not imported from outside the viewer. External modules
  use `viewer/public.ts`.
- `shared/` only contains Web viewer helpers. Platform-neutral contracts,
  anatomy and geometry belong to `@xiehe/imaging-core`.

See [`shared-imaging-core.md`](./shared-imaging-core.md) for the workspace and
cross-platform dependency boundary.

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
    ├── measurement-keypoint-sync/
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

Owns Web measurement tool registration, persistence adapters, and React
workflows. Pure manual-tool and annotation rules live in core. See
[`manual-tool-domain.md`](./manual-tool-domain.md) for the detailed tool-domain
layout and dependency constraints.

- `catalog/` registers AP, lateral, and auxiliary Web tools and exposes visual
  metadata such as `rendererId`; it does not import canvas renderers.
- `@xiehe/imaging-core/measurements/{ap,lateral}` owns formulas, medical
  geometry, point layouts, resolvers and hit-testing rules.
- `@xiehe/imaging-core/measurements` owns canonical IDs, serialization,
  editability and uniqueness rules.
- `application/usecases/calculateMeasurementValue.ts` dispatches registered tool formulas.
- `application/usecases/annotationInheritanceUseCase.ts` contains inherited/shared point
  orchestration.
- `application/usecases/addMeasurementUseCase.ts` creates/replaces measurements.
- `application/usecases/saveMeasurementsUseCase.ts` persists measurements and annotation
  payloads.
- `application/usecases/measurementDependencyUseCase.ts` handles lateral CFH/S1 dependency
  cleanup and restoration.
- `application/hooks/useMeasurementCalculation.ts` builds calculation context and value
  helpers.
- `application/hooks/useStandardDistanceActions.ts` owns standard-distance toolbar actions
  and AVT/TTS gating.

### `features/keypoints`

Owns keypoint-only React state. Keypoint catalog, entities, layer conversion and
vertebra correction live in `@xiehe/imaging-core/keypoints`.

- `application/hooks/useKeypointLayerState.ts` owns keypoint/detection-layer
  state without reading or modifying measurements.

### `features/measurement-keypoint-sync`

Owns Web orchestration for operations that know both keypoints and measurements;
the dependency graph and pure workflows live in core. Detailed rules are documented in
[`measurement-keypoint-sync.md`](./measurement-keypoint-sync.md).

- `@xiehe/imaging-core/measurement-keypoint-sync` defines bidirectional binding,
  writeback, deletion plans and measurement derivation.
- `application/usecases/createBoundMeasurementUseCase.ts` creates bound
  Cobb/AVT/TTS/vertebra-center measurements.
- `application/usecases/synchronizeMeasurementsUseCase.ts` separates AI initial
  derivation, existing measurement recalculation, and unique non-Cobb
  derivation after keypoint changes.
- `application/hooks/useMeasurementKeypointWorkflow.ts` coordinates React state
  across the two sibling features.
- `application/hooks/useMeasurementWorkflow.ts` owns measurement commands that
  also write or delete bound keypoints.

### `features/ai-measurement`

Owns AI measurement and AI keypoint detection workflows.

- `usecases/aiDetectionUseCase.ts` runs AP/lateral keypoint detection.
- `usecases/aiMeasurementWorkflowUseCase.ts` parses AI measurement responses,
  scales points, filters S1-derived lateral data, updates bindings, and uses the
  lateral detection cache for non-S1 derived measurements.

### `features/bindings`

Owns point binding React state and UI. Binding schema, validation, propagation
and historical migration live in `@xiehe/imaging-core/bindings`.

- `hooks/useAnnotationEngine.ts` owns automatic and manual binding state.
- `components/BindingPanel.tsx` renders the binding controls.

### `features/annotation-canvas`

Owns the image canvas interaction surface.

- `presentation/AnnotationCanvas.tsx` is a thin composition view.
- `presentation/hooks/useAnnotationCanvasController.ts` composes viewport,
  pointer, drag, drawing, selection, and overlay state into layer/panel props.
- `presentation/components/StandardDistanceWarningDialog.tsx` renders the shared
  standard-distance prerequisite dialog.
- `@xiehe/imaging-core/canvas` contains state models, pure geometric hit testing,
  input policies and DOM-free coordinate transforms.
- `application/` owns measurement-aware hit testing and canvas interaction
  state.
- `presentation/{layers,renderers,panels}` renders the image, SVG annotations,
  previews, controls, and results.
- `presentation/renderers/special-annotation-renderer-registry.tsx` maps
  catalog `rendererId` values to JSX implementations. Measurements never
  import this registry.

See [`annotation-canvas.md`](./annotation-canvas.md) for the detailed layering
and renderer dependency direction.

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
- Platform-neutral imports target an `@xiehe/imaging-core/*` public subpath.
  Web cross-feature UI imports target another feature's public `index.ts`.
- `keypoints` and `measurements` are sibling features and must not depend on one
  another. Cross-domain logic belongs to `measurement-keypoint-sync`, which may
  depend on both.
- `measurements` must not import `annotation-canvas`. The canvas presentation
  consumes measurement catalog metadata and resolves renderer IDs locally.
- Core canvas must not access React or browser globals, and Web
  `annotation-canvas/application` must not import presentation.
- External modules, such as `frontend/app/data-export`, must import viewer
  types/render helpers from `@/app/imaging/viewer/public`.
- Do not reintroduce root-level `components/`, `domain/`, `hooks/`, `usecase/`,
  `catalog/`, or `canvas/` directories under `viewer/`.

## Validation Checklist

- `packages/xiehe-imaging-core/tests/platform-boundaries.test.ts` must reject
  platform runtime dependencies.
- `npm --prefix frontend run type-check` should not introduce new
  viewer errors.
- `npm --prefix frontend run build` should render the viewer route with the new
  feature paths.
