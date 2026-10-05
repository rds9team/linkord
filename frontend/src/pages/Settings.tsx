import React, { useState } from 'react';
import { Palette, User, Link as LinkIcon, Gamepad2, Save, Check } from 'lucide-react';

const PRESET_THEMES = [
  { id: 'midnight', name: 'Midnight (王道ダーク)' },
  { id: 'amoled', name: 'AMOLED (漆黒ミニマル)' },
  { id: 'cyber', name: 'Cyberpunk (ネオン)' },
  { id: 'sunset', name: 'Sunset (夕暮れ)' },
  { id: 'tokyo', name: 'Tokyo (ラベンダー)' },
  { id: 'emerald', name: 'Emerald (深緑)' },
  { id: 'sakura', name: 'Sakura (ローズ)' },
  { id: 'chrome', name: 'Y2K Chrome' },
  { id: 'crimson', name: 'Crimson (深紅)' },
  { id: 'glass', name: 'Glass (すりガラス)' },
  { id: 'pixel', name: 'Pixel (レトロ)' },
  { id: 'clean', name: 'Clean (クリーン)' },
];

export const Settings: React.FC = () => {
  const [displayName, setDisplayName] = useState('yuto');
  const [bio, setBio] = useState('Fullstack Developer & Minecraft PvP Player. Building Linkord & Web projects.');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [themeId, setThemeId] = useState('midnight');
  const [hideBadges, setHideBadges] = useState(false);
  const [minecraftId, setMinecraftId] = useState('yuto_0926');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          プロフィール設定
        </h1>
        <p className="text-xs text-slate-400">
          公開プロフィールの情報やデザインテーマを編集できます。
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Basic Info */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <User className="w-4 h-4 text-purple-400" />
            <span>基本情報</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              自己紹介 (Bio)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Theme Settings (User specified: Dark / White + Presets) */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Palette className="w-4 h-4 text-sky-400" />
            <span>テーマ設定</span>
          </div>

          {/* Dark / White Mode selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              ベーステーマモード
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${themeMode === 'dark' ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 border-white/10 text-slate-400'}`}
              >
                <span>ダークモード (Dark)</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${themeMode === 'light' ? 'bg-white/20 border-white text-white shadow-lg' : 'bg-slate-900 border-white/10 text-slate-400'}`}
              >
                <span>ホワイトモード (Light)</span>
              </button>
            </div>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              プリセットテーマ選択
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_THEMES.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setThemeId(preset.id)}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-medium transition text-center ${themeId === preset.id ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Badge Display Option */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-300">バッジを非表示にする</span>
            <input
              type="checkbox"
              checked={hideBadges}
              onChange={(e) => setHideBadges(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Minecraft Integration */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span>Minecraft PlayHive連携</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minecraft ユーザー名 (Java / Bedrock)
            </label>
            <input
              type="text"
              value={minecraftId}
              onChange={(e) => setMinecraftId(e.target.value)}
              placeholder="例: yuto_0926"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>保存しました！</span>
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>設定を保存</span>
          </button>
        </div>

      </form>
    </div>
  );
};
