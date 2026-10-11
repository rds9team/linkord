import datetime
import httpx
from typing import Optional
from app.core.config import settings

async def send_discord_webhook(embed: dict):
    webhook_url = settings.DISCORD_DONATION_WEBHOOK_URL
    if not webhook_url:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(webhook_url, json={"embeds": [embed]})
    except Exception:
        # Failure to send webhook should not block core operations
        pass

async def notify_donation_discord(donation, donor_account=None):
    donor_display = donation.donor_name
    if donor_account:
        donor_display = f"{donor_account.display_name} (@{donor_account.full_username})"

    embed = {
        "title": "💸 新しいPayPay応援・支援が届きました！",
        "description": (
            f"**支援者**: {donor_display}\n"
            f"**送金リンク**: [PayPayで受け取る]({donation.paypay_url})\n"
            f"**パスコード**: `{donation.passcode or '設定なし'}`\n"
            f"**金額目安**: {f'¥{donation.amount:,}' if donation.amount else '未指定'}\n"
            f"**メッセージ**: {donation.message or 'なし'}\n\n"
            f"管理パネルから確認・バッジ付与を行ってください。"
        ),
        "color": 0xFF0033,  # PayPay Red
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "footer": {
            "text": "Linkord 応援・支援通知システム"
        }
    }
    await send_discord_webhook(embed)

async def notify_boost_discord(target_name: str, target_type: str, booster_account=None):
    booster_display = "匿名ユーザー"
    if booster_account:
        booster_display = f"{booster_account.display_name} (@{booster_account.full_username})"

    type_label = "プロフィール" if target_type == "profile" else "Discordサーバー"
    color = 0xF59E0B if target_type == "profile" else 0x9333EA  # Amber for profile, Purple for server

    embed = {
        "title": f"🔥 新しい{type_label}の応援（ブースト）がありました！",
        "description": (
            f"**対象**: **{target_name}** ({type_label})\n"
            f"**応援者**: {booster_display}\n"
            f"**日時**: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
            f"熱い応援が届きました！🚀"
        ),
        "color": color,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "footer": {
            "text": "Linkord 応援・ブースト通知システム"
        }
    }
    await send_discord_webhook(embed)
