import React, { useState } from 'react';
import { X, Radio, Server, MessageSquare, Clock, Users, ArrowRight } from 'lucide-react';
import { createVoiceRecruitment } from '../api/client';
import { ServerData, VoiceRecruitmentItem } from '../types';

interface CreateRecruitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  myServers: ServerData[];
  onCreated: (item: VoiceRecruitmentItem) => void;
}

export const CreateRecruitmentModal: React.FC<CreateRecruitmentModalProps> = ({
  isOpen,
  onClose,
  myServers,
  onCreated,
}) => {
  const [serverId, setServerId] = useState<number>(myServers[0]?.id || 0);
  const [title, setTitle] = useState('');
  const [gameTag, setGameTag] = useState('雑談');
  const [targetCount, setTargetCount] = useState(2);
  const [durationHours, setDurationHours] = useState(2);
  const [voiceChannelUrl, setVoiceChannelUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId) {
      setError('募集するサーバーを選択してください');
      return;
    }
    if (!title.trim()) {
      setError('募集タイトルを入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await createVoiceRecruitment({
        server_id: serverId,
        title: title.trim(),
        game_tag: gameTag.trim(),
        target_count: targetCount,
        duration_hours: durationHours,
        voice_channel_url: voiceChannelUrl.trim() || undefined,
      });
      onCreated(res);
      onClose();
    } catch (err: any) {
      setError(err.message || '募集の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetTags = ['雑談', 'Valorant', 'Apex Legends', 'Minecraft', '原神', '作業・勉強', 'Overwatch 2', 'League of Legends'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#10131d] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold">グローバル通話募集を作成</h2>
            <p className="text-xs text-slate-400">参加者がボタンを押すとDiscordサーバーに直接流入します</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>募集するサーバー</span>
            </label>
            {myServers.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                ⚠️ あなたが掲載しているサーバーがありません。先に「サーバーを掲載」してください。
              </p>
            ) : (
              <select
                value={serverId}
                onChange={(e) => setServerId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {myServers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#121624] text-white">
                    {s.name} ({s.member_count}名)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>募集タイトル</span>
            </label>
            <input
              type="text"
              required
              placeholder="例: 深夜のまったり雑談！作業通話も歓迎 @2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">カテゴリ / ゲーム</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presetTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setGameTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    gameTag === tag
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={gameTag}
              onChange={(e) => setGameTag(e.target.value)}
              placeholder="タグを直接入力"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>募集人数</span>
              </label>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white"
              >
                {[1, 2, 3, 4, 5, 8, 10].map((num) => (
                  <option key={num} value={num} className="bg-[#121624]">
                    @{num} 名
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>掲載継続時間</span>
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white"
              >
                <option value={1} className="bg-[#121624]">1時間</option>
                <option value={2} className="bg-[#121624]">2時間</option>
                <option value={3} className="bg-[#121624]">3時間</option>
                <option value={6} className="bg-[#121624]">6時間</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || myServers.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white transition flex items-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {isSubmitting ? '作成中...' : '通話募集を開始する'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
