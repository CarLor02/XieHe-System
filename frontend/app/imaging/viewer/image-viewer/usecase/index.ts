import {saveMeasurements} from "@/app/imaging/viewer/image-viewer/usecase/saveMeasurementsUseCase";
import {aiDetect, detectLateralVertebrae} from "@/app/imaging/viewer/image-viewer/usecase/aiDetectionUseCase";
import {generateReport} from "@/app/imaging/viewer/image-viewer/usecase/generateReportUseCase";
import {addMeasurement} from "@/app/imaging/viewer/image-viewer/usecase/addMeasurementUseCase";

export {
    aiDetect,
    detectLateralVertebrae,
    saveMeasurements,
    generateReport,
    addMeasurement
}