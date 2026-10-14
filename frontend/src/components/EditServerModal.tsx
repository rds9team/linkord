import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles, Check } from 'lucide-react';
import { ServerData, ServerUpdateData } from '../types';
import { updateServer } from '../api/client';

interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: ServerData;
  onUpdated: (server: ServerData) => void;
}

const COMMON_MC_TAGS = [
  'Java版',
  '統合版(BE)',
  'クロスプレイ',
  'サバイバル',
  '建築',
  'PvP',
  'ミニゲーム',
  'MOD導入',
  '経済/RPG',
  '24時間稼働',
];

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  onClose,
  server,
  onUpdated,
}) => {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [inviteUrl, setInviteUrl] = useState(server.invite_url || '');
  const [tags, setTags] = useState(server.tags || '');
  const [language, setLanguage] = useState(server.language || 'ja');
  const [selectedMcTags, setSelectedMcTags] = useState<string[]>([]);
  const [customMcTag, setCustomMcTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(server.name);
      setDescription(server.description || '');
      setInviteUrl(server.invite_url || '');
      setTags(server.tags || '');
      setLanguage(server.language || 'ja');
      const currentMcTags = server.minecraft_tags
        ? server.minecraft_tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      setSelectedMcTags(currentMcTags);
      setError(null);
    }
  }, [isOpen, server]);

  if (!isOpen) return null;

  const toggleMcTag = (tag: string) => {
    if (selectedMcTags.includes(tag)) {
      setSelectedMcTags(selectedMcTags.filter(t => t !== tag));
    } else {
      setSelectedMcTags([...selectedMcTags, tag]);
    }
  };

  const handleAddCustomMcTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customMcTag.trim();
    if (trimmed && !selectedMcTags.includes(trimmed)) {
      setSelectedMcTags([...selectedMcTags, trimmed]);
      setCustomMcTag('');
    }
  };

  const handleRemoveMcTag = (tag: string) => {
    setSelectedMcTags(selectedMcTags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const updatePayload: ServerUpdateData = {
      name: name.trim(),
      description: description.trim(),
      invite_url: inviteUrl.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean).join(','),
      minecraft_tags: selectedMcTags.join(','),
      language,
    };

    try {
      const updated = await updateServer(server.slug, updatePayload);
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'サーバー情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-1">サーバー情報の編集</h2>
        <p className="text-xs text-slate-400 mb-5">
          サーバーの所有者またはDiscordの管理者権限をお持ちのため、情報を更新できます。
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">サーバー名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">サーバー概要</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="サーバーの特徴、参加条件、イベント情報などを記入してください"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">公式招待URL</label>
            <input
              type="url"
              value={inviteUrl}
              onChange={e => setInviteUrl(e.target.value)}
              placeholder="https://discord.gg/xxxx"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              ※ Botが導入されている場合、参加ボタンでは常に有効な招待リンクが自動発行されます。
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">タグ (カンマ区切り)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="コミュニティ, ゲーム, 雑談"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">言語</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-xs"
            >
              <option value="ja">日本語 (Japanese)</option>
              <option value="en">English</option>
              <option value="all">その他・多言語</option>
            </select>
          </div>

          {/* Minecraftタグ設定 */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <label className="font-semibold text-slate-200">
                Minecraftサーバー設定 (Minecraftタブで優先表示)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              該当するタグを選択すると、Minecraft専門タブやフィルタリングで検索されやすくなります。
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_MC_TAGS.map(tag => {
                const isSelected = selectedMcTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleMcTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* カスタムタグ追加 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customMcTag}
                onChange={e => setCustomMcTag(e.target.value)}
                placeholder="他のMinecraftタグを入力"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddCustomMcTag}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold transition"
              >
                追加
              </button>
            </div>

            {selectedMcTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedMcTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMcTag(tag)}
                      className="hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>変更を保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
