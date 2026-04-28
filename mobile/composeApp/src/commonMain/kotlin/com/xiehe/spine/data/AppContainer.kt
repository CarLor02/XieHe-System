package com.xiehe.spine.data

import com.xiehe.spine.core.store.InMemoryKeyValueStore
import com.xiehe.spine.core.store.KeyValueStore
import com.xiehe.spine.core.store.SessionStore
import com.xiehe.spine.data.ai.AiInferenceRepository
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.data.auth.SessionRefresher
import com.xiehe.spine.data.cache.ImageBinaryStore
import com.xiehe.spine.data.cache.ImageCacheRepository
import com.xiehe.spine.data.cache.InMemoryImageBinaryStore
import com.xiehe.spine.data.dashboard.DashboardRepository
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.measurement.MeasurementRepository
import com.xiehe.spine.data.notification.NotificationRepository
import com.xiehe.spine.data.organization.OrganizationRepository
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.data.report.ReportRepository
import com.xiehe.spine.data.theme.ThemePreferenceRepository
import com.xiehe.spine.data.welcomeInstruction.WelcomeInstructionRepository
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

private const val defaultBaseUrl = "http://115.190.121.59:8080/api/v1"

class AppContainer private constructor(
    val authRepository: AuthRepository,
    val dashboardRepository: DashboardRepository,
    val patientRepository: PatientRepository,
    val imageFileRepository: ImageFileRepository,
    val imageCacheRepository: ImageCacheRepository,
    val notificationRepository: NotificationRepository,
    val organizationRepository: OrganizationRepository,
    val measurementRepository: MeasurementRepository,
    val reportRepository: ReportRepository,
    val aiInferenceRepository: AiInferenceRepository,
    val themeRepository: ThemePreferenceRepository,
    val welcomeInstructionRepository: WelcomeInstructionRepository,
) {
    companion object {
        fun create(
            store: KeyValueStore,
            baseUrl: String = defaultBaseUrl,
            enableNetworkDiagnostics: Boolean = false,
            httpClient: HttpClient? = null,
            imageBinaryStore: ImageBinaryStore = InMemoryImageBinaryStore(),
        ): AppContainer {
            val json = Json {
                ignoreUnknownKeys = true
                isLenient = true
                explicitNulls = false
            }
            val sharedHttpClient = httpClient ?: createDefaultHttpClient(
                json = json,
                enableNetworkDiagnostics = enableNetworkDiagnostics,
            )
            val instrumentedApiClient = ApiClient(
                httpClient = sharedHttpClient,
                baseUrl = baseUrl,
                enableDiagnostics = enableNetworkDiagnostics,
            )
            val sessionStore = SessionStore(store = store, json = json)
            val sessionRefresher = SessionRefresher(
                apiClient = instrumentedApiClient,
                sessionStore = sessionStore,
            )
            val authenticatedApiClient = AuthenticatedApiClient(
                apiClient = instrumentedApiClient,
                sessionStore = sessionStore,
                sessionRefresher = sessionRefresher,
            )
            val authRepository = AuthRepository(
                apiClient = instrumentedApiClient,
                sessionStore = sessionStore,
                sessionRefresher = sessionRefresher,
                authenticatedApiClient = authenticatedApiClient,
            )
            val imageCacheRepository = ImageCacheRepository(
                store = store,
                json = json,
                binaryStore = imageBinaryStore,
            )
            return AppContainer(
                authRepository = authRepository,
                dashboardRepository = DashboardRepository(
                    authenticatedApiClient = authenticatedApiClient,
                ),
                patientRepository = PatientRepository(
                    authenticatedApiClient = authenticatedApiClient,
                    imageCacheRepository = imageCacheRepository,
                ),
                imageFileRepository = ImageFileRepository(
                    apiClient = instrumentedApiClient,
                    authenticatedApiClient = authenticatedApiClient,
                    cacheRepository = imageCacheRepository,
                ),
                imageCacheRepository = imageCacheRepository,
                notificationRepository = NotificationRepository(
                    authenticatedApiClient = authenticatedApiClient,
                ),
                organizationRepository = OrganizationRepository(
                    authenticatedApiClient = authenticatedApiClient,
                ),
                measurementRepository = MeasurementRepository(
                    authenticatedApiClient = authenticatedApiClient,
                ),
                reportRepository = ReportRepository(
                    authenticatedApiClient = authenticatedApiClient,
                ),
                aiInferenceRepository = AiInferenceRepository(httpClient = sharedHttpClient),
                themeRepository = ThemePreferenceRepository(store = store),
                welcomeInstructionRepository = WelcomeInstructionRepository(store = store),
            )
        }

        fun createInMemory(
            baseUrl: String = defaultBaseUrl,
            enableNetworkDiagnostics: Boolean = false,
            httpClient: HttpClient? = null,
        ): AppContainer {
            return create(
                store = InMemoryKeyValueStore(),
                baseUrl = baseUrl,
                enableNetworkDiagnostics = enableNetworkDiagnostics,
                httpClient = httpClient,
                imageBinaryStore = InMemoryImageBinaryStore(),
            )
        }

        private fun createDefaultHttpClient(
            json: Json,
            enableNetworkDiagnostics: Boolean,
        ): HttpClient {
            return HttpClient {
                install(ContentNegotiation) {
                    json(json)
                }
                install(Logging) {
                    logger = object : Logger {
                        override fun log(message: String) {
                            // Keep network logging opt-in and non-crashing across targets.
                        }
                    }
                    level = if (enableNetworkDiagnostics) LogLevel.HEADERS else LogLevel.NONE
                }
            }
        }
    }
}
