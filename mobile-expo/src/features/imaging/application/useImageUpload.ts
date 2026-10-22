import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { getApiErrorMessage } from '@xiehe/api-client';
import { useWorkspace } from '../../../application/AppProvider';
import { readMobileFile } from '../../../infrastructure/files/readMobileFile';
import type { MobileUploadFile } from '../domain/upload';

export function useImageUpload() {
  const { services } = useWorkspace();
  const [file, setFile] = useState<MobileUploadFile>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!busy) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );
    return () => subscription.remove();
  }, [busy]);
  const pick = async (source: 'file' | 'gallery' | 'camera') => {
    setError('');
    try {
      if (source === 'file') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/png', 'image/jpeg', 'image/tiff'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (!result.canceled) setFile(readMobileFile(result.assets[0]));
      } else {
        if (
          source === 'camera' &&
          !(await ImagePicker.requestCameraPermissionsAsync()).granted
        )
          throw new Error('需要相机权限才能拍照，请在系统设置中允许访问相机');
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                quality: 1,
                allowsEditing: false,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsEditing: false,
              });
        if (!result.canceled) {
          const asset = result.assets[0];
          setFile(
            readMobileFile({
              uri: asset.uri,
              name: asset.fileName || `spine-${Date.now()}.jpg`,
              size: asset.fileSize,
              mimeType: asset.mimeType,
            })
          );
        }
      }
      setProgress(0);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  };
  const upload = async (
    patientId: number | null,
    examType: string,
    teamIds: number[]
  ) => {
    if (!file) {
      setError('请先选择影像文件');
      return;
    }
    if (!examType) {
      setError('请选择检查类型');
      return;
    }
    setError('');
    setBusy(true);
    setProgress(0);
    try {
      const id = await services.upload(
        file,
        patientId,
        examType,
        teamIds,
        setProgress
      );
      router.replace({ pathname: '/images/[id]', params: { id } });
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return { file, busy, progress, error, pick, upload };
}
