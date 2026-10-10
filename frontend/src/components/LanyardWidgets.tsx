import React, { useState, useEffect } from 'react';
import { Music, ExternalLink, Gamepad2, Code2, Radio, Sparkles } from 'lucide-react';
import { LanyardSpotify, LanyardActivity, getActivityAssetUrl } from '../hooks/useLanyard';

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const SpotifyWidget: React.FC<{
  spotify: LanyardSpotify;
  isLight?: boolean;
}> = ({ spotify, isLight = false }) => {
  const [progressMs, setProgressMs] = useState(0);

  const totalMs = Math.max(1, spotify.timestamps.end - spotify.timestamps.start);

  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.min(totalMs, now - spotify.timestamps.start));
      setProgressMs(elapsed);
    };

    updateProgress();
    const timer = setInterval(updateProgress, 1000);
    return () => clearInterval(timer);
  }, [spotify.timestamps.start, spotify.timestamps.end, totalMs]);

  const progressPercent = Math.min(100, Math.max(0, (progressMs / totalMs) * 100));

  return (
    <div
      className={`rounded-2xl p-4 mb-3 relative overflow-hidden transition-all border ${
        isLight
          ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-slate-800'
          : 'bg-emerald-500/[0.05] border-emerald-500/20 text-slate-100'
      }`}
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400"></div>

      <div className="flex items-center gap-3.5 mb-3">
        {/* Album Art with pulse glow */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 relative shadow-md shadow-emerald-950/40">
          {spotify.album_art_url ? (
            <img
              src={spotify.album_art_url}
              alt={spotify.album}
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <Music className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow">
            <Music className="w-2.5 h-2.5 text-black" />
          </div>
        </div>

        {/* Track details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 dark:text-emerald-400 font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LISTENING ON SPOTIFY</span>
            </div>
            {spotify.track_id && (
              <a
                href={`https://open.spotify.com/track/${spotify.track_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 font-medium transition"
                title="Spotifyで開く"
              >
                <span>開く</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <p className="text-xs font-extrabold truncate" title={spotify.song}>
            {spotify.song}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate" title={spotify.artist}>
            {spotify.artist}
          </p>
        </div>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>{formatDuration(progressMs)}</span>
          <span>{formatDuration(totalMs)}</span>
        </div>
      </div>
    </div>
  );
};

export const ActivityWidget: React.FC<{
  activity: LanyardActivity;
  isLight?: boolean;
}> = ({ activity, isLight = false }) => {
  const [elapsed, setElapsed] = useState<string>('');

  const largeImgUrl = getActivityAssetUrl(activity.application_id, activity.assets?.large_image);
  const smallImgUrl = getActivityAssetUrl(activity.application_id, activity.assets?.small_image);

  const isCoding = activity.name.toLowerCase().includes('code') || activity.name.toLowerCase().includes('studio');

  useEffect(() => {
    if (!activity.timestamps?.start) {
      setElapsed('');
      return;
    }

    const calcElapsed = () => {
      const start = activity.timestamps?.start || Date.now();
      const diff = Math.max(0, Date.now() - start);
      setElapsed(`${formatDuration(diff)} 経過`);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [activity.timestamps?.start]);

  return (
    <div
      className={`rounded-2xl p-3.5 mb-3 flex items-center gap-3.5 relative overflow-hidden border ${
        isLight
          ? 'bg-purple-500/[0.04] border-purple-500/20 text-slate-800'
          : 'bg-purple-500/[0.05] border-purple-500/20 text-slate-100'
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>

      {/* App / Game Icon */}
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow">
        {largeImgUrl ? (
          <img
            src={largeImgUrl}
            alt={activity.assets?.large_text || activity.name}
            className="w-full h-full object-cover"
          />
        ) : isCoding ? (
          <Code2 className="w-6 h-6 text-purple-400" />
        ) : (
          <Gamepad2 className="w-6 h-6 text-purple-400" />
        )}

        {smallImgUrl && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border-2 border-slate-900 bg-slate-800">
            <img src={smallImgUrl} alt={activity.assets?.small_text || ''} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span>{isCoding ? 'DEVELOPMENT' : 'ACTIVITY'}</span>
          </div>
          {elapsed && <span className="text-[10px] font-mono text-slate-400">{elapsed}</span>}
        </div>

        <p className="text-xs font-bold truncate">{activity.name}</p>
        {activity.details && (
          <p className="text-[11px] text-slate-300 dark:text-slate-400 truncate">{activity.details}</p>
        )}
        {activity.state && (
          <p className="text-[10px] text-slate-400 truncate">{activity.state}</p>
        )}
      </div>
    </div>
  );
};

export const CustomStatusBubble: React.FC<{
  activity?: LanyardActivity;
}> = ({ activity }) => {
  if (!activity || !activity.state) return null;

  const customEmojiUrl = activity.emoji?.id
    ? `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'png'}`
    : null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-slate-200 shadow-sm animate-fade-in max-w-full">
      {customEmojiUrl ? (
        <img src={customEmojiUrl} alt={activity.emoji?.name || ''} className="w-4 h-4 object-contain" />
      ) : activity.emoji?.name ? (
        <span className="text-sm">{activity.emoji.name}</span>
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
      )}
      <span className="truncate font-medium">{activity.state}</span>
    </div>
  );
};
