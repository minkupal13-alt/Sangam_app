import { create } from 'zustand';
import type { Post } from './types';

interface FeedState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  reset: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
  updatePost: (id, updates) =>
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  reset: () => set({ posts: [] }),
}));
