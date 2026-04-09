import { useState } from 'react';

/**
 * annotation JSON、measurements 与本地状态持久化入口。
 * 当前先统一保存状态提示与加载标记，后续继续下沉副作用。
 */
export function useAnnotationPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [isMeasurementsLoading, setIsMeasurementsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  return {
    isSaving,
    setIsSaving,
    isMeasurementsLoading,
    setIsMeasurementsLoading,
    saveMessage,
    setSaveMessage,
  };
}

