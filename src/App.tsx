import React from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { LoginView } from './shared/components/LoginView';
import { WorkerApp } from './workerUi/WorkerApp';
import { MasterApp } from './masterUi/MasterApp';

function DesktopAppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isMasterUser = user?.role === 'Senior Officer' || user?.is_master === true;

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0e17] text-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-sm mt-3 font-mono">Starting MineIntel...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (isMasterUser) {
    return <MasterApp />;
  }

  return <WorkerApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <DesktopAppContent />
    </AuthProvider>
  );
}
