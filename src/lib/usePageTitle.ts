import { useEffect } from 'react';

export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title) {
      document.title = title;
    } else {
      document.title = 'Sangam — Everything. One Sangam.';
    }
  }, [title]);
}
