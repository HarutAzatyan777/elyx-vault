import { resolveAudioSource } from '../utils/securePayload.js';
import { useAuth } from '../hooks/useAuth.jsx';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { getAudioBlob } from '../services/musicService';
import { auth } from '../config/firebase';
import { broadcastLiveMusicSync } from '../services/rtdbService';

const MusicContext = createContext(null);
const MusicProgressContext = createContext({ currentTime: 0, duration: 0 });

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('elyx_music_volume') ?? 0.85);
      return Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isShuffle, setIsShuffle] = useState(false);

  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const playbackKey = useRef(null);
  const playbackGeneration = useRef(0);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      playbackGeneration.current += 1;
      playbackKey.current = null;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.playbackState = 'none';
          for (const action of [
            'play',
            'pause',
            'previoustrack',
            'nexttrack',
            'stop',
            'seekto',
          ])
            navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      }
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    try {
      localStorage.setItem('elyx_music_volume', volume.toString());
    } catch {}
  }, [volume, isMuted]);

  // Live broadcast playback status to Firebase Realtime Database
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (uid) {
      broadcastLiveMusicSync(uid, currentTrack, isPlaying);
    }
  }, [currentTrack, isPlaying]);

  // Resolve audio source (URL or IndexedDB binary blob)
  const resolveAudioUrl = (track, password) =>
    resolveAudioSource(track, password, getAudioBlob);

  // Play a specific track
  const playTrack = useCallback(
    async (track, newQueue = null, masterPassword = null) => {
      if (!track || !audioRef.current) return;

      if (newQueue) {
        setQueue(newQueue);
      }

      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      setCurrentTime(0);
      setDuration(0);
      setPlaybackError('');
      const generation = ++playbackGeneration.current;
      playbackKey.current = masterPassword;
      setCurrentTrack(track);

      try {
        const audioSrc = await resolveAudioUrl(track, masterPassword);
        if (generation !== playbackGeneration.current) return;
        if (!audioSrc) {
          console.warn(
            'Could not resolve audio source for track:',
            track.title,
          );
          return;
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const source =
          audioSrc instanceof Blob ? URL.createObjectURL(audioSrc) : audioSrc;
        if (audioSrc instanceof Blob) objectUrlRef.current = source;
        audioRef.current.src = source;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        if (generation === playbackGeneration.current) setIsPlaying(true);
      } catch (err) {
        if (generation === playbackGeneration.current) {
          setCurrentTrack(null);
          setIsPlaying(false);
          playbackKey.current = null;
          setPlaybackError(
            'Unable to play this track. Check your vault key or audio source and try again.',
          );
        }
        console.warn('[Audio] Playback could not start.');
      }
    },
    [],
  );

  // Toggle play / pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [currentTrack]);

  // Stop playback completely & unload track
  const stopPlayback = useCallback(() => {
    playbackGeneration.current += 1;
    playbackKey.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setQueue([]);
    setPlaybackError('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.metadata = null;
        for (const action of [
          'play',
          'pause',
          'previoustrack',
          'nexttrack',
          'stop',
          'seekto',
        ])
          navigator.mediaSession.setActionHandler(action, null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    stopPlayback();
  }, [user?.uid, stopPlayback]);

  useEffect(() => {
    const lock = () => stopPlayback();
    window.addEventListener('elyx:vault-locked', lock);
    return () => window.removeEventListener('elyx:vault-locked', lock);
  }, [stopPlayback]);

  // Next Track
  const playNext = useCallback(() => {
    if (!queue.length || !currentTrack) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.warn);
      }
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex === -1 || currentIndex === queue.length - 1) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          audioRef.current?.pause();
          setIsPlaying(false);
          return;
        }
      } else {
        nextIndex = currentIndex + 1;
      }
    }

    playTrack(queue[nextIndex], null, playbackKey.current);
  }, [queue, currentTrack, repeatMode, isShuffle, playTrack]);

  // Prev Track
  const playPrev = useCallback(() => {
    if (!queue.length || !currentTrack) return;

    // If more than 3 seconds in, restart track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    playTrack(queue[prevIndex], null, playbackKey.current);
  }, [queue, currentTrack, playTrack]);

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [playNext]);

  // Set up OS / MediaSession API for Background & Multimedia Key Controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Elyx Vault Audio',
        album: currentTrack.album || 'Music Vault',
        artwork: [
          {
            src:
              currentTrack.coverUrl ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=512&q=80',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(console.warn);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrev();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        stopPlayback();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch (err) {
      console.warn('MediaSession error:', err);
    }
  }, [currentTrack, stopPlayback, playNext, playPrev]);

  // Seek
  const seekTo = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // Set Volume
  const setVolume = useCallback(
    (val) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolumeState(clamped);
      if (isMuted && clamped > 0) {
        setIsMuted(false);
      }
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const value = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      playbackError,
      volume,
      isMuted,
      queue,
      repeatMode,
      isShuffle,
      playTrack,
      togglePlayPause,
      stopPlayback,
      playNext,
      playPrev,
      seekTo,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      setQueue,
    }),
    [
      currentTrack,
      isPlaying,
      playbackError,
      volume,
      isMuted,
      queue,
      repeatMode,
      isShuffle,
      playTrack,
      togglePlayPause,
      stopPlayback,
      playNext,
      playPrev,
      seekTo,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
    ],
  );
  const progress = useMemo(
    () => ({ currentTime, duration }),
    [currentTime, duration],
  );
  return (
    <MusicContext.Provider value={value}>
      <MusicProgressContext.Provider value={progress}>
        {children}
      </MusicProgressContext.Provider>
    </MusicContext.Provider>
  );
};
export const useMusicProgress = () => useContext(MusicProgressContext);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
