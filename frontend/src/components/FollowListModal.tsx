import React, { useEffect, useState } from 'react';
import { X, Users, UserCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FollowUser } from '../types';
import { fetchFollowers, fetchFollowing } from '../api/client';
import { Badges } from './Badges';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  type: 'followers' | 'following';
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  username,
  type,
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadUsers = async () => {
      try {
        const data =
          type === 'followers'
            ? await fetchFollowers(username)
            : await fetchFollowing(username);
        if (isMounted) {
          setUsers(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'ユーザー一覧の取得に失敗しました');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, username, type]);

  if (!isOpen) return null;

  const title = type === 'followers' ? 'フォロワー' : 'フォロー中';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#0d1117]/80">
          <div className="flex items-center gap-2">
            {type === 'followers' ? (
              <Users className="w-5 h-5 text-indigo-400" />
            ) : (
              <UserCheck className="w-5 h-5 text-indigo-400" />
            )}
            <h3 className="text-base font-bold text-white">{title}</h3>
            <span className="text-xs text-gray-400">(@{username})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto flex-1 p-3 divide-y divide-[#21262d]/50">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-sm">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-400 text-sm px-4">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              {type === 'followers'
                ? 'まだフォロワーはいません'
                : 'まだ誰もフォローしていません'}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.username}
                onClick={() => {
                  onClose();
                  navigate(`/@${user.username}`);
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#21262d]/60 cursor-pointer transition group"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#21262d] border border-[#30363d] flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-base">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition truncate">
                      {user.display_name}
                    </span>
                    <Badges
                      hasDiscordAuthed={user.has_discord_authed}
                      hasFounder={user.has_founder}
                      hasTeam={user.has_team}
                      hasSupporter={user.has_supporter}
                    />
                  </div>
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
