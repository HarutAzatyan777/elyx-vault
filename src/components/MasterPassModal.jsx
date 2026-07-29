import React, { useState } from 'react';

/**
 * Modal dialog prompting the user for their master password to decrypt vault contents.
 *
 * @param {{ onSubmit: (password: string) => void }} props
 */
export const MasterPassModal = ({ onSubmit }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your master password.');
      return;
    }
    setError('');
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-300">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl shadow-indigo-500/10 text-slate-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Unlock Your Vault</h2>
          <p className="text-sm text-slate-400 mt-1">
            Enter your master password to derive the decryption keys locally.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            />
            {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 cursor-pointer"
          >
            Unlock Vault
          </button>
        </form>
      </div>
    </div>
  );
};

export default MasterPassModal;
