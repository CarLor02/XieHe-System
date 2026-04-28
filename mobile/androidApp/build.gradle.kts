import com.android.ide.common.vectordrawable.Svg2Vector
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.io.ByteArrayOutputStream
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction

plugins {
    alias(libs.plugins.kotlinAndroid)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeCompiler)
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
    }
}

val allowCleartextTrafficOverride = providers
    .gradleProperty("allowCleartextTraffic")
    .orNull
    ?.toBooleanStrictOrNull()

val composeSvgDir = project(":composeApp")
    .layout
    .projectDirectory
    .dir("src/commonMain/composeResources/drawable")
val generatedVectorsResDir = layout.buildDirectory.dir("generated/svg2vector/res")

abstract class GenerateAndroidVectorsFromSvgTask : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val sourceDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outResDir: DirectoryProperty

    @TaskAction
    fun generate() {
        val source = sourceDir.asFile.get()
        val outDir = outResDir.asFile.get().resolve("drawable")
        outDir.mkdirs()
        outDir.listFiles()?.forEach { it.delete() }

        val svgFiles = source.listFiles()
            ?.filter { it.isFile && it.extension.equals("svg", ignoreCase = true) && it.name.startsWith("icons_") }
            ?.sortedBy { it.name }
            .orEmpty()

        svgFiles.forEach { svg ->
            val xmlBytes = ByteArrayOutputStream()
            val report = Svg2Vector.parseSvgToXml(svg.toPath(), xmlBytes)
            if (xmlBytes.size() == 0) {
                error("Failed to convert ${svg.name} to VectorDrawable. Report: ${report.ifBlank { "empty" }}")
            }
            if (report.isNotBlank()) {
                logger.warn("SVG convert report for ${svg.name}: $report")
            }
            outDir.resolve("${svg.nameWithoutExtension}.xml")
                .writeText(xmlBytes.toString(Charsets.UTF_8.name()))
        }
    }
}

val generateAndroidVectorsFromSvg by tasks.registering(GenerateAndroidVectorsFromSvgTask::class) {
    group = "resources"
    description = "Generate Android VectorDrawable XML files from composeApp SVG icons."
    sourceDir.set(composeSvgDir)
    outResDir.set(generatedVectorsResDir)
}

android {
    namespace = "com.xiehe.spine"
    compileSdk = libs.versions.android.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.xiehe.spine"
        minSdk = libs.versions.android.minSdk.get().toInt()
        targetSdk = libs.versions.android.targetSdk.get().toInt()
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] =
                (allowCleartextTrafficOverride ?: true).toString()
            buildConfigField("String", "BASE_URL", "\"http://115.190.121.59:8080/api/v1\"")
        }
        getByName("release") {
            isMinifyEnabled = false
            manifestPlaceholders["usesCleartextTraffic"] =
                (allowCleartextTrafficOverride ?: false).toString()
            buildConfigField("String", "BASE_URL", "\"http://115.190.121.59:8080/api/v1\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    sourceSets.getByName("main").res.srcDir(generatedVectorsResDir)
}

tasks.named("preBuild").configure {
    dependsOn(generateAndroidVectorsFromSvg)
}

dependencies {
    implementation(project(":composeApp"))
    implementation(libs.androidx.activity.compose)
    debugImplementation(libs.compose.uiTooling)
}
