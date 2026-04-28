package com.xiehe.spine

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = createAndroidAppContainer(
            context = applicationContext,
            baseUrl = BuildConfig.BASE_URL,
            enableNetworkDiagnostics = BuildConfig.DEBUG,
        )
        setContent {
            App(
                container = container,
                showNetworkDiagnostics = BuildConfig.DEBUG,
            )
        }
    }
}
