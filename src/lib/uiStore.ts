import { create } from 'zustand';

interface UIState {
  createOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  flickUploadOpen: boolean;
  openFlickUpload: () => void;
  closeFlickUpload: () => void;
  videoUploadOpen: boolean;
  openVideoUpload: () => void;
  closeVideoUpload: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  createOpen: false,
  openCreate: () => set({ createOpen: true }),
  closeCreate: () => set({ createOpen: false }),
  flickUploadOpen: false,
  openFlickUpload: () => set({ flickUploadOpen: true }),
  closeFlickUpload: () => set({ flickUploadOpen: false }),
  videoUploadOpen: false,
  openVideoUpload: () => set({ videoUploadOpen: true }),
  closeVideoUpload: () => set({ videoUploadOpen: false }),
}));
