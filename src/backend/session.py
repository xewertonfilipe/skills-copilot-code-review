"""Simple in-memory session management for authenticated teacher actions."""

from datetime import datetime, timedelta, timezone
import secrets
from typing import Dict, Optional

SESSION_TTL_HOURS = 8

# token -> {"username": str, "expires_at": datetime}
_sessions: Dict[str, Dict[str, datetime | str]] = {}


def _cleanup_expired_sessions() -> None:
    """Remove expired tokens from memory to keep session storage small."""
    now = datetime.now(timezone.utc)
    expired_tokens = [
        token
        for token, data in _sessions.items()
        if isinstance(data.get("expires_at"), datetime) and data["expires_at"] <= now
    ]

    for token in expired_tokens:
        _sessions.pop(token, None)


def create_session(username: str) -> Dict[str, str]:
    """Create a session token for a given user."""
    with _sessions_lock:
        _cleanup_expired_sessions()

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)

        _sessions[token] = {
            "username": username,
            "expires_at": expires_at,
        }

    return {
        "session_token": token,
        "expires_at": expires_at.isoformat(),
    }


def validate_session(token: str, username: Optional[str] = None) -> bool:
    """Validate a token, optionally ensuring it belongs to the provided username."""
    _cleanup_expired_sessions()

    data = _sessions.get(token)
    if not data:
        return False

    if username and data.get("username") != username:
        return False

    expires_at = data.get("expires_at")
    if not isinstance(expires_at, datetime):
        return False

    return expires_at > datetime.now(timezone.utc)
