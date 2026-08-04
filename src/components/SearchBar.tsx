import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Hash, TrendingUp, Clock, Loader2, BadgeCheck } from 'lucide-react';
import type { SearchSuggestion } from '@/lib/types';
import { fetchSuggestions, getRecentSearches, clearRecentSearches, addRecentSearch, saveSearchHistory } from '@/lib/searchApi';

export default function SearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced suggestions
  const debouncedFetch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const results = await fetchSuggestions(q);
      setSuggestions(results);
      setLoading(false);
    }, 400);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    if (val.trim()) {
      setShowDropdown(true);
      setLoading(true);
      debouncedFetch(val);
    } else {
      setShowDropdown(true);
      setSuggestions([]);
      setLoading(false);
    }
  }

  function handleFocus() {
    setShowDropdown(true);
    setRecentSearches(getRecentSearches());
  }

  function handleSearch(q: string) {
    const query = q.trim();
    if (!query) return;
    addRecentSearch(query);
    saveSearchHistory(query);
    setShowDropdown(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Flatten suggestions into a navigable list
    const flatItems: { type: string; value: string }[] = [];
    suggestions.forEach((s) => {
      if (s.type === 'user' && s.user) {
        flatItems.push({ type: 'user', value: s.user.username });
      } else if (s.type === 'hashtag' && s.hashtag) {
        flatItems.push({ type: 'hashtag', value: s.hashtag.tag_name });
      } else if (s.type === 'post' && s.post) {
        flatItems.push({ type: 'post', value: '' });
      }
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        const item = flatItems[activeIndex];
        if (item.type === 'hashtag') {
          handleSearch(`#${item.value}`);
        } else {
          handleSearch(query);
        }
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function handleSuggestionClick(s: SearchSuggestion) {
    if (s.type === 'user' && s.user) {
      addRecentSearch(s.user.full_name);
      saveSearchHistory(s.user.full_name);
      setShowDropdown(false);
      setQuery('');
      navigate(`/u/${s.user.username}`);
    } else if (s.type === 'hashtag' && s.hashtag) {
      addRecentSearch(`#${s.hashtag.tag_name}`);
      saveSearchHistory(`#${s.hashtag.tag_name}`);
      setShowDropdown(false);
      setQuery('');
      navigate(`/hashtag/${s.hashtag.tag_name}`);
    } else if (s.type === 'post') {
      handleSearch(query);
    }
  }

  // Don't show search bar on the search results page itself
  if (location.pathname.startsWith('/search')) return null;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={t('explore.searchPlaceholder')}
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-gray-100 dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-navy-100 transition-all text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-navy-200 rounded-2xl border border-gray-200 dark:border-navy-300 shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {/* Recent searches (when no query) */}
          {!query.trim() && !loading && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('search.recent')}</span>
                <button
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-xs text-brand-500 hover:underline"
                >
                  {t('search.clearAll')}
                </button>
              </div>
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-navy-300 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{s}</span>
                </button>
              ))}
            </div>
          )}

          {/* No query, no recent searches */}
          {!query.trim() && !loading && recentSearches.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Search className="h-8 w-8 text-gray-300 dark:text-navy-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('search.noRecent')}</p>
            </div>
          )}

          {/* Suggestions */}
          {query.trim() && !loading && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">{t('search.noSuggestions')} "{query}"</p>
            </div>
          )}

          {query.trim() && suggestions.length > 0 && (
            <div>
              {/* Users */}
              {suggestions.filter((s) => s.type === 'user').length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('search.people')}</p>
                  {suggestions
                    .filter((s) => s.type === 'user')
                    .map((s, i) => {
                      const flatIndex = suggestions.indexOf(s);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                            activeIndex === flatIndex ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-navy-300'
                          }`}
                        >
                          <img
                            src={s.user?.avatar_url || `https://ui-avatars.com/api/?name=${s.user?.full_name || 'U'}`}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {s.user?.full_name}
                              </span>
                              {s.user?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-400 truncate">@{s.user?.username}</p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Hashtags */}
              {suggestions.filter((s) => s.type === 'hashtag').length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('search.hashtags')}</p>
                  {suggestions
                    .filter((s) => s.type === 'hashtag')
                    .map((s, i) => {
                      const flatIndex = suggestions.indexOf(s);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                            activeIndex === flatIndex ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-navy-300'
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                            <Hash className="h-4 w-4 text-brand-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              #{s.hashtag?.tag_name}
                            </p>
                            <p className="text-xs text-gray-400">{s.hashtag?.posts_count || 0} posts</p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Posts */}
              {suggestions.filter((s) => s.type === 'post').length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('search.posts')}</p>
                  {suggestions
                    .filter((s) => s.type === 'post')
                    .map((s, i) => {
                      const flatIndex = suggestions.indexOf(s);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                            activeIndex === flatIndex ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-navy-300'
                          }`}
                        >
                          <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-navy-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {s.post?.media_urls && s.post.media_urls.length > 0 ? (
                              <img src={s.post.media_urls[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                            {s.post?.content || 'Untitled post'}
                          </p>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* See all results */}
              <button
                onClick={() => handleSearch(query)}
                className="w-full px-4 py-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors border-t border-gray-100 dark:border-navy-300"
              >
                {t('search.seeAllResults')} "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
