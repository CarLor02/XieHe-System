import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Modal, Text, View } from 'react-native';
import {
  ReactCrop,
  convertToPixelCrop,
  type PercentCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { colors, layout, spacing } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import type { CroppedImage, ImageCropper } from './types';

type Request = { uri: string; resolve: (image: CroppedImage | null) => void };

export function useImageCropper(): ImageCropper {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<Request | null>(null);
  useEffect(
    () => () => {
      pending.current?.resolve(null);
    },
    []
  );
  const open = useCallback(
    (uri: string) =>
      new Promise<CroppedImage | null>(resolve => {
        pending.current?.resolve(null);
        const next = { uri, resolve };
        pending.current = next;
        setRequest(next);
      }),
    []
  );
  const finish = (image: CroppedImage | null) => {
    pending.current?.resolve(image);
    pending.current = null;
    setRequest(null);
  };
  return {
    open,
    element: request ? (
      <CropDialog key={request.uri} uri={request.uri} onFinish={finish} />
    ) : null,
  };
}

function CropDialog({
  uri,
  onFinish,
}: {
  uri: string;
  onFinish: (image: CroppedImage | null) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<PercentCrop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    const image = imageRef.current;
    if (!image || !loaded || busy) return;
    setBusy(true);
    setError('');
    const context = ImageManipulator.manipulate(uri);
    try {
      const rect = convertToPixelCrop(
        crop,
        image.naturalWidth,
        image.naturalHeight
      );
      context.crop({
        originX: rect.x,
        originY: rect.y,
        width: rect.width,
        height: rect.height,
      });
      const result = await context.renderAsync();
      try {
        onFinish(await result.saveAsync({ format: SaveFormat.PNG }));
      } finally {
        result.release();
      }
    } catch {
      setError('无法裁剪影像，请重新选择或使用原图');
    } finally {
      context.release();
      setBusy(false);
    }
  };
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onFinish(null);
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#000B',
          justifyContent: 'center',
          padding: spacing.md,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: '100%',
            maxWidth: 700,
            gap: spacing.md,
            backgroundColor: colors.card,
            padding: spacing.md,
            borderRadius: 20,
          }}
        >
          <Text style={layout.heading}>裁剪影像</Text>
          <View style={{ alignItems: 'center' }}>
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
              disabled={busy}
              keepSelection
              minWidth={1}
              minHeight={1}
            >
              {/* react-image-crop 需要真实 img 来测量布局，不能用 RN Image 的背景图包装。 */}
              <img
                ref={imageRef}
                src={uri}
                alt="待裁剪影像"
                onLoad={() => setLoaded(true)}
                onError={() => setError('无法读取此影像')}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                }}
              />
            </ReactCrop>
          </View>
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          )}
          <View style={layout.row}>
            <View style={layout.flex}>
              <Button
                title="取消"
                variant="secondary"
                disabled={busy}
                onPress={() => onFinish(null)}
              />
            </View>
            <View style={layout.flex}>
              <Button
                title="确定裁剪"
                disabled={!loaded || crop.width <= 0 || crop.height <= 0}
                loading={busy}
                onPress={() => void save()}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
