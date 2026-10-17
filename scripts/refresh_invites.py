#!/usr/bin/env python3
import asyncio
import sys
import os

# Linkord backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from app.core.database import AsyncSessionLocal
from app.api.server import refresh_all_server_invites

async def main():
    print("[*] Linkord: 全掲載サーバーの招待リンク再取得・修復を開始します...")
    async with AsyncSessionLocal() as db:
        res = await refresh_all_server_invites(db)
        print(f"[+] 完了: 全 {res['total']} 件中、{res['updated']} 件の招待リンクを更新・修復しました。")
        for r in res['results']:
            print(f"  - {r['slug']}: status={r['status']} -> {r['invite_url']}")

if __name__ == "__main__":
    asyncio.run(main())
