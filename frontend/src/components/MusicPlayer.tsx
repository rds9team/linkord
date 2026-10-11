import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Disc, Music, Minimize2, Maximize2, X, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MusicPlayerProps {
  musicUrl: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  autoPlayOverlay?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  musicUrl,
  username,
  displayName,
  avatarUrl,
  autoPlayOverlay = true,
  onPlayStateChange,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(autoPlayOverlay);

  // Initialize audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  // Update volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  // Click to Enter Handler
  const handleEnterWithAudio = () => {
    setHasInteracted(true);
    setShowOverlay(false);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback if browser still blocks
        setIsPlaying(false);
      });
    }
  };

  const handleEnterSilent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasInteracted(true);
    setShowOverlay(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={musicUrl}
        loop
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
      />

      {/* 1. Click to Enter Autoplay Overlay */}
      {showOverlay && (
        <div
          onClick={handleEnterWithAudio}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl cursor-pointer animate-page-fade-in transition-all select-none"
        >
          {/* Ambient Glow in background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/25 rounded-full blur-[120px] pointer-events-none" />

          {/* Interactive Enter Card */}
          <div
            className={`w-full max-w-sm rounded-3xl p-7 text-center relative z-10 border transition-all transform hover:scale-[1.02] shadow-2xl ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-purple-500/10'
                : 'bg-[#0f111a]/95 border-white/10 text-white shadow-purple-600/20'
            }`}
          >
            {/* Top Close (Skip Audio) Button */}
            <button
              onClick={handleEnterSilent}
              className={`absolute top-4 right-4 p-1.5 rounded-xl transition ${
                isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
              title="音声を再生せずに閲覧"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Avatar & Music Disc Badge */}
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-purple-600 border-2 border-white/20 shadow-xl flex items-center justify-center text-2xl font-extrabold text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <span>{(displayName || username || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-[#0f111a] flex items-center justify-center text-white shadow-lg animate-pulse">
                <Music className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Title / Username */}
            <h3 className="text-base font-extrabold tracking-tight mb-1 truncate">
              {displayName || username}
            </h3>
            <p className={`text-xs font-mono mb-6 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              @{username}
            </p>

            {/* Click to Enter Prompt Button */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/15 via-indigo-600/15 to-purple-600/15 border border-purple-500/30 flex items-center justify-center gap-2 mb-3 shadow-lg shadow-purple-500/10 group">
              <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-purple-300 group-hover:text-purple-200 transition">
                画面をタップしてプロフィールを開く
              </span>
            </div>

            <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              🎵 タップするとBGMが再生されます
            </p>

            <button
              onClick={handleEnterSilent}
              className={`mt-4 text-[11px] underline transition cursor-pointer ${
                isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              音声を再生せずに閲覧する
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Bottom Music Player Bar */}
      <div
        className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isMinimized
            ? 'w-auto'
            : 'w-[calc(100%-2rem)] max-w-md'
        }`}
      >
        {isMinimized ? (
          /* Minimized Compact Pill Player */
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-2xl transition-all cursor-pointer ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
                : 'bg-[#0f111a]/95 border-white/10 text-white shadow-purple-950/40'
            }`}
            onClick={() => setIsMinimized(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <Disc className={`w-4 h-4 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              <span className="text-xs font-semibold max-w-[100px] truncate">
                {displayName || username}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 text-slate-400 hover:text-white transition"
              title="プレイヤーを展開"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Full Rich Glassmorphic Player */
          <div
            className={`rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border shadow-2xl backdrop-blur-2xl transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                : 'bg-[#0f111a]/90 border-white/10 text-white shadow-purple-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Disc & Equalizer Icon */}
              <div className="relative w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Disc
                  className={`w-5 h-5 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '4s' }}
                />
                {isPlaying && (
                  <div className="absolute inset-x-1.5 bottom-1 flex items-end justify-center gap-0.5 h-2">
                    <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-full" />
                    <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                    <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.4s] h-1/2" />
                  </div>
                )}
              </div>

              {/* Title & Track Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold truncate">
                    {displayName || username} <span className="text-[10px] font-normal text-purple-400 font-mono">BGM</span>
                  </p>
                  <span className={`text-[10px] font-mono tabular-nums ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Seek Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-700/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 transition cursor-pointer"
                  title={isPlaying ? '一時停止' : '再生'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={isMuted ? 'ミュート解除' : 'ミュート'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {/* Volume Slider (hidden on very small screens, visible on sm) */}
                <div className="hidden sm:flex items-center w-16">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                  title="プレイヤーを最小化"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
