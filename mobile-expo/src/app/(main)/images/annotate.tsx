import { useLocalSearchParams } from 'expo-router';
import { useWorkspace } from '../../../application/AppProvider';
import { ImageEditorScreen } from '../../../features/image-editor';

export default function ImageAnnotationRoute() {
  const { id, panel } = useLocalSearchParams<{ id: string; panel?: string }>();
  const { services } = useWorkspace();
  return (
    <ImageEditorScreen
      imageId={Number(id)}
      gateway={services.imageEditor}
      initialPanel={panel}
    />
  );
}
