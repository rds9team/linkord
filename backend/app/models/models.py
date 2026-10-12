import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(32), index=True, nullable=False)
    tag = Column(String(4), nullable=True, default=None)
    password_hash = Column(String(256), nullable=True)
    display_name = Column(String(64), nullable=False)
    bio = Column(Text, nullable=True)
    theme_id = Column(String(32), default="midnight", nullable=False)
    theme_mode = Column(String(16), default="dark", nullable=False) # dark or light
    is_public = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    background_url = Column(String(512), nullable=True)
    music_url = Column(String(512), nullable=True)
    video_url = Column(String(512), nullable=True)
    email = Column(String(256), nullable=True, index=True)
    
    # Badges
    has_discord_authed = Column(Boolean, default=False, nullable=False)
    has_supporter = Column(Boolean, default=False, nullable=False)
    has_team = Column(Boolean, default=False, nullable=False)
    has_founder = Column(Boolean, default=False, nullable=False)
    hide_badges = Column(Boolean, default=False, nullable=False)
    hide_followers = Column(Boolean, default=False, nullable=False)
    
    # External integrations
    discord_id = Column(String(64), unique=True, index=True, nullable=True)
    minecraft_uuid = Column(String(64), nullable=True)
    analytics_id = Column(String(32), nullable=True) # G-XXXXXXXXXX

    # Playstyle & Matchmaking (feature 7)
    games = Column(String(256), nullable=True) # comma-separated: Apex,Valorant,Minecraft...
    active_hours = Column(String(128), nullable=True) # e.g. "weekday_night,holiday_all"
    play_style = Column(String(64), nullable=True) # e.g. "casual", "competitive", "enjoy", "voice_only"

    # Stats
    views_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    username_changed_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("username", "tag", name="uq_username_tag"),
    )

    @property
    def full_username(self) -> str:
        if self.tag:
            return f"{self.username}#{self.tag}"
        return self.username

    identities = relationship("AccountIdentity", back_populates="account", cascade="all, delete-orphan")
    links = relationship("SocialLink", back_populates="account", cascade="all, delete-orphan")
    servers = relationship("Server", back_populates="owner", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="account", cascade="all, delete-orphan")
    donations = relationship("Donation", back_populates="account")

class AccountIdentity(Base):
    __tablename__ = "account_identities"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(32), nullable=False) # discord, google, email
    provider_user_id = Column(String(128), nullable=False)
    provider_username = Column(String(128), nullable=True)
    access_token = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_user_id"),
    )
    account = relationship("Account", back_populates="identities")

class SocialLink(Base):
    __tablename__ = "social_links"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(32), nullable=False)
    url = Column(String(512), nullable=False)
    icon = Column(String(32), default="link", nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    account = relationship("Account", back_populates="links")

class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    slug = Column(String(48), unique=True, index=True, nullable=False)
    name = Column(String(64), nullable=False)
    guild_id = Column(String(64), nullable=True, index=True)
    description = Column(Text, nullable=True)
    icon_url = Column(String(512), nullable=True)
    invite_url = Column(String(512), nullable=False)
    tags = Column(String(256), default="", nullable=False)
    language = Column(String(16), default="ja", nullable=False)
    member_count = Column(Integer, default=0, nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    owner = relationship("Account", back_populates="servers")
    boosts = relationship("Boost", back_populates="server", cascade="all, delete-orphan")

class Boost(Base):
    __tablename__ = "boosts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    time_window = Column(String(32), nullable=False) # e.g. "2026-10-05-17" (1 hour bucket)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "server_id", "time_window", name="uq_user_server_boost_window"),
    )
    server = relationship("Server", back_populates="boosts")

class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
    )

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    target_type = Column(String(32), nullable=False) # profile, server, media
    target_id = Column(String(64), nullable=False)
    reason = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="pending", nullable=False) # pending, reviewed, resolved, rejected
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(48), nullable=True)

    account = relationship("Account", back_populates="sessions")

class ProfileBoost(Base):
    __tablename__ = "profile_boosts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True)
    target_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    ip_address = Column(String(48), nullable=True)
    time_window = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_profile_boost_user_window", "user_id", "target_account_id", "time_window"),
        Index("idx_profile_boost_ip_window", "ip_address", "target_account_id", "time_window"),
    )

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    donor_name = Column(String(64), nullable=False)
    paypay_url = Column(String(512), nullable=False)
    passcode = Column(String(16), nullable=True)
    amount = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="pending", nullable=False) # pending, approved, rejected
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    account = relationship("Account", back_populates="donations")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(64), nullable=False) # resolve_donation, toggle_visibility, update_badges, delete_media, etc.
    target_type = Column(String(32), nullable=False) # donation, profile, server, user, media
    target_id = Column(String(128), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    admin = relationship("Account", foreign_keys=[admin_id])

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(32), default="info", nullable=False) # info, update, warning, event
    link_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class VoiceRecruitment(Base):
    """グローバル通話募集（リアルタイムVCマッチング）"""
    __tablename__ = "voice_recruitments"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(128), nullable=False)
    game_tag = Column(String(64), nullable=True, index=True) # Valorant, Apex, Minecraft, 雑談, etc.
    target_count = Column(Integer, default=2, nullable=False) # 募集人数 (例: @2)
    voice_channel_url = Column(String(512), nullable=True) # VC直通リンクまたは招待リンク
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    server = relationship("Server", foreign_keys=[server_id])
    user = relationship("Account", foreign_keys=[user_id])

class ServerAlliance(Base):
    """サーバー同盟・姉妹提携（相互掲載）"""
    __tablename__ = "server_alliances"

    id = Column(Integer, primary_key=True, index=True)
    server_a_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    server_b_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="pending", nullable=False) # pending, accepted, rejected
    requested_by_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    server_a = relationship("Server", foreign_keys=[server_a_id])
    server_b = relationship("Server", foreign_keys=[server_b_id])


