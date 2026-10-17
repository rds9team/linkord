from pydantic import BaseModel, Field, HttpUrl, ConfigDict, field_validator
from typing import Optional, List
import datetime
import re

from app.core.security import is_reserved_username

def validate_safe_http_url(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return ""
    if not (v.startswith("http://") or v.startswith("https://") or v.startswith("/uploads/")):
        raise ValueError("URLはhttp://またはhttps://で始まる必要があります")
    return v

class SocialLinkBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=32)
    url: str = Field(..., min_length=1, max_length=512)
    icon: str = Field(default="link", max_length=32)

    @field_validator("url")
    @classmethod
    def check_url_scheme(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URLを入力してください")
        lower_v = v.lower()
        if lower_v.startswith("javascript:") or lower_v.startswith("data:") or lower_v.startswith("vbscript:"):
            raise ValueError("無効または安全でないURLスキームです")
        if not (lower_v.startswith("http://") or lower_v.startswith("https://")):
            v = f"https://{v}"
        return v

class SocialLinkOut(SocialLinkBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class ProfileOut(BaseModel):
    username: str
    tag: Optional[str] = None
    full_username: Optional[str] = None
    display_name: str
    bio: Optional[str] = None
    theme_id: str = "midnight"
    theme_mode: str = "dark"
    is_public: bool = True
    avatar_url: Optional[str] = None
    background_url: Optional[str] = None
    music_url: Optional[str] = None
    video_url: Optional[str] = None
    
    # Badges
    has_discord_authed: bool = False
    has_supporter: bool = False
    has_team: bool = False
    has_founder: bool = False
    hide_badges: bool = False
    hide_followers: bool = False
    
    # Links & Integrations
    links: List[SocialLinkOut] = []
    discord_id: Optional[str] = None
    minecraft_uuid: Optional[str] = None
    analytics_id: Optional[str] = None

    # Playstyle (feature 7)
    games: Optional[str] = None
    active_hours: Optional[str] = None
    play_style: Optional[str] = None
    
    # Stats
    views_count: int = 0
    boosts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False
    username_changed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AccountMeOut(ProfileOut):
    id: int
    email: Optional[str] = None
    has_discord_token: bool = False
    needs_discord_reauth: bool = False
    updated_at: datetime.datetime
    last_login_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=24)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: Optional[str] = Field(None, max_length=64)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_\.]+$", v):
            raise ValueError("ユーザー名は半角英数字、アンダースコア（_）、ドット（.）のみ使用できます")
        if is_reserved_username(v):
            raise ValueError("このユーザー名は使用できません")
        return v

class UserLogin(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=36)
    password: str = Field(..., min_length=1, max_length=128)

class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=32)
    display_name: Optional[str] = Field(None, max_length=64)
    bio: Optional[str] = Field(None, max_length=1000)
    theme_id: Optional[str] = Field(None, max_length=32)
    theme_mode: Optional[str] = Field(None, max_length=16)
    is_public: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=512)
    background_url: Optional[str] = Field(None, max_length=512)
    music_url: Optional[str] = Field(None, max_length=512)
    video_url: Optional[str] = Field(None, max_length=512)
    minecraft_uuid: Optional[str] = Field(None, max_length=64)
    analytics_id: Optional[str] = Field(None, max_length=32)
    games: Optional[str] = Field(None, max_length=256)
    active_hours: Optional[str] = Field(None, max_length=128)
    play_style: Optional[str] = Field(None, max_length=64)
    hide_badges: Optional[bool] = None
    hide_followers: Optional[bool] = None
    links: Optional[List[SocialLinkBase]] = Field(None, max_length=8)

    @field_validator("links")
    @classmethod
    def validate_links_max_count(cls, v: Optional[List[SocialLinkBase]]) -> Optional[List[SocialLinkBase]]:
        if v is not None and len(v) > 8:
            raise ValueError("登録できるリンクは最大8件までです")
        return v

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_\.]+$", v):
            raise ValueError("ユーザー名は半角英数字、アンダースコア（_）、ドット（.）のみ使用できます")
        return v

    @field_validator("avatar_url", "background_url", "music_url", "video_url")
    @classmethod
    def check_media_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_safe_http_url(v)

class ServerOut(BaseModel):
    id: int
    slug: str
    name: str
    guild_id: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    invite_url: str
    tags: str
    minecraft_tags: Optional[str] = ""
    language: str
    member_count: int
    boosts_count: int = 0
    is_public: bool
    can_edit: Optional[bool] = False
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ServerCreate(BaseModel):
    slug: str = Field(..., max_length=48)
    name: str = Field(..., max_length=64)
    guild_id: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    invite_url: str = Field(..., max_length=512)
    tags: str = ""
    minecraft_tags: Optional[str] = ""
    language: str = "ja"

    @field_validator("invite_url")
    @classmethod
    def check_invite_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("招待URLを入力してください")
        if not (v.startswith("http://") or v.startswith("https://")):
            if v.startswith("discord.gg/") or v.startswith("discord.com/"):
                v = f"https://{v}"
            else:
                v = f"https://discord.gg/{v}"
        return v

    @field_validator("icon_url")
    @classmethod
    def check_icon_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_safe_http_url(v)

class ServerUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    invite_url: Optional[str] = Field(None, max_length=512)
    tags: Optional[str] = None
    minecraft_tags: Optional[str] = None
    language: Optional[str] = None

    @field_validator("invite_url")
    @classmethod
    def check_update_invite_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("招待URLはhttp://またはhttps://で始まる必要があります")
        return v

    @field_validator("icon_url")
    @classmethod
    def check_update_icon_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_safe_http_url(v)

class ReportCreate(BaseModel):
    target_type: str = Field(..., max_length=32)
    target_id: str = Field(..., min_length=1, max_length=64)
    reason: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=1000)

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("profile", "server", "donation", "user", "other"):
            raise ValueError("無効な通報対象タイプです")
        return v

class FollowUserOut(BaseModel):
    username: str
    tag: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    has_discord_authed: bool = False
    has_supporter: bool = False
    has_team: bool = False
    has_founder: bool = False

    model_config = ConfigDict(from_attributes=True)

class ProfileSearchResult(FollowUserOut):
    views_count: int = 0
    followers_count: int = 0

class ReportOut(BaseModel):
    id: int
    reporter_id: Optional[int] = None
    target_type: str
    target_id: str
    reason: str
    description: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReportUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=32)
    admin_note: Optional[str] = None

class AdminStatsOut(BaseModel):
    total_users: int
    total_servers: int
    total_reports: int
    pending_reports: int
    total_donations: int = 0
    pending_donations: int = 0

class DonationCreate(BaseModel):
    paypay_url: str = Field(..., max_length=512)
    passcode: Optional[str] = Field(None, max_length=16)
    amount: Optional[int] = Field(None, ge=1)
    message: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False

    @field_validator("paypay_url")
    @classmethod
    def validate_paypay_url(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^https://pay\.paypay\.ne\.jp/[a-zA-Z0-9_\-\.\/\?=&%#]+$", v):
            raise ValueError("有効なPayPay送金リンク（https://pay.paypay.ne.jp/...）を入力してください")
        return v

class DonationOut(BaseModel):
    id: int
    account_id: Optional[int] = None
    donor_name: str
    paypay_url: str
    passcode: Optional[str] = None
    amount: Optional[int] = None
    message: Optional[str] = None
    is_anonymous: bool = False
    status: str
    admin_note: Optional[str] = None
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    donor_username: Optional[str] = None
    donor_avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SupporterPublicOut(BaseModel):
    id: int
    donor_name: str
    donor_username: Optional[str] = None
    donor_avatar: Optional[str] = None
    amount: Optional[int] = None
    message: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class DonationResolve(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    admin_note: Optional[str] = None

class ManualSupporterCreate(BaseModel):
    username: Optional[str] = None
    donor_name: Optional[str] = None
    amount: Optional[int] = Field(None, ge=1)
    message: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False

class AuditLogOut(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_username: Optional[str] = None
    action: str
    target_type: str
    target_id: str
    details: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    type: str = "info"
    link_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AnnouncementCreate(BaseModel):
    title: str = Field(..., max_length=128)
    content: str
    type: str = Field("info", max_length=32)
    link_url: Optional[str] = Field(None, max_length=512)

class BatchBadgesUpdate(BaseModel):
    usernames: List[str]
    has_supporter: Optional[bool] = None
    has_team: Optional[bool] = None
    has_founder: Optional[bool] = None
    has_discord_authed: Optional[bool] = None

class BatchBadgesResult(BaseModel):
    updated_count: int
    updated_users: List[str]
    not_found_users: List[str]
    message: str

class VoiceRecruitmentCreate(BaseModel):
    server_id: int
    title: str = Field(..., min_length=2, max_length=100)
    game_tag: Optional[str] = Field("雑談", max_length=40)
    target_count: int = Field(2, ge=1, le=99)
    voice_channel_url: Optional[str] = Field(None, max_length=512)
    duration_hours: int = Field(2, ge=1, le=6) # 募集継続時間 (1〜6時間)

class VoiceRecruitmentOut(BaseModel):
    id: int
    server_id: int
    server_name: str
    server_slug: str
    server_icon_url: Optional[str] = None
    server_invite_url: str
    user_id: int
    user_display_name: str
    user_avatar_url: Optional[str] = None
    title: str
    game_tag: Optional[str] = None
    target_count: int
    voice_channel_url: Optional[str] = None
    is_active: bool
    expires_at: datetime.datetime
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ServerAllianceCreate(BaseModel):
    target_server_slug: str

class ServerAllianceOut(BaseModel):
    id: int
    partner_server_id: int
    partner_server_name: str
    partner_server_slug: str
    partner_server_icon_url: Optional[str] = None
    partner_server_member_count: int
    partner_server_invite_url: str
    status: str
    created_at: datetime.datetime

class GameOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)

class GameCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)




