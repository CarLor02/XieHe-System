import ImagingFrame from './ImagingFrame';

interface ImagingErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ImagingErrorState({
  message,
  onRetry,
}: ImagingErrorStateProps) {
  return (
    <ImagingFrame>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-red-600 mb-4">
          <i className="ri-error-warning-line text-4xl mb-2"></i>
          <p className="text-lg font-semibold">{message}</p>
        </div>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    </ImagingFrame>
  );
}
