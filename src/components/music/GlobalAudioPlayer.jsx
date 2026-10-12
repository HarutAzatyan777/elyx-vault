import React, { useState } from 'react';
import { useMusic } from '../../context/MusicContext';
import { formatAudioDuration } from '../../services/musicService';
import styles from './GlobalAudioPlayer.module.css';

export const GlobalAudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    togglePlayPause,
    stopPlayback,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  return (
    <>
      {/* Floating Bottom Bar (Spotify Style) */}
      <div className={styles.playerBar}>
        {/* Progress Bar along the very top edge */}
        <div className={styles.progressBarWrapper}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeekChange}
            className={styles.rangeInput}
            title={`${formatAudioDuration(currentTime)} / ${formatAudioDuration(duration)}`}
          />
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={styles.playerInner}>
          {/* Left: Track Info & Vinyl Art */}
          <div className={styles.trackInfo} onClick={() => setIsExpanded(true)}>
            <div className={`${styles.artWrapper} ${isPlaying ? styles.artPlaying : ''}`}>
              <img
                src={
                  currentTrack.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'
                }
                alt={currentTrack.title}
                className={styles.coverImg}
              />
              <span className={styles.vinylCenter} />
            </div>

            <div className={styles.textWrapper}>
              <div className={styles.titleRow}>
                <span className={styles.title}>{currentTrack.title}</span>
                {isPlaying && (
                  <div className={styles.eqBars}>
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                  </div>
                )}
              </div>
              <span className={styles.artist}>{currentTrack.artist || 'Elyx Vault'}</span>
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className={styles.centerControls}>
            <div className={styles.btnRow}>
              {/* Shuffle */}
              <button
                type="button"
                className={`${styles.smallBtn} ${isShuffle ? styles.btnActive : ''}`}
                onClick={toggleShuffle}
                title="Shuffle"
              >
                🔀
              </button>

              {/* Prev */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={playPrev}
                title="Previous Track"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play / Pause Main Button */}
              <button
                type="button"
                className={styles.mainPlayBtn}
                onClick={togglePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg fill="currentColor" viewBox="0 0 24 24" width="22" height="22">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg fill="currentColor" viewBox="0 0 24 24" width="22" height="22">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={playNext}
                title="Next Track"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* Repeat */}
              <button
                type="button"
                className={`${styles.smallBtn} ${repeatMode !== 'off' ? styles.btnActive : ''}`}
                onClick={toggleRepeat}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? '🔂' : '🔁'}
              </button>
            </div>

            <div className={styles.timeRow}>
              <span className={styles.timeText}>{formatAudioDuration(currentTime)}</span>
              <span className={styles.timeDivider}>/</span>
              <span className={styles.timeText}>{formatAudioDuration(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Expand */}
          <div className={styles.rightControls}>
            {/* Volume */}
            <div className={styles.volumeBox}>
              <button
                type="button"
                className={styles.volumeBtn}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={styles.volumeSlider}
              />
            </div>

            {/* Expand Modal Button */}
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setIsExpanded(true)}
              title="Expand Player View"
              aria-label="Expand player"
            >
              ⤢
            </button>

            {/* Close / Stop Playback Button */}
            <button
              type="button"
              className={styles.closePlayerBtn}
              onClick={stopPlayback}
              title="Անջատել նվագարկիչը (Stop & Close Player)"
              aria-label="Stop and close player"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Cinema View Modal */}
      {isExpanded && (
        <div className={styles.expandedBackdrop} onClick={() => setIsExpanded(false)}>
          <div className={styles.expandedCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.expandedTopBar}>
              <button
                type="button"
                className={styles.expandedStopBtn}
                onClick={() => {
                  stopPlayback();
                  setIsExpanded(false);
                }}
                title="Անջատել երգը (Stop Playback)"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span>Անջատել երգը</span>
              </button>

              <button
                type="button"
                className={styles.closeExpandedBtn}
                onClick={() => setIsExpanded(false)}
                title="Փակել պատուհանը"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Rotating Vinyl Showcase */}
            <div className={styles.vinylShowcase}>
              <div className={`${styles.bigVinyl} ${isPlaying ? styles.bigVinylSpin : ''}`}>
                <img
                  src={
                    currentTrack.coverUrl ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={currentTrack.title}
                  className={styles.bigVinylImg}
                />
                <div className={styles.vinylCenterHole} />
              </div>
            </div>

            <div className={styles.expandedMeta}>
              <h2 className={styles.expandedTitle}>{currentTrack.title}</h2>
              <p className={styles.expandedArtist}>
                {currentTrack.artist} • {currentTrack.album || 'Elyx Vault'}
              </p>
            </div>

            {/* Big Scrubber */}
            <div className={styles.bigScrubberBox}>
              <div className={styles.scrubberTimeRow}>
                <span>{formatAudioDuration(currentTime)}</span>
                <span>{formatAudioDuration(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeekChange}
                className={styles.bigRangeInput}
              />
            </div>

            {/* Big Controls */}
            <div className={styles.bigControlsRow}>
              <button
                type="button"
                className={`${styles.bigSmallBtn} ${isShuffle ? styles.btnActive : ''}`}
                onClick={toggleShuffle}
              >
                🔀
              </button>

              <button type="button" className={styles.bigNavBtn} onClick={playPrev}>
                ⏮
              </button>

              <button
                type="button"
                className={styles.bigMainPlayBtn}
                onClick={togglePlayPause}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button type="button" className={styles.bigNavBtn} onClick={playNext}>
                ⏭
              </button>

              <button
                type="button"
                className={`${styles.bigSmallBtn} ${repeatMode !== 'off' ? styles.btnActive : ''}`}
                onClick={toggleRepeat}
              >
                {repeatMode === 'one' ? '🔂' : '🔁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
