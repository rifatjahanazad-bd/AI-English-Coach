"""scoring.py - Duolingo-inspired Behavioral Scoring & Level-Up API Endpoints.

Handles:
- Behavioral user evaluation & XP progress: /api/scoring/user/{user_id}
- Action event logging & dynamic level-up triggers: /api/scoring/event
- Competitive League Leaderboard: /api/scoring/leaderboard
- Available badges catalog: /api/scoring/badges
- Scoring profile recalculation: /api/scoring/recalculate/{user_id}
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.scoring.behavior_evaluator import BehaviorEvaluator, BADGE_DEFINITIONS, LEAGUES
from backend.api.models.schemas import ScoringEventRequest
from backend.database import db

router = APIRouter(prefix="/api/scoring", tags=["scoring"])


@router.get("/user/{user_id}")
def get_user_scoring_profile(user_id: str):
    """
    Retrieves full behavioral evaluation and gamification profile for a user.
    Includes: Level, total XP, next level progress %, League tier,
    Daily streak & multiplier, CEFR readiness checklist, and personalized AI coaching insights.
    """
    clean_uid = (user_id or "guest").strip()
    try:
        profile = BehaviorEvaluator.analyze_user(clean_uid, persist=True)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate user behavior: {str(e)}")


@router.post("/event")
def record_scoring_event_and_evaluate(payload: ScoringEventRequest):
    """
    Processes a discrete learning action (quiz complete, speaking exam, speed drill, daily login).
    Awards gamified XP with accuracy, perfect lesson, and streak multipliers.
    Triggers celebratory payload if the learner levels up or unlocks new badges.
    """
    clean_uid = (payload.user_id or "guest").strip()
    try:
        result = BehaviorEvaluator.process_event(
            user_id=clean_uid,
            event_type=payload.event_type,
            category=payload.category or "grammar",
            score=payload.score,
            max_score=payload.max_score,
            metadata=payload.metadata or {}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process scoring event: {str(e)}")


@router.get("/leaderboard")
def get_leaderboard(limit: int = Query(default=10, ge=1, le=50)):
    """
    Returns ranked competitive league leaderboard with learner XP, level, league, and badges.
    """
    try:
        leaders = db.get_scoring_leaderboard(limit=limit)
        # If fewer than 3 users in DB, provide standard competitive cohort
        if len(leaders) < 3:
            mock_champions = [
                {"rank": 1, "user_id": "sarah_ielts", "display_name": "Sarah K. 🇬🇧", "total_xp": 4820, "current_level": 10, "current_league": "Ruby", "streak_days": 18, "accuracy_rate": 96.5, "badges": [{"emoji": "🔥"}, {"emoji": "👑"}]},
                {"rank": 2, "user_id": "alex_oxford", "display_name": "Alex M. 🇺🇸", "total_xp": 3640, "current_level": 9, "current_league": "Sapphire", "streak_days": 12, "accuracy_rate": 92.0, "badges": [{"emoji": "⚡"}]},
                {"rank": 3, "user_id": "kenji_tokyo", "display_name": "Kenji T. 🇯🇵", "total_xp": 2890, "current_level": 8, "current_league": "Gold", "streak_days": 9, "accuracy_rate": 89.5, "badges": [{"emoji": "🎯"}]},
                {"rank": 4, "user_id": "maria_madrid", "display_name": "Maria G. 🇪🇸", "total_xp": 2150, "current_level": 7, "current_league": "Gold", "streak_days": 7, "accuracy_rate": 88.0, "badges": [{"emoji": "🌱"}]}
            ]
            # Merge existing real users into cohort
            combined = leaders.copy()
            existing_ids = {u["user_id"] for u in combined}
            for mc in mock_champions:
                if mc["user_id"] not in existing_ids:
                    combined.append(mc)
            combined.sort(key=lambda x: x.get("total_xp", 0), reverse=True)
            for idx, entry in enumerate(combined[:limit]):
                entry["rank"] = idx + 1
            return {"leaderboard": combined[:limit], "total": len(combined[:limit])}

        return {"leaderboard": leaders, "total": len(leaders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}")


@router.get("/badges")
def get_all_badges():
    """Returns catalog of all unlockable achievement badges and competitive league tiers."""
    return {
        "badges": [
            {
                "id": b["id"],
                "name": b["name"],
                "emoji": b["emoji"],
                "desc": b["desc"]
            }
            for b in BADGE_DEFINITIONS
        ],
        "leagues": LEAGUES
    }


@router.post("/recalculate/{user_id}")
def recalculate_user_scoring(user_id: str):
    """
    Recalculates all scores, XP, streaks, levels, and CEFR eligibility from raw database activity history.
    Useful for data repair, migrations, or resyncing after offline sessions.
    """
    clean_uid = (user_id or "guest").strip()
    try:
        profile = BehaviorEvaluator.analyze_user(clean_uid, persist=True)
        return {"status": "success", "message": f"Successfully recalculated scoring for user '{clean_uid}'", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation error: {str(e)}")
