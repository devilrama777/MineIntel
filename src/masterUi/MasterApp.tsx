import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TopicIntelligencePage } from './pages/TopicIntelligencePage';
import { TopicNetworkPage } from './pages/TopicNetworkPage';
import { TrendAnalysisPage } from './pages/TrendAnalysisPage';
import { EmergingAlertsPage } from './pages/EmergingAlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { GenerateReportPage } from './pages/GenerateReportPage';
import { MineExplorerPage } from './pages/MineExplorerPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { WorkersPage } from './pages/WorkersPage';

export function MasterApp() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/master/dashboard" element={<DashboardPage />} />
        <Route path="/master/approvals" element={<ApprovalsPage />} />
        <Route path="/master/workers" element={<WorkersPage />} />
        <Route path="/master/topics" element={<TopicIntelligencePage />} />
        <Route path="/master/topics/network" element={<TopicNetworkPage />} />
        <Route path="/master/topics/taxonomy" element={<TopicIntelligencePage />} />
        <Route path="/master/trends" element={<TrendAnalysisPage />} />
        <Route path="/master/alerts" element={<EmergingAlertsPage />} />
        <Route path="/master/reports" element={<ReportsPage />} />
        <Route path="/master/generate-report" element={<GenerateReportPage />} />
        <Route path="/master/mine-explorer" element={<MineExplorerPage />} />
        <Route path="/master/insights" element={<AIInsightsPage />} />
        <Route path="/master/system" element={<SystemHealthPage />} />
        <Route path="/master/settings" element={<SettingsPage />} />
        <Route path="/master/help" element={<HelpSupportPage />} />
        <Route path="*" element={<Navigate to="/master/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
