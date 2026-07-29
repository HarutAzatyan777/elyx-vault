import React, { useState } from 'react';
import { decryptData } from '../utils/crypto';

/**
 * Card component displaying project details and offering client-side password decryption.
 *
 * @param {{
 *   project: { name: string, loginUrl: string, encryptedCredentials?: string, encryptedPassword?: string },
 *   masterPassword: string
 * }} props
 */
export const ProjectCard = ({ project, masterPassword }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopyPassword = async () => {
    // Support either encryptedCredentials or encryptedPassword key for maximum compatibility
    const ciphertext = project.encryptedCredentials || project.encryptedPassword || '';
    const decrypted = decryptData(ciphertext, masterPassword);

    if (decrypted) {
      try {
        await navigator.clipboard.writeText(decrypted);
        setCopied(true);
        setError(false);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('[Clipboard Error] Failed to write to clipboard:', err);
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-lg hover:border-slate-700 transition-all duration-200">
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-bold text-white tracking-tight truncate">
            {project.name}
          </h3>
          <span className="shrink-0 px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Encrypted
          </span>
        </div>

        {project.loginUrl ? (
          <a
            href={project.loginUrl.startsWith('http') ? project.loginUrl : `https://${project.loginUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-full mb-6"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="truncate">{project.loginUrl}</span>
          </a>
        ) : (
          <p className="text-xs text-slate-500 italic mb-6">No login URL provided</p>
        )}
      </div>

      <button
        onClick={handleCopyPassword}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
          copied
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
            : error
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
            : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700'
        }`}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : error ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decryption Failed
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Password
          </>
        )}
      </button>
    </div>
  );
};

export default ProjectCard;
