/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { NewReport } from './pages/NewReport';
import { MyReports } from './pages/MyReports';
import { DataSource } from './pages/DataSource';
import { ReportPreview } from './pages/ReportPreview';
import { ReportExport } from './pages/ReportExport';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Main Worker Portal with persistent layout */}
          <Route path="/worker" element={<AppLayout />}>
            <Route index element={<Navigate to="/worker/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="new-report" element={<NewReport />} />
            <Route path="my-reports" element={<MyReports />} />
            <Route path="data-source" element={<DataSource />} />
            <Route path="preview/:id" element={<ReportPreview />} />
            <Route path="export/:id" element={<ReportExport />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/worker/dashboard" replace />} />
          
          {/* Fallback for /login or any unknown route to preserve portal access */}
          <Route path="/login" element={<Navigate to="/worker/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/worker/dashboard" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
