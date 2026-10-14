#!/usr/bin/env python3
"""
behavior_evaluator.py - Duolingo-inspired Behavioral Scoring & Level-Up Engine.

Analyzes comprehensive learner behavior:
1. Quiz & drill accuracy across tracks (Grammar, Vocabulary, Listening, Writing)
2. Daily study streak consistency & exponential streak multipliers (1.0x - 1.5x)
3. IELTS Speaking test performance (Fluency, Lexical, Grammar, Pronunciation)
4. Speed drill & sentence builder response velocity
5. Dynamic level progression curve: XP(L) = 50 * L * (L - 1)
6. Competitive League Tiers: Bronze to Diamond
7. Unlockable achievement badges
8. CEFR band readiness & level-up promotion evaluation (A1 -> C2)
9. Personalized AI coaching nudges based on behavioral gaps

Can be executed as a standalone CLI tool or integrated via API.
"""

import sys
import math
import json
import argparse
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple

try:
    from backend.database import db
except ImportError:
    # Allow running directly as a standalone script: python backend/scoring/behavior_evaluator.py
    import os
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from backend.database import db


# =========================================================================
# Gamification & Tier Constants
# =========================================================================

LEAGUES = [
    {"name": "Bronze", "min_xp": 0, "badge": "🥉", "color": "#CD7F32"},
    {"name": "Silver", "min_xp": 500, "badge": "🥈", "color": "#C0C0C0"},
    {"name": "Gold", "min_xp": 1500, "badge": "🥇", "color": "#FFD700"},
    {"name": "Sapphire", "min_xp": 3000, "badge": "💎", "color": "#0055FF"},
    {"name": "Ruby", "min_xp": 5000, "badge": "🔴", "color": "#E0115F"},
    {"name": "Emerald", "min_xp": 7500, "badge": "🟢", "color": "#50C878"},
    {"name": "Amethyst", "min_xp": 10000, "badge": "🟣", "color": "#9966CC"},
    {"name": "Pearl", "min_xp": 15000, "badge": "🦪", "color": "#F0EAD6"},
    {"name": "Obsidian", "min_xp": 20000, "badge": "🖤", "color": "#3B3C36"},
    {"name": "Diamond", "min_xp": 30000, "badge": "👑", "color": "#B9F2FF"}
]

CEFR_STAGES = ["A1", "A2", "B1", "B1+", "B2", "C1", "C2"]

BADGE_DEFINITIONS = [
    {
        "id": "first_steps",
        "name": "First Steps",
        "emoji": "🌱",
        "desc": "Completed your first practice exercise.",
        "condition": lambda s, e, q: len(q) >= 1 or len(e) >= 1
    },
    {
        "id": "sharpshooter",
        "name": "Sharpshooter",
        "emoji": "🎯",
        "desc": "Scored 100% on a drill or quiz.",
        "condition": lambda s, e, q: any(r.get("percentage", 0) >= 100 for r in q) or s.get("perfect_scores_count", 0) >= 1
    },
    {
        "id": "on_fire",
        "name": "On Fire",
        "emoji": "🔥",
        "desc": "Maintained a 3-day active study streak.",
        "condition": lambda s, e, q: s.get("streak_days", 1) >= 3
    },
    {
        "id": "unstoppable",
        "name": "Unstoppable",
        "emoji": "⚡",
        "desc": "Maintained a 7-day study streak.",
        "condition": lambda s, e, q: s.get("streak_days", 1) >= 7
    },
    {
        "id": "polyglot_apprentice",
        "name": "Polyglot Apprentice",
        "emoji": "🌐",
        "desc": "Completed drills across 3 distinct skill tracks.",
        "condition": lambda s, e, q: len({r.get("track") for r in q if r.get("track")}) >= 3
    },
    {
        "id": "speaking_maestro",
        "name": "Speaking Maestro",
        "emoji": "🎙️",
        "desc": "Completed an official IELTS Speaking assessment.",
        "condition": lambda s, e, q: s.get("speaking_tests_taken", 0) >= 1 or any(ev.get("event_type") == "speaking_test" for ev in e)
    },
    {
        "id": "century_club",
        "name": "Century Club",
        "emoji": "💯",
        "desc": "Earned over 1,000 lifetime XP.",
        "condition": lambda s, e, q: s.get("total_xp", 0) >= 1000
    },
    {
        "id": "master_orator",
        "name": "Master Orator",
        "emoji": "🗣️",
        "desc": "Achieved Band 7.5 or higher on IELTS Speaking.",
        "condition": lambda s, e, q: any(ev.get("event_type") == "speaking_test" and ev.get("score", 0) >= 7.5 for ev in e)
    },
    {
        "id": "diamond_league",
        "name": "Diamond League",
        "emoji": "👑",
        "desc": "Ascended to the highest competitive tier (Diamond).",
        "condition": lambda s, e, q: s.get("total_xp", 0) >= 30000 or s.get("current_league") == "Diamond"
    }
]


# =========================================================================
# Core Behavior Evaluator Class
# =========================================================================

class BehaviorEvaluator:
    """Duolingo-inspired Behavioral Scoring and Level Engine."""

    @staticmethod
    def calculate_level(total_xp: int) -> int:
        """
        Calculates user level based on quadratic threshold curve:
        XP(L) = 50 * L * (L - 1)
        Solving for L: 50*L^2 - 50*L - XP = 0
        L = floor((50 + sqrt(2500 + 200*XP)) / 100) = floor((1 + sqrt(1 + 8*XP/100)) / 2)
        """
        if total_xp <= 0:
            return 1
        level = int(math.floor((1.0 + math.sqrt(1.0 + (8.0 * total_xp / 100.0))) / 2.0))
        return max(1, level)

    @staticmethod
    def get_level_thresholds(level: int) -> Tuple[int, int]:
        """
        Returns (current_level_min_xp, next_level_min_xp) for a given level.
        """
        lvl = max(1, level)
        current_min = 50 * lvl * (lvl - 1)
        next_min = 50 * (lvl + 1) * lvl
        return current_min, next_min

    @staticmethod
    def get_level_progress(total_xp: int) -> Dict[str, Any]:
        """Computes level, progress percentage towards next level, and XP delta needed."""
        level = BehaviorEvaluator.calculate_level(total_xp)
        cur_min, next_min = BehaviorEvaluator.get_level_thresholds(level)
        xp_in_level = max(0, total_xp - cur_min)
        xp_needed_for_level = max(1, next_min - cur_min)
        pct = min(100, max(0, round((xp_in_level / xp_needed_for_level) * 100)))
        remaining_xp = max(0, next_min - total_xp)

        return {
            "level": level,
            "current_level_min_xp": cur_min,
            "next_level_min_xp": next_min,
            "xp_in_level": xp_in_level,
            "xp_needed_for_level": xp_needed_for_level,
            "remaining_xp_to_next": remaining_xp,
            "progress_percentage": pct
        }

    @staticmethod
    def get_league(total_xp: int) -> Dict[str, Any]:
        """Determines learner's competitive league based on total accumulated XP."""
        current = LEAGUES[0]
        next_league = LEAGUES[1] if len(LEAGUES) > 1 else None

        for idx, lg in enumerate(LEAGUES):
            if total_xp >= lg["min_xp"]:
                current = lg
                next_league = LEAGUES[idx + 1] if idx + 1 < len(LEAGUES) else None
            else:
                break

        return {
            "name": current["name"],
            "badge": current["badge"],
            "color": current["color"],
            "min_xp": current["min_xp"],
            "next_league": next_league["name"] if next_league else None,
            "xp_to_next_league": (next_league["min_xp"] - total_xp) if next_league else 0
        }

    @staticmethod
    def calculate_streak_multiplier(streak_days: int) -> Tuple[float, str]:
        """
        Determines XP multiplier based on daily study consistency:
        1-2 days: 1.0x (Standard)
        3-6 days: 1.1x (On Fire 🔥)
        7-13 days: 1.25x (Unstoppable ⚡)
        14-29 days: 1.4x (Mastery 🌟)
        30+ days: 1.5x (Legendary 👑)
        """
        if streak_days >= 30:
            return 1.5, "Legendary 👑 (1.5x Boost)"
        elif streak_days >= 14:
            return 1.4, "Mastery 🌟 (1.4x Boost)"
        elif streak_days >= 7:
            return 1.25, "Unstoppable ⚡ (1.25x Boost)"
        elif streak_days >= 3:
            return 1.1, "On Fire 🔥 (1.1x Boost)"
        return 1.0, "Standard Pace (1.0x)"

    @staticmethod
    def update_streak(last_active_str: Optional[str], current_streak: int) -> Tuple[int, str]:
        """
        Audits consecutive daily activity:
        - If active today: streak unchanged.
        - If active yesterday: streak + 1.
        - If gap > 1 day: resets to 1.
        """
        today = date.today()
        today_str = today.strftime("%Y-%m-%d")

        if not last_active_str:
            return 1, today_str

        try:
            last_date = datetime.strptime(last_active_str[:10], "%Y-%m-%d").date()
        except Exception:
            return 1, today_str

        delta_days = (today - last_date).days

        if delta_days == 0:
            # Active again today, keep current streak
            return max(1, current_streak), today_str
        elif delta_days == 1:
            # Consecutive day! Increment streak
            return max(1, current_streak + 1), today_str
        else:
            # Missed at least one day, reset streak
            return 1, today_str

    @staticmethod
    def calculate_event_xp(
        event_type: str,
        score: float,
        max_score: float,
        streak_days: int
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Computes gamified XP for a discrete learning action with Duolingo-style bonuses.
        """
        multiplier, boost_label = BehaviorEvaluator.calculate_streak_multiplier(streak_days)
        breakdown = {
            "base_xp": 0,
            "accuracy_bonus": 0,
            "perfect_bonus": 0,
            "speaking_bonus": 0,
            "multiplier": multiplier,
            "boost_label": boost_label,
            "total_xp": 0
        }

        if event_type in ("quiz_complete", "drill_complete"):
            base = 20
            ratio = min(1.0, max(0.0, (score / max_score) if max_score > 0 else 0.0))
            accuracy_bonus = round(ratio * 20)  # up to +20
            perfect_bonus = 25 if ratio >= 1.0 and max_score > 0 else 0

            raw_total = base + accuracy_bonus + perfect_bonus
            awarded = round(raw_total * multiplier)

            breakdown.update({
                "base_xp": base,
                "accuracy_bonus": accuracy_bonus,
                "perfect_bonus": perfect_bonus,
                "total_xp": awarded
            })

        elif event_type == "speaking_test":
            base = 50
            # IELTS Speaking score 0 - 9
            band = min(9.0, max(0.0, score))
            speaking_bonus = round((band / 9.0) * 40)
            if band >= 7.5:
                speaking_bonus += 20  # High Band Distinction

            raw_total = base + speaking_bonus
            awarded = round(raw_total * multiplier)

            breakdown.update({
                "base_xp": base,
                "speaking_bonus": speaking_bonus,
                "total_xp": awarded
            })

        elif event_type in ("speed_game", "fast_phrases"):
            base = 25
            speed_bonus = 15 if score >= (max_score * 0.8) and max_score > 0 else 5
            awarded = round((base + speed_bonus) * multiplier)

            breakdown.update({
                "base_xp": base,
                "accuracy_bonus": speed_bonus,
                "total_xp": awarded
            })

        elif event_type == "daily_login":
            base = 10
            awarded = round(base * multiplier)
            breakdown.update({
                "base_xp": base,
                "total_xp": awarded
            })

        else:
            base = 15
            awarded = round(base * multiplier)
            breakdown.update({"base_xp": base, "total_xp": awarded})

        return breakdown["total_xp"], breakdown

    @staticmethod
    def evaluate_badges(
        user_scoring: Dict[str, Any],
        scoring_events: List[Dict[str, Any]],
        quiz_history: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Checks which achievement badges are unlocked.
        Returns: (all_unlocked_badges, newly_unlocked_badges)
        """
        existing_badge_ids = set()
        for b in user_scoring.get("badges", []):
            if isinstance(b, dict):
                existing_badge_ids.add(b.get("id"))
            elif isinstance(b, str):
                existing_badge_ids.add(b)

        unlocked_list = []
        newly_unlocked = []

        for bdef in BADGE_DEFINITIONS:
            bid = bdef["id"]
            is_unlocked = False
            try:
                is_unlocked = bdef["condition"](user_scoring, scoring_events, quiz_history)
            except Exception:
                is_unlocked = bid in existing_badge_ids

            if is_unlocked:
                badge_item = {
                    "id": bid,
                    "name": bdef["name"],
                    "emoji": bdef["emoji"],
                    "desc": bdef["desc"],
                    "unlocked_at": datetime.now().strftime("%Y-%m-%d %H:%M")
                }
                unlocked_list.append(badge_item)
                if bid not in existing_badge_ids:
                    newly_unlocked.append(badge_item)

        return unlocked_list, newly_unlocked

    @staticmethod
    def evaluate_cefr_readiness(
        quiz_history: List[Dict[str, Any]],
        scoring_events: List[Dict[str, Any]],
        current_level: str = "B1"
    ) -> Dict[str, Any]:
        """
        Evaluates learner's readiness for CEFR promotion (e.g. A1 -> A2, B1 -> B2).
        Requires:
        1. >= 4 completed modules in the current level
        2. >= 75% average accuracy in that level
        3. At least 1 speaking evaluation (if B1 or higher)
        """
        norm_level = (current_level or "B1").strip().upper()
        if norm_level not in CEFR_STAGES:
            norm_level = "B1"

        current_idx = CEFR_STAGES.index(norm_level)
        next_stage = CEFR_STAGES[current_idx + 1] if current_idx + 1 < len(CEFR_STAGES) else "C2 (Mastery)"

        # Filter quizzes taken for current CEFR level
        level_quizzes = [q for q in quiz_history if str(q.get("level", "")).upper() == norm_level]
        total_quizzes = len(level_quizzes)
        avg_pct = round(sum(q.get("percentage", 0) for q in level_quizzes) / total_quizzes, 1) if total_quizzes > 0 else 0.0

        speaking_attempts = [
            ev for ev in scoring_events
            if ev.get("event_type") == "speaking_test"
        ]
        has_speaking = len(speaking_attempts) >= 1

        # Criteria weights
        needed_quizzes = 4
        needed_accuracy = 75.0

        quiz_progress = min(1.0, total_quizzes / needed_quizzes)
        accuracy_progress = min(1.0, avg_pct / needed_accuracy) if avg_pct > 0 else 0.0
        speaking_progress = 1.0 if (has_speaking or current_idx < 2) else 0.0

        overall_readiness = round(((quiz_progress * 0.4) + (accuracy_progress * 0.4) + (speaking_progress * 0.2)) * 100)

        checklist = [
            {
                "requirement": f"Complete at least {needed_quizzes} {norm_level} drills",
                "current": f"{total_quizzes}/{needed_quizzes} drills",
                "completed": total_quizzes >= needed_quizzes
            },
            {
                "requirement": f"Maintain {needed_accuracy}% accuracy in {norm_level}",
                "current": f"{avg_pct}% accuracy",
                "completed": avg_pct >= needed_accuracy and total_quizzes >= 2
            }
        ]

        if current_idx >= 2:  # B1 and higher
            checklist.append({
                "requirement": "Complete at least 1 IELTS Speaking test",
                "current": f"{len(speaking_attempts)} completed",
                "completed": has_speaking
            })

        ready_for_promotion = all(item["completed"] for item in checklist)

        return {
            "current_cefr": norm_level,
            "next_target_cefr": next_stage,
            "readiness_percentage": min(100, overall_readiness),
            "is_ready_for_promotion": ready_for_promotion,
            "quizzes_completed_in_level": total_quizzes,
            "average_accuracy_in_level": avg_pct,
            "speaking_evaluations_count": len(speaking_attempts),
            "checklist": checklist
        }

    @staticmethod
    def generate_coaching_insights(
        track_stats: Dict[str, Any],
        streak_days: int,
        xp_info: Dict[str, Any],
        cefr_info: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Generates targeted Duolingo-style personalized behavioral recommendations.
        """
        insights = []

        # 1. Streak urgency & encouragement
        mult, label = BehaviorEvaluator.calculate_streak_multiplier(streak_days)
        if streak_days >= 3:
            insights.append({
                "type": "streak",
                "title": f"{streak_days}-Day Streak Active! 🔥",
                "text": f"You're currently enjoying a {label}. Keep practicing daily to protect your streak!",
                "icon": "🔥"
            })
        else:
            insights.append({
                "type": "streak",
                "title": "Build Your Habit 🌱",
                "text": "Practice 2 more days consecutively to unlock your 1.1x 'On Fire' XP booster!",
                "icon": "⚡"
            })

        # 2. XP level sprint
        rem_xp = xp_info.get("remaining_xp_to_next", 0)
        curr_lvl = xp_info.get("level", 1)
        if rem_xp <= 80:
            insights.append({
                "type": "level_sprint",
                "title": f"Almost Level {curr_lvl + 1}! 🚀",
                "text": f"Just {rem_xp} XP needed to level up. One quick quiz or speaking test will get you there!",
                "icon": "⭐"
            })
        else:
            insights.append({
                "type": "level",
                "title": f"Level {curr_lvl} Journey 🎯",
                "text": f"You've completed {xp_info.get('progress_percentage', 0)}% of Level {curr_lvl}. Total XP: {xp_info.get('total_xp', 0):,}.",
                "icon": "🏆"
            })

        # 3. Track skill gap identification
        track_accuracies = []
        for t, val in track_stats.items():
            if isinstance(val, dict) and val.get("count", 0) > 0:
                track_accuracies.append((t, val.get("accuracy", 0.0)))

        if track_accuracies:
            track_accuracies.sort(key=lambda x: x[1])
            weakest_track, acc = track_accuracies[0]
            if acc < 70.0:
                insights.append({
                    "type": "skill_focus",
                    "title": f"Sharpen {weakest_track.title()} 📐",
                    "text": f"Your {weakest_track.title()} accuracy is currently {acc}%. Dedicate 10 minutes to targeted {weakest_track} drills today.",
                    "icon": "💡"
                })

        # 4. CEFR readiness nudge
        if cefr_info.get("is_ready_for_promotion"):
            insights.append({
                "type": "promotion",
                "title": f"Ready for {cefr_info.get('next_target_cefr')}! 🎓",
                "text": f"You have met all benchmarks for {cefr_info.get('current_cefr')}. Unlock your next CEFR band!",
                "icon": "🌟"
            })

        return insights[:3]

    @classmethod
    def analyze_user(cls, user_id: str, persist: bool = True) -> Dict[str, Any]:
        """
        Executes complete behavioral evaluation for a given user.
        Reads database activity records, computes XP, streak, levels, badges,
        CEFR readiness, and optionally updates the persistent `user_scoring` table.
        """
        user_scoring = db.get_user_scoring(user_id) or {
            "user_id": user_id,
            "total_xp": 0,
            "current_level": 1,
            "current_league": "Bronze",
            "streak_days": 1,
            "last_active_date": date.today().strftime("%Y-%m-%d"),
            "accuracy_rate": 0.0,
            "quizzes_taken": 0,
            "speaking_tests_taken": 0,
            "perfect_scores_count": 0,
            "badges": [],
            "stats": {},
            "cefr_level": "B1",
            "cefr_ready": 0
        }

        # 1. Fetch historical raw activity data
        quiz_history = db.get_all_user_scores_history(user_id)
        scoring_events = db.get_scoring_events(user_id, limit=100)

        # 2. Compute Track Breakdown & Accuracy Rates
        track_stats = {
            "grammar": {"count": 0, "correct": 0, "total": 0, "accuracy": 0.0},
            "vocabulary": {"count": 0, "correct": 0, "total": 0, "accuracy": 0.0},
            "listening": {"count": 0, "correct": 0, "total": 0, "accuracy": 0.0},
            "writing": {"count": 0, "correct": 0, "total": 0, "accuracy": 0.0},
            "speaking": {"count": 0, "avg_band": 0.0, "total_band": 0.0}
        }

        total_correct = 0
        total_questions = 0
        perfect_count = 0

        for q in quiz_history:
            track = (q.get("track") or "grammar").lower()
            if track in track_stats:
                score = q.get("score", 0)
                tot = q.get("total", 0)
                track_stats[track]["count"] += 1
                track_stats[track]["correct"] += score
                track_stats[track]["total"] += tot
                total_correct += score
                total_questions += tot
                if score >= tot and tot > 0:
                    perfect_count += 1

        for t, stat in track_stats.items():
            if t != "speaking" and stat["total"] > 0:
                stat["accuracy"] = round((stat["correct"] / stat["total"]) * 100, 1)

        # Calculate speaking attempts from scoring events
        speaking_evs = [e for e in scoring_events if e.get("event_type") == "speaking_test"]
        if speaking_evs:
            tot_band = sum(e.get("score", 0.0) for e in speaking_evs)
            track_stats["speaking"]["count"] = len(speaking_evs)
            track_stats["speaking"]["total_band"] = tot_band
            track_stats["speaking"]["avg_band"] = round(tot_band / len(speaking_evs), 1)

        overall_accuracy = round((total_correct / total_questions) * 100, 1) if total_questions > 0 else 0.0

        # 3. Update Streak & Active Date
        streak_days, today_str = cls.update_streak(
            user_scoring.get("last_active_date"),
            user_scoring.get("streak_days", 1)
        )
        streak_mult, boost_label = cls.calculate_streak_multiplier(streak_days)

        # 4. Total XP and Level
        total_xp = user_scoring.get("total_xp", 0)
        xp_info = cls.get_level_progress(total_xp)
        current_level = xp_info["level"]

        # 5. League
        league_info = cls.get_league(total_xp)

        # 6. Badges
        updated_scoring_state = {
            **user_scoring,
            "total_xp": total_xp,
            "current_level": current_level,
            "current_league": league_info["name"],
            "streak_days": streak_days,
            "accuracy_rate": overall_accuracy,
            "quizzes_taken": len(quiz_history),
            "speaking_tests_taken": len(speaking_evs),
            "perfect_scores_count": perfect_count,
            "badges": user_scoring.get("badges", [])
        }
        all_badges, new_badges = cls.evaluate_badges(updated_scoring_state, scoring_events, quiz_history)
        updated_scoring_state["badges"] = all_badges

        # 7. CEFR Readiness
        target_cefr = user_scoring.get("cefr_level", "B1")
        cefr_info = cls.evaluate_cefr_readiness(quiz_history, scoring_events, target_cefr)

        # 8. Coaching Recommendations
        coaching_insights = cls.generate_coaching_insights(
            track_stats,
            streak_days,
            {**xp_info, "total_xp": total_xp},
            cefr_info
        )

        full_profile = {
            "user_id": user_id,
            "total_xp": total_xp,
            "current_level": current_level,
            "current_league": league_info["name"],
            "league_details": league_info,
            "streak_days": streak_days,
            "streak_multiplier": streak_mult,
            "streak_boost_label": boost_label,
            "last_active_date": today_str,
            "accuracy_rate": overall_accuracy,
            "quizzes_taken": len(quiz_history),
            "speaking_tests_taken": len(speaking_evs),
            "perfect_scores_count": perfect_count,
            "level_progress": xp_info,
            "track_mastery": track_stats,
            "badges": all_badges,
            "new_badges": new_badges,
            "cefr_readiness": cefr_info,
            "coaching_insights": coaching_insights,
            "recent_events": scoring_events[:10]
        }

        # Persist to SQLite
        if persist:
            db.save_user_scoring(user_id, {
                "total_xp": total_xp,
                "current_level": current_level,
                "current_league": league_info["name"],
                "streak_days": streak_days,
                "last_active_date": today_str,
                "accuracy_rate": overall_accuracy,
                "quizzes_taken": len(quiz_history),
                "speaking_tests_taken": len(speaking_evs),
                "perfect_scores_count": perfect_count,
                "badges": all_badges,
                "stats": {
                    "tracks": track_stats,
                    "cefr": cefr_info
                },
                "cefr_level": cefr_info.get("current_cefr", "B1"),
                "cefr_ready": 1 if cefr_info.get("is_ready_for_promotion") else 0
            })

        return full_profile

    @classmethod
    def process_event(
        cls,
        user_id: str,
        event_type: str,
        category: str = "",
        score: float = 0.0,
        max_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes a live learner action (quiz submitted, speaking completed, etc.),
        awards calculated XP with multipliers, checks for level up or new badges,
        persists the event, and returns a celebratory payload.
        """
        # Fetch current scoring
        current_profile = cls.analyze_user(user_id, persist=False)
        streak_days = current_profile.get("streak_days", 1)
        old_level = current_profile.get("current_level", 1)
        old_xp = current_profile.get("total_xp", 0)

        # Calculate XP for this action
        xp_awarded, xp_breakdown = cls.calculate_event_xp(
            event_type=event_type,
            score=score,
            max_score=max_score,
            streak_days=streak_days
        )

        new_total_xp = old_xp + xp_awarded
        new_level = cls.calculate_level(new_total_xp)
        leveled_up = new_level > old_level

        # Record discrete event in database
        event_record = db.record_scoring_event(
            user_id=user_id,
            event_type=event_type,
            category=category,
            score=score,
            max_score=max_score,
            xp_awarded=xp_awarded,
            metadata=metadata
        )

        # Update persistent scoring state
        db.save_user_scoring(user_id, {
            **current_profile,
            "total_xp": new_total_xp,
            "current_level": new_level,
            "current_league": cls.get_league(new_total_xp)["name"]
        })

        # Run re-analysis for new badges and updated profile
        updated_profile = cls.analyze_user(user_id, persist=True)

        celebration = None
        if leveled_up:
            celebration = {
                "type": "level_up",
                "old_level": old_level,
                "new_level": new_level,
                "title": f"🎉 LEVEL UP! You reached Level {new_level}!",
                "message": f"Amazing work! You've gained enough XP to reach Level {new_level}.",
                "reward_xp": 50
            }

        return {
            "success": True,
            "event_id": event_record.get("id"),
            "event_type": event_type,
            "xp_awarded": xp_awarded,
            "xp_breakdown": xp_breakdown,
            "old_xp": old_xp,
            "new_total_xp": new_total_xp,
            "old_level": old_level,
            "new_level": new_level,
            "leveled_up": leveled_up,
            "celebration": celebration,
            "new_badges": updated_profile.get("new_badges", []),
            "current_league": updated_profile.get("current_league"),
            "streak_days": updated_profile.get("streak_days"),
            "profile": updated_profile
        }


def evaluate_user_behavior(user_id: str = "guest") -> Dict[str, Any]:
    """Convenience functional wrapper for behavioral evaluation."""
    return BehaviorEvaluator.analyze_user(user_id)


# =========================================================================
# Standalone CLI Entry Point
# =========================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Duolingo-inspired Behavioral Scoring & Level-Up Engine (CLI)"
    )
    parser.add_argument("--user", default="guest", help="Learner user ID (default: guest)")
    parser.add_argument("--action", choices=["evaluate", "event", "leaderboard", "recalculate"], default="evaluate",
                        help="Action to perform (default: evaluate)")
    parser.add_argument("--event", default="quiz_complete", help="Event type for --action event")
    parser.add_argument("--track", default="grammar", help="Skill track (grammar, vocabulary, listening, speaking)")
    parser.add_argument("--score", type=float, default=5.0, help="Achieved score")
    parser.add_argument("--total", type=float, default=5.0, help="Maximum score")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted text")

    args = parser.parse_args()

    if args.action == "evaluate":
        res = BehaviorEvaluator.analyze_user(args.user)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            print("=" * 60)
            print(f"  AI ENGLISH COACH - DUOLINGO BEHAVIORAL SCORING REPORT")
            print("=" * 60)
            print(f"Learner ID:       {res['user_id']}")
            print(f"Total XP:         {res['total_xp']:,} XP")
            print(f"Current Level:    Level {res['current_level']} ({res['level_progress']['progress_percentage']}% to Level {res['current_level'] + 1})")
            print(f"XP to Next Level: {res['level_progress']['remaining_xp_to_next']} XP needed")
            print(f"Competitive Tier: {res['current_league']} League {res['league_details']['badge']}")
            print(f"Study Streak:     {res['streak_days']} Days ({res['streak_boost_label']})")
            print(f"Overall Accuracy: {res['accuracy_rate']}% across {res['quizzes_taken']} drills")
            print("-" * 60)
            print("Track Mastery:")
            for track, s in res['track_mastery'].items():
                if track == 'speaking':
                    print(f"  - Speaking:   {s['count']} tests (Avg Band: {s.get('avg_band', 0.0)})")
                else:
                    print(f"  - {track.title():11}: {s['accuracy']}% ({s['correct']}/{s['total']} correct)")
            print("-" * 60)
            print(f"CEFR Promotion Status:")
            cefr = res['cefr_readiness']
            print(f"  Current Level:  {cefr['current_cefr']} -> Next Target: {cefr['next_target_cefr']}")
            print(f"  Readiness:      {cefr['readiness_percentage']}% {'[READY FOR LEVEL UP! 🎓]' if cefr['is_ready_for_promotion'] else '[In Progress]'}")
            for item in cefr['checklist']:
                status = "✅" if item['completed'] else "⏳"
                print(f"    {status} {item['requirement']} ({item['current']})")
            print("-" * 60)
            print(f"Badges Unlocked ({len(res['badges'])}):")
            for b in res['badges']:
                print(f"  {b['emoji']} {b['name']} - {b['desc']}")
            print("-" * 60)
            print("Duolingo-Style Coaching Insights:")
            for ins in res['coaching_insights']:
                print(f"  {ins['icon']} [{ins['title']}] {ins['text']}")
            print("=" * 60)

    elif args.action == "event":
        res = BehaviorEvaluator.process_event(
            user_id=args.user,
            event_type=args.event,
            category=args.track,
            score=args.score,
            max_score=args.total,
            metadata={"cli": True}
        )
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            print("=" * 60)
            print(f"  EVENT PROCESSED: {args.event.upper()}")
            print("=" * 60)
            print(f"Learner ID:       {args.user}")
            print(f"XP Awarded:       +{res['xp_awarded']} XP (Total: {res['new_total_xp']:,} XP)")
            print(f"Breakdown:        Base: +{res['xp_breakdown']['base_xp']}, Accuracy: +{res['xp_breakdown']['accuracy_bonus']}, Perfect: +{res['xp_breakdown']['perfect_bonus']}, Multiplier: {res['xp_breakdown']['multiplier']}x")
            print(f"Current Level:    Level {res['new_level']}")
            if res['leveled_up']:
                print(f"🎉 LEVEL UP ALERT! Jumped from Level {res['old_level']} to Level {res['new_level']}! 🏆")
            if res.get('new_badges'):
                print(f"🎖️ New Badges Unlocked: {', '.join(b['name'] for b in res['new_badges'])}")
            print("=" * 60)

    elif args.action == "leaderboard":
        leaders = db.get_scoring_leaderboard(limit=10)
        if args.json:
            print(json.dumps(leaders, indent=2))
        else:
            print("=" * 60)
            print("  AI ENGLISH COACH - LEADERBOARD")
            print("=" * 60)
            for l in leaders:
                print(f"#{l['rank']:2} {l['display_name']:15} | Lvl {l['current_level']:2} | {l['current_league']:8} | {l['total_xp']:6,} XP | {l['streak_days']}d 🔥")
            print("=" * 60)


if __name__ == "__main__":
    main()
