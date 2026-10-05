from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List
import datetime

class SocialLinkBase(BaseModel):
    title: str = Field(..., max_length=32)
    url: str = Field(..., max_length=512)
    icon: str = Field(default="link", max_length=32)

class SocialLinkOut(SocialLinkBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class ProfileOut(BaseModel):
    username: str
    display_name: str
    bio: Optional[str] = None
    theme_id: str = "midnight"
    theme_mode: str = "dark"
    is_public: bool = True
    avatar_url: Optional[str] = None
    background_url: Optional[str] = None
    
    # Badges
    has_discord_authed: bool = False
    has_supporter: bool = False
    has_team: bool = False
    has_founder: bool = False
    hide_badges: bool = False
    
    # Links & Integrations
    links: List[SocialLinkOut] = []
    discord_id: Optional[str] = None
    minecraft_uuid: Optional[str] = None
    analytics_id: Optional[str] = None
    
    # Stats
    views_count: int = 0
    boosts_count: int = 0
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AccountMeOut(ProfileOut):
    id: int
    updated_at: datetime.datetime
    last_login_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=64)
    bio: Optional[str] = Field(None, max_length=1000)
    theme_id: Optional[str] = Field(None, max_length=32)
    theme_mode: Optional[str] = Field(None, max_length=16)
    is_public: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=512)
    background_url: Optional[str] = Field(None, max_length=512)
    minecraft_uuid: Optional[str] = Field(None, max_length=64)
    analytics_id: Optional[str] = Field(None, max_length=32)
    hide_badges: Optional[bool] = None

class ServerOut(BaseModel):
    id: int
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    invite_url: str
    tags: str
    language: str
    member_count: int
    boosts_count: int = 0
    is_public: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ServerCreate(BaseModel):
    slug: str = Field(..., max_length=48)
    name: str = Field(..., max_length=64)
    description: Optional[str] = None
    invite_url: str = Field(..., max_length=512)
    tags: str = ""
    language: str = "ja"

class ReportCreate(BaseModel):
    target_type: str = Field(..., max_length=32)
    target_id: str = Field(..., max_length=64)
    reason: str = Field(..., max_length=64)
    description: Optional[str] = None
