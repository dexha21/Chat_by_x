import { useEffect } from 'react';

export function useDebouncedEffect(callback, deps, delay) {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [...(deps || []), delay]);
}
