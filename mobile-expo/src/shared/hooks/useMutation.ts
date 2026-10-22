import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';

/** Serialize writes per form; failures retain the caller's draft and never simulate success. */
export function useMutation() {
  const lock = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const run = async <T>(
    action: () => Promise<T>,
    success?: (value: T) => void,
    notice = '已保存'
  ) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const value = await action();
      if (alive.current) {
        setMessage(notice);
        success?.(value);
      }
      return true;
    } catch (cause) {
      if (alive.current) setError(getApiErrorMessage(cause));
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return {
    busy,
    error,
    message,
    run,
    clear: () => {
      setError('');
      setMessage('');
    },
  };
}
