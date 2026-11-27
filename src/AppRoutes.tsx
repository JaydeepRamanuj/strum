import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Spinner } from '@/components/Spinner';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { HomePage } from '@/features/home/HomePage';

// Every page except Home loads on demand, so the first screen downloads less.
const named = <T extends Record<string, React.ComponentType>, K extends keyof T>(
  load: () => Promise<T>,
  name: K,
) => lazy(() => load().then((m) => ({ default: m[name] })));

const DiscoverPage = named(() => import('@/features/discover/DiscoverPage'), 'DiscoverPage');
const DiscoverArtistPage = named(
  () => import('@/features/discover/DiscoverArtistPage'),
  'DiscoverArtistPage',
);
const DiscoverPlaylistPage = named(
  () => import('@/features/discover/DiscoverPlaylistPage'),
  'DiscoverPlaylistPage',
);
const DownloadsPage = named(() => import('@/features/offline/DownloadsPage'), 'DownloadsPage');
const FolderPage = named(() => import('@/features/folders/FolderPage'), 'FolderPage');
const LibraryPage = named(() => import('@/features/library/LibraryPage'), 'LibraryPage');
const NowPlayingPage = named(() => import('@/features/player/NowPlayingPage'), 'NowPlayingPage');
const PlaylistPage = named(() => import('@/features/playlists/PlaylistPage'), 'PlaylistPage');
const SearchPage = named(() => import('@/features/search/SearchPage'), 'SearchPage');
const SettingsPage = named(() => import('@/features/settings/SettingsPage'), 'SettingsPage');
const TopSongsPage = named(() => import('@/features/stats/TopSongsPage'), 'TopSongsPage');
const UploadPage = named(() => import('@/features/upload/UploadPage'), 'UploadPage');

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route
          path="/now-playing"
          element={
            <Suspense
              fallback={
                <div className="flex justify-center py-24">
                  <Spinner label="Loading" />
                </div>
              }
            >
              <NowPlayingPage />
            </Suspense>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="discover/playlist/:id" element={<DiscoverPlaylistPage />} />
          <Route path="discover/artist/:key" element={<DiscoverArtistPage />} />
          <Route path="top" element={<TopSongsPage />} />
          <Route path="downloads" element={<DownloadsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="playlist/:id" element={<PlaylistPage />} />
          <Route path="folder/:id" element={<FolderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
