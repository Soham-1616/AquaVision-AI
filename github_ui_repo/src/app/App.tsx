import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

// Lazy-load feature pages for code splitting
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ImageProcessingPage = lazy(() => import('@/features/image-processing/ImageProcessingPage').then(m => ({ default: m.ImageProcessingPage })));
const VideoAnalysisPage = lazy(() => import('@/features/video-analysis/VideoAnalysisPage').then(m => ({ default: m.VideoAnalysisPage })));
const EvaluationPage = lazy(() => import('@/features/evaluation/EvaluationPage').then(m => ({ default: m.EvaluationPage })));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage').then(m => ({ default: m.HistoryPage })));
const HistoryDetailPage = lazy(() => import('@/features/history/HistoryDetailPage').then(m => ({ default: m.HistoryDetailPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AboutPage = lazy(() => import('@/features/about/AboutPage').then(m => ({ default: m.AboutPage })));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
    <div className="spinner" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      {
        path: 'image-processing',
        element: <Suspense fallback={<PageLoader />}><ImageProcessingPage /></Suspense>,
      },
      // Redirects for backwards-compatibility
      {
        path: 'enhancement',
        element: <Navigate to="/image-processing" replace />,
      },
      {
        path: 'detection',
        element: <Navigate to="/image-processing" replace />,
      },
      {
        path: 'video-analysis',
        element: <Suspense fallback={<PageLoader />}><VideoAnalysisPage /></Suspense>,
      },
      {
        path: 'evaluation',
        element: <Suspense fallback={<PageLoader />}><EvaluationPage /></Suspense>,
      },
      {
        path: 'history',
        element: <Suspense fallback={<PageLoader />}><HistoryPage /></Suspense>,
      },
      {
        path: 'history/:id',
        element: <Suspense fallback={<PageLoader />}><HistoryDetailPage /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
      },
      {
        path: 'about',
        element: <Suspense fallback={<PageLoader />}><AboutPage /></Suspense>,
      },
    ],
  },
]);

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};
