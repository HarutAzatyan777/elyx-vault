/**
 * YouTube Audio & MP3 Service for Elyx Vault
 * Extracts video metadata, cleans track names, converts YouTube audio to MP3,
 * and prepares tracks for Firebase Storage & Cloud Firestore.
 */

/**
 * Extract YouTube video ID from various URL formats
 * (watch?v=, youtu.be/, shorts/, embed/, etc.)
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Standard watch, shorts, embed, youtu.be
  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Raw video ID directly entered
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]?.length === 11) {
      return match[1];
    }
  }

  return null;
}

/**
 * Clean common YouTube title suffixes to get clean artist & song name
 * (e.g. "Rick Astley - Never Gonna Give You Up (Official Music Video) [4K]" -> "Never Gonna Give You Up")
 */
export function cleanYouTubeTitle(rawTitle) {
  if (!rawTitle) return { artist: 'Unknown Artist', title: 'Untitled Track' };

  let cleaned = rawTitle
    .replace(/\s*\(Official\s*(Music)?\s*(Video|Audio|Lyric\s*Video|HD|4K|Remastered)?\)/gi, '')
    .replace(/\s*\[Official\s*(Music)?\s*(Video|Audio|Lyric\s*Video|HD|4K|Remastered)?\]/gi, '')
    .replace(/\s*\((Lyric|Lyrics|Audio|Visualizer|Official|Video|Clip\s*Officiel)\)/gi, '')
    .replace(/\s*\[(Lyric|Lyrics|Audio|Visualizer|Official|Video|Clip\s*Officiel)\]/gi, '')
    .replace(/\s*\(HD\)/gi, '')
    .replace(/\s*\[HD\]/gi, '')
    .replace(/\s*\(4K\)/gi, '')
    .replace(/\s*\[4K\]/gi, '')
    .replace(/\s*\|\s*.*$/g, '') // Remove trailing " | ..."
    .trim();

  // If title has "Artist - Song Title" format, split them
  if (cleaned.includes(' - ') || cleaned.includes(' – ')) {
    const delimiter = cleaned.includes(' - ') ? ' - ' : ' – ';
    const parts = cleaned.split(delimiter);
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(' - ').trim();
      return { artist, title };
    }
  }

  return { artist: '', title: cleaned };
}

/**
 * Fetch YouTube video information (Title, Artist/Author, Cover Thumbnail)
 * Uses CORS-safe noembed & YouTube oembed endpoints
 *
 * @param {string} urlOrId
 * @returns {Promise<{ id: string, title: string, artist: string, cleanTitle: string, coverUrl: string, duration: number, originalUrl: string } | null>}
 */
export async function fetchYouTubeVideoInfo(urlOrId) {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) {
    throw new Error('Անվավեր YouTube հղում: Խնդրում ենք տեղադրել ճիշտ YouTube URL:');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let rawTitle = 'YouTube Track';
  let authorName = 'YouTube Artist';
  let coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    // 1. Try noembed.com (Fast and CORS-friendly)
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(standardUrl)}`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        rawTitle = data.title;
        authorName = data.author_name || authorName;
        coverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
  } catch (err) {
    console.warn('[YouTube Info] noembed fallback:', err);
  }

  // Parse clean title and artist
  const parsed = cleanYouTubeTitle(rawTitle);
  const finalTitle = parsed.title || rawTitle;
  const finalArtist = parsed.artist || authorName;

  return {
    id: videoId,
    title: rawTitle,
    cleanTitle: finalTitle,
    artist: finalArtist,
    coverUrl,
    duration: 0,
    originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Public Cobalt instances used for media downloading
 */
const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt.kwiatekm.com',
  'https://co.wuk.sh',
  'https://cobalt.xy2401.com',
  'https://cobalt.hyper.lol',
];

/**
 * Convert YouTube video to MP3 Audio Blob
 * Tries multiple gateways, falls back to direct audio stream
 *
 * @param {string} videoUrl
 * @param {function(string): void} [onStatusUpdate]
 * @returns {Promise<{ blob: Blob, fileName: string, mimeType: string } | null>}
 */
export async function convertYouTubeToAudio(videoUrl, onStatusUpdate = () => {}) {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Անվավեր YouTube հղում:');
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Attempt Cobalt API instances
  for (const instance of COBALT_INSTANCES) {
    try {
      onStatusUpdate(`Կապվում ենք աուդիո սերվերին (${new URL(instance).hostname})…`);
      const response = await fetch(`${instance}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: cleanUrl,
          downloadMode: 'audio',
          audioFormat: 'mp3',
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const downloadUrl = data.url || data.audio;

      if (downloadUrl) {
        onStatusUpdate('Ներբեռնվում է MP3 ֆայլը…');
        const audioFetch = await fetch(downloadUrl);
        if (audioFetch.ok) {
          const blob = await audioFetch.blob();
          if (blob && blob.size > 10000) {
            return {
              blob,
              fileName: `yt_${videoId}.mp3`,
              mimeType: 'audio/mpeg',
            };
          }
        }
      }
    } catch (cobaltErr) {
      console.warn(`[YouTube MP3] Error on ${instance}:`, cobaltErr.message);
    }
  }

  // 2. Attempt fallback Invidious / Piped audio stream
  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://piped-api.lunar.icu',
  ];

  for (const piped of PIPED_INSTANCES) {
    try {
      onStatusUpdate('Փորձարկվում է այլընտրանքային աուդիո ալիք…');
      const pipedRes = await fetch(`${piped}/streams/${videoId}`);
      if (!pipedRes.ok) continue;

      const streamData = await pipedRes.json();
      const audioStreams = streamData.audioStreams || [];
      if (audioStreams.length > 0) {
        // Find best audio stream
        audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const targetUrl = audioStreams[0].url;

        if (targetUrl) {
          onStatusUpdate('Ներբեռնվում է աուդիո հոսքը…');
          const streamFetch = await fetch(targetUrl);
          if (streamFetch.ok) {
            const blob = await streamFetch.blob();
            if (blob && blob.size > 10000) {
              return {
                blob,
                fileName: `yt_${videoId}.mp3`,
                mimeType: blob.type || 'audio/mpeg',
              };
            }
          }
        }
      }
    } catch (pipedErr) {
      console.warn(`[YouTube Piped] Error on ${piped}:`, pipedErr.message);
    }
  }

  return null;
}

/**
 * Helper to get quick external web converter links if third-party bot protection is triggered
 */
export function getFastDownloadLinks(videoId) {
  return [
    {
      name: 'Y2Mate MP3',
      url: `https://www.y2mate.com/youtube/${videoId}`,
    },
    {
      name: 'Cobalt Tools',
      url: `https://cobalt.tools/`,
    },
    {
      name: 'SaveFrom Net',
      url: `https://en.savefrom.net/1-youtube-video-downloader-1v3/?url=https://www.youtube.com/watch?v=${videoId}`,
    },
  ];
}
