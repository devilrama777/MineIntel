import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DocumentViewerModal } from '../common/DocumentViewerModal';
import { TopicDetailModal } from '../common/TopicDetailModal';
import { KeyboardGuideModal } from '../common/KeyboardGuideModal';
import { MiningReport, TopicItem, REPORTS_DATA, TOPICS_DATA } from '../../data/miningData';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MiningReport | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [keyboardGuideOpen, setKeyboardGuideOpen] = useState(false);

  const handleOpenReport = (report: MiningReport) => {
    setSelectedReport(report);
  };

  const handleOpenReportById = (id: string) => {
    const found = REPORTS_DATA.find((r) => r.id === id);
    if (found) setSelectedReport(found);
  };

  const handleOpenTopic = (topic: TopicItem) => {
    setSelectedTopic(topic);
  };

  const handleOpenTopicByName = (name: string) => {
    const found = TOPICS_DATA.find(
      (t) => t.name.toLowerCase() === name.toLowerCase() || t.keywords.some((k) => k.toLowerCase() === name.toLowerCase())
    );
    if (found) setSelectedTopic(found);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#070b14] text-slate-100 flex font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenKeyboardGuide={() => setKeyboardGuideOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Topbar */}
        <Topbar
          sidebarCollapsed={collapsed}
          onOpenReportModal={handleOpenReportById}
          onOpenKeyboardGuide={() => setKeyboardGuideOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet context={{ onOpenReport: handleOpenReport, onOpenTopic: handleOpenTopic, onOpenTopicByName: handleOpenTopicByName }} />
        </main>
      </div>

      {/* Global Keyboard Guide Modal */}
      <KeyboardGuideModal
        isOpen={keyboardGuideOpen}
        onClose={() => setKeyboardGuideOpen(false)}
      />

      {/* Global Document Viewer Modal */}
      <DocumentViewerModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onOpenTopic={handleOpenTopicByName}
      />

      {/* Global Topic Detail Modal */}
      <TopicDetailModal
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onOpenReport={handleOpenReport}
      />
    </div>
  );
};
