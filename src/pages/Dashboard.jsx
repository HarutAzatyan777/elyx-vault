import React, { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { MasterPassModal } from '../components/MasterPassModal';
import { ProjectCard } from '../components/ProjectCard';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(null);

  useEffect(() => {
    // Subscribe to projects collection updates in real-time
    const projectsRef = collection(db, 'projects');
    const unsubscribe = onSnapshot(
      projectsRef,
      (snapshot) => {
        const fetchedProjects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(fetchedProjects);
        setLoading(false);
      },
      (error) => {
        console.error('[Firestore Error] Failed to fetch projects:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLockVault = () => {
    setMasterPassword(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Elyx Vault</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              {user?.email}
            </span>
            
            {masterPassword && (
              <button
                onClick={handleLockVault}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Lock master password"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock Vault
              </button>
            )}

            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!masterPassword ? (
          <MasterPassModal onSubmit={(pass) => setMasterPassword(pass)} />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">Your Encrypted Vault</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Decryption keys are generated transiently in-memory and never sent to any server.
                </p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-44 rounded-2xl bg-slate-900/50 border border-slate-800/50 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
                <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-base font-semibold text-slate-300">No Projects Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  There are currently no items in your Firestore 'projects' collection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    masterPassword={masterPassword}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
