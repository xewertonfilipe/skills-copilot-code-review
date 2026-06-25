"""
Announcement endpoints for the High School Management System API
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from ..database import announcements_collection, teachers_collection
from ..session import validate_session

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)

DATE_FORMAT = "%Y-%m-%d"


class AnnouncementInput(BaseModel):
    """Input model for creating and updating announcements."""

    message: str = Field(..., min_length=3, max_length=500)
    expires_date: str
    start_date: Optional[str] = None


def _validate_teacher(
    teacher_username: Optional[str],
    authorization: Optional[str]
) -> Dict[str, Any]:
    """Ensure the user is authenticated before mutating announcements."""
    if not teacher_username:
        raise HTTPException(
            status_code=401,
            detail="Authentication required for this action"
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid session token")

    token = authorization.replace("Bearer ", "", 1).strip()
    if not token or not validate_session(token, teacher_username):
        raise HTTPException(status_code=401, detail="Session is invalid or expired")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def _parse_date(value: str, field_name: str) -> datetime:
    try:
        return datetime.strptime(value, DATE_FORMAT)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must use YYYY-MM-DD format"
        ) from exc


def _serialize_announcement(
    announcement: Dict[str, Any],
    include_created_by: bool = False
) -> Dict[str, Any]:
    response = {
        "id": str(announcement["_id"]),
        "message": announcement["message"],
        "start_date": announcement.get("start_date"),
        "expires_date": announcement["expires_date"],
    }

    if include_created_by:
        response["created_by"] = announcement.get("created_by")

    return response


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get all currently active announcements for the public homepage banner."""
    today = datetime.utcnow().strftime(DATE_FORMAT)

    query = {
        "expires_date": {"$gte": today},
        "$or": [
            {"start_date": None},
            {"start_date": {"$exists": False}},
            {"start_date": ""},
            {"start_date": {"$lte": today}},
        ],
    }

    announcements = announcements_collection.find(query).sort("expires_date", 1)
    return [_serialize_announcement(item) for item in announcements]


@router.get("/manage", response_model=List[Dict[str, Any]])
def get_all_announcements_for_management(
    teacher_username: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
) -> List[Dict[str, Any]]:
    """Get every announcement (active and inactive) for authenticated management."""
    _validate_teacher(teacher_username, authorization)
    announcements = announcements_collection.find({}).sort("expires_date", 1)
    return [_serialize_announcement(item, include_created_by=True) for item in announcements]


@router.post("", response_model=Dict[str, Any])
def create_announcement(
    payload: AnnouncementInput,
    teacher_username: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Create a new announcement. Expiration date is required."""
    teacher = _validate_teacher(teacher_username, authorization)

    expires_date = _parse_date(payload.expires_date, "expires_date")
    start_date = None

    if payload.start_date:
        start_date = _parse_date(payload.start_date, "start_date")
        if start_date > expires_date:
            raise HTTPException(
                status_code=400,
                detail="start_date cannot be later than expires_date"
            )

    new_announcement = {
        "message": payload.message.strip(),
        "start_date": payload.start_date,
        "expires_date": payload.expires_date,
        "created_by": teacher["_id"],
    }

    result = announcements_collection.insert_one(new_announcement)
    created = announcements_collection.find_one({"_id": result.inserted_id})

    return _serialize_announcement(created, include_created_by=True)


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementInput,
    teacher_username: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Update an existing announcement."""
    _validate_teacher(teacher_username, authorization)

    expires_date = _parse_date(payload.expires_date, "expires_date")
    if payload.start_date:
        start_date = _parse_date(payload.start_date, "start_date")
        if start_date > expires_date:
            raise HTTPException(
                status_code=400,
                detail="start_date cannot be later than expires_date"
            )

    try:
        object_id = ObjectId(announcement_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid announcement id") from exc

    result = announcements_collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "message": payload.message.strip(),
                "start_date": payload.start_date,
                "expires_date": payload.expires_date,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updated = announcements_collection.find_one({"_id": object_id})
    return _serialize_announcement(updated, include_created_by=True)


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
) -> Dict[str, str]:
    """Delete an announcement by id."""
    _validate_teacher(teacher_username, authorization)

    try:
        object_id = ObjectId(announcement_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid announcement id") from exc

    result = announcements_collection.delete_one({"_id": object_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted"}
