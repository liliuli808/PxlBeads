import { createBrowserRouter, Outlet } from 'react-router-dom';
import { UploadPage } from './components/upload/UploadPage';
import { EditorPage } from './components/editor/EditorPage';
import { ExportPanel } from './components/export/ExportPanel';
import { AssemblyHelper } from './components/helper/AssemblyHelper';
import { AppLayout } from './components/layout/AppLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
    children: [
      { index: true, element: <UploadPage /> },
      { path: 'editor', element: <EditorPage /> },
      { path: 'export', element: <ExportPanel /> },
      { path: 'helper', element: <AssemblyHelper /> },
    ],
  },
]);
