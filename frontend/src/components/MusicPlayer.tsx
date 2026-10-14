import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Volume1, VolumeX, Disc, Music, Minimize2, Maximize2, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/media';

interface MusicPlayerProps {
  musicUrl: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  onPlayStateChange?: (playing: boolean) => void;
  isExternalPlaying?: boolean;
  onTogglePlayExternal?: () => void;
  embedded?: boolean;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  musicUrl,
  username,
  displayName,
  avatarUrl,
  onPlayStateChange,
  embedded = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const resolvedUrl = resolveMediaUrl(musicUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeControlRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('linkord_bgm_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch (_) {}
    return 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Close volume popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(e.target as Node)) {
        setShowVolumePopover(false);
      }
    };
    if (showVolumePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showVolumePopover]);

  // Initialize and reload when URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (resolvedUrl) {
        audioRef.current.load();
      }
    }
    setAudioError(null);
    setIsPlaying(false);
    onPlayStateChange?.(false);
  }, [resolvedUrl]);

  // Synchronize with external play/pause events
  useEffect(() => {
    const handleToggle = () => {
      togglePlay();
    };
    const handlePlay = () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play().catch(console.warn);
      }
    };
    const handlePause = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
      }
    };

    window.addEventListener('linkord:toggle-bgm', handleToggle);
    window.addEventListener('linkord:play-bgm', handlePlay);
    window.addEventListener('linkord:pause-bgm', handlePause);

    return () => {
      window.removeEventListener('linkord:toggle-bgm', handleToggle);
      window.removeEventListener('linkord:play-bgm', handlePlay);
      window.removeEventListener('linkord:pause-bgm', handlePause);
    };
  }, [isPlaying, resolvedUrl]);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    try {
      localStorage.setItem('linkord_bgm_volume', clamped.toString());
    } catch (_) {}
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
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

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-3.5 h-3.5 text-rose-400" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-3.5 h-3.5 text-purple-400" />;
    }
    return <Volume2 className="w-3.5 h-3.5 text-purple-400" />;
  };

  const togglePlay = () => {
    if (!audioRef.current || !resolvedUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setAudioError(null);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            onPlayStateChange?.(true);
          })
          .catch((err) => {
            console.warn('Audio play failed:', err);
            setAudioError('再生に失敗しました（タップして再試行）');
            setIsPlaying(false);
            onPlayStateChange?.(false);
          });
      }
    }
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

  if (!resolvedUrl) return null;

  return (
    <>
      {/* Native HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="metadata"
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
          setAudioError(null);
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
        onError={(e) => {
          console.warn('Audio element error:', e);
          setAudioError('音声の読み込みに失敗しました');
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
      />

      {/* Floating Bottom Music Player Bar (No overlay, user controls play) */}
      <div
        className={`${
          embedded
            ? 'relative w-full'
            : `fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 ${
                isMinimized
                  ? 'w-auto'
                  : 'w-[calc(100%-2rem)] max-w-sm sm:max-w-md'
              }`
        } transition-all duration-300 pointer-events-auto`}
      >
        {!embedded && isMinimized ? (
          /* Minimized Compact Pill Player */
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-2xl transition-all cursor-pointer ${
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
              title={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <Disc className={`w-4 h-4 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              <span className="text-xs font-semibold max-w-[120px] truncate">
                {displayName || username}
              </span>
            </div>

            {/* Quick Volume Button & Popover in Minimized View */}
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowVolumePopover(prev => !prev)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              >
                {getVolumeIcon()}
              </button>
              {showVolumePopover && (
                <div
                  className={`absolute bottom-full right-0 mb-3 p-3 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col items-center gap-2.5 w-40 transition-all ${
                    isLight
                      ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
                      : 'bg-[#0f111a]/95 border-white/10 text-white shadow-purple-950/80'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between w-full text-xs font-semibold">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex items-center gap-1 text-[11px] hover:text-purple-400 transition"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{isMuted ? 'ミュート中' : '音量'}</span>
                    </button>
                    <span className="font-mono text-[11px] tabular-nums text-purple-400 font-bold">
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />

                  {/* Quick Presets */}
                  <div className="flex items-center justify-between w-full pt-1.5 border-t border-white/5 dark:border-white/5 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(0.25)}
                      className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(0.5)}
                      className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(1.0)}
                      className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}
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
          /* Slim & Elegant Glassmorphic Player */
          <div
            className={`rounded-2xl p-2.5 sm:p-3 border shadow-2xl backdrop-blur-2xl transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/60'
                : 'bg-[#0f111a]/95 border-white/10 text-white shadow-purple-950/50'
            }`}
          >
            {audioError ? (
              <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-rose-400 text-xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{audioError}</span>
                </div>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition"
                >
                  再試行
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Disc Icon */}
                <div className="relative w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Disc
                    className={`w-4 h-4 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '4s' }}
                  />
                  {isPlaying && (
                    <div className="absolute inset-x-1 bottom-0.5 flex items-end justify-center gap-0.5 h-1.5">
                      <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-full" />
                      <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                      <span className="w-0.5 bg-purple-400 rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.4s] h-1/2" />
                    </div>
                  )}
                </div>

                {/* Track Info & Seek Bar */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
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
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
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

                  {/* Desktop Inline Volume Control */}
                  <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 rounded-xl bg-white/5 border border-white/5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      title={isMuted ? 'ミュート解除' : 'ミュート'}
                    >
                      {getVolumeIcon()}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 w-6 text-right">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

                  {/* Mobile Volume Control with Popover */}
                  <div className="relative sm:hidden" ref={volumeControlRef}>
                    <button
                      type="button"
                      onClick={() => setShowVolumePopover(prev => !prev)}
                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                        showVolumePopover
                          ? 'bg-purple-600/20 text-purple-300'
                          : isLight
                            ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="音量調整"
                    >
                      {getVolumeIcon()}
                    </button>

                    {showVolumePopover && (
                      <div
                        className={`absolute bottom-full right-0 mb-3 p-3 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col items-center gap-2.5 w-40 transition-all ${
                          isLight
                            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
                            : 'bg-[#0f111a]/95 border-white/10 text-white shadow-purple-950/80'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-xs font-semibold">
                          <button
                            type="button"
                            onClick={toggleMute}
                            className="flex items-center gap-1 text-[11px] hover:text-purple-400 transition"
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
                            <span>{isMuted ? 'ミュート中' : '音量'}</span>
                          </button>
                          <span className="font-mono text-[11px] tabular-nums text-purple-400 font-bold">
                            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />

                        {/* Quick Presets */}
                        <div className="flex items-center justify-between w-full pt-1.5 border-t border-white/5 dark:border-white/5 text-[10px] text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleVolumeChange(0.25)}
                            className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVolumeChange(0.5)}
                            className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVolumeChange(1.0)}
                            className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-purple-300 transition"
                          >
                            100%
                          </button>
                        </div>
                      </div>
                    )}
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
            )}
          </div>
        )}
      </div>
    </>
  );
};
