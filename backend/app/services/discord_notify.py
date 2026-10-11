import sys
import os
import datetime
import httpx
from typing import Optional
from app.core.config import settings

# 日本標準時 (JST, UTC+9:00) タイムゾーン定義
JST = datetime.timezone(datetime.timedelta(hours=9), name="JST")

def is_testing_environment() -> bool:
    """テスト実行時やテスト環境フラグが立っている場合はWebhook送信を完全に抑止する"""
    return (
        "pytest" in sys.modules
        or os.environ.get("TESTING") == "1"
        or getattr(settings, "TESTING", False)
    )

async def send_discord_webhook(embed: dict):
    if is_testing_environment():
        return
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

    # 日本標準時 (JST, UTC+9) で日時を算出
    now_jst = datetime.datetime.now(JST)

    embed = {
        "title": "💸 新しいPayPay応援・支援が届きました！",
        "description": (
            f"**支援者**: {donor_display}\n"
            f"**送金リンク**: [PayPayで受け取る]({donation.paypay_url})\n"
            f"**パスコード**: `{donation.passcode or '設定なし'}`\n"
            f"**金額目安**: {f'¥{donation.amount:,}' if donation.amount else '未指定'}\n"
            f"**メッセージ**: {donation.message or 'なし'}\n"
            f"**日時**: {now_jst.strftime('%Y-%m-%d %H:%M:%S JST')}\n\n"
            f"管理パネルから確認・バッジ付与を行ってください。"
        ),
        "color": 0xFF0033,  # PayPay Red
        "timestamp": now_jst.isoformat(),
        "footer": {
            "text": "Linkord 応援・支援通知システム (JST)"
        }
    }
    await send_discord_webhook(embed)

async def notify_boost_discord(target_name: str, target_type: str, booster_account=None):
    """
    ブースト通知は停止（ユーザー要望: ブースト通知はいらん、PayPayだけにしてくれ）
    呼び出し元の互換性のためにシグネチャを残し、何もしない（no-op）。
    """
    return
