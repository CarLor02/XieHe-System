import ImagingFrame from './ImagingFrame';

interface ImagingLoadingStateProps {
  message: string;
}

export default function ImagingLoadingState({
  message,
}: ImagingLoadingStateProps) {
  return (
    <ImagingFrame>
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </ImagingFrame>
  );
}
