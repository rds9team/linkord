import re
from typing import Optional, Tuple, List

# スパム・フィッシング検知用正規表現パターン
SUSPICIOUS_URL_PATTERNS = [
    r"https?://[a-zA-Z0-9_\-\.]*discord[\-_]?(?:gift|nitro|drop|app\-nitro)[a-zA-Z0-9_\-\.]*",
    r"https?://[a-zA-Z0-9_\-\.]*dlscord[a-zA-Z0-9_\-\.]*",
    r"https?://[a-zA-Z0-9_\-\.]*steamcommunity[\-_]?trade[a-zA-Z0-9_\-\.]*",
]

# スパム・悪意あるキーワード
SUSPICIOUS_KEYWORDS = [
    "free nitro",
    "free discord nitro",
    "claim your nitro",
    "無料でニトロ",
    "無料配布",
]

def check_content_safety(text: Optional[str]) -> Tuple[bool, List[str]]:
    """
    テキスト内の不審なパターン（フィッシングリンク、スパムワード等）をルールベースで検査。
    Returns:
        (is_flagged: bool, reasons: List[str])
    """
    if not text:
        return False, []

    reasons = []
    text_lower = text.lower()

    for pattern in SUSPICIOUS_URL_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            reasons.append(f"不審なURLパターン検知: {match.group(0)[:60]}")

    for kw in SUSPICIOUS_KEYWORDS:
        if kw in text_lower:
            reasons.append(f"スパム検知キーワード: {kw}")

    return len(reasons) > 0, reasons
