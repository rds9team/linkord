import React from 'react';
import { CheckCircle2, Crown, Shield, Zap } from 'lucide-react';

interface BadgesProps {
  hasDiscordAuthed?: boolean;
  hasFounder?: boolean;
  hasTeam?: boolean;
  hasSupporter?: boolean;
  hideBadges?: boolean;
}

export const Badges: React.FC<BadgesProps> = ({
  hasDiscordAuthed,
  hasFounder,
  hasTeam,
  hasSupporter,
  hideBadges,
}) => {
  if (hideBadges) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Authed (Discord Authed) - spec color: #8b949e */}
      {hasDiscordAuthed && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-help transition"
          style={{
            backgroundColor: 'rgba(139, 148, 158, 0.15)',
            borderColor: 'rgba(139, 148, 158, 0.35)',
            borderWidth: '1px',
            color: '#8b949e',
          }}
          title="Authed (Discord連携認証済み)"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Authed</span>
        </div>
      )}

      {/* Founder - spec color: #a855f7 */}
      {hasFounder && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-help transition"
          style={{
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            borderColor: 'rgba(168, 85, 247, 0.35)',
            borderWidth: '1px',
            color: '#a855f7',
          }}
          title="Linkord Founder"
        >
          <Crown className="w-3 h-3" />
          <span>Founder</span>
        </div>
      )}

      {/* Team - spec color: #f5b942 */}
      {hasTeam && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-help transition"
          style={{
            backgroundColor: 'rgba(245, 185, 66, 0.15)',
            borderColor: 'rgba(245, 185, 66, 0.35)',
            borderWidth: '1px',
            color: '#f5b942',
          }}
          title="Linkord / rds9team"
        >
          <Shield className="w-3 h-3" />
          <span>Team</span>
        </div>
      )}

      {/* Supporter - spec color: #3b82f6 */}
      {hasSupporter && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-help transition"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderColor: 'rgba(59, 130, 246, 0.35)',
            borderWidth: '1px',
            color: '#3b82f6',
          }}
          title="Supporter (開発支援者)"
        >
          <Zap className="w-3 h-3" />
          <span>Supporter</span>
        </div>
      )}
    </div>
  );
};
