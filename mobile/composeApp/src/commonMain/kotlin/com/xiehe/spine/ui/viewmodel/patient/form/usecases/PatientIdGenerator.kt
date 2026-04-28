package com.xiehe.spine.ui.viewmodel.patient

class PatientIdGenerator {
    operator fun invoke(): String {
        return "P${kotlin.random.Random.nextInt(10000000, 99999999)}"
    }
}
