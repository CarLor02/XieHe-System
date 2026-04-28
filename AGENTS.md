# 移动端(KMP)开发规则

- Backend APIs may be incomplete or unstable; verify endpoints with tools like `curl` before implementation, and defer features that depend on broken APIs.
- Every code change must be recorded (clear commit message and/or changelog note).
- After every major change, create a Git commit immediately.
- For this repository, after each completed round of modifications, create exactly one Git commit before starting the next requested change.
- When adding a new icon token or drawable, update every platform/resource mapping at the same time. At minimum, check `IconPainterContract.kt`, Android actual mappings such as `IconPainter.android.kt`, and any other exhaustive `when` mappings for icons.
- If a required icon is missing, add it as an SVG under `composeApp/src/commonMain/composeResources/drawable/` and wire it into the shared icon token/mapping flow instead of reusing an unrelated icon.
- 使用颜色时，应该使用 `theme/ThemePalettes.kt` 颜色体系里的语义颜色，不要在界面代码中硬编码颜色值。
- Run "./gradlew :composeApp:compileKotlinMetadata", "./gradlew :composeApp:testAndroidHostTest", "./gradlew :androidApp:assembleDebug", and "./gradlew :composeApp:compileKotlinIosSimulatorArm64" after code change to check errors
