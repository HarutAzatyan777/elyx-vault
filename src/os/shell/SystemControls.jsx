import React from 'react';
import { useMusic } from '../../context/MusicContext.jsx';
import { useSystemStatus } from '../hooks/useSystemStatus.js';
export default function SystemControls() {
  const {
    playbackError,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    togglePlayPause,
    playNext,
    playPrev,
    stopPlayback,
  } = useMusic();
  const { connection, sessionStatus, agentStatus } = useSystemStatus();
  return (
    <section
      aria-label="Live system status"
      style={{ padding: '12px', display: 'grid', gap: '10px' }}
    >
      <div role="status">
        Firebase RTDB: {connection}
        <br />
        Work session: {sessionStatus}
        <br />
        Local Agent: {agentStatus}
      </div>
      <label>
        App audio volume{' '}
        <input
          aria-label="App audio volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </label>
      <button type="button" aria-pressed={isMuted} onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'} app audio
      </button>
      {playbackError && <p role="alert">{playbackError}</p>}
      <div aria-live="polite">
        {currentTrack
          ? `${currentTrack.title || 'Untitled'} · ${isPlaying ? 'Playing' : 'Paused'}`
          : 'No media playing'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={!currentTrack} onClick={playPrev}>
          Previous
        </button>
        <button
          type="button"
          disabled={!currentTrack}
          onClick={togglePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" disabled={!currentTrack} onClick={playNext}>
          Next
        </button>
        <button type="button" disabled={!currentTrack} onClick={stopPlayback}>
          Stop
        </button>
      </div>
    </section>
  );
}
