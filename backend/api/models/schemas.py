"""schemas.py - Pydantic request and response schemas for AI English Coach API."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ProgressUpdate(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    track: str = Field(..., description="Curriculum track (e.g. grammar, vocabulary)")
    level: str = Field(..., description="CEFR Level (e.g. A1, A2, B1)")
    module_id: str = Field(..., description="Module / class identifier")
    is_completed: bool = Field(default=True, description="Completion status flag")


class ScoreRecord(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    track: str = Field(..., description="Curriculum track")
    level: str = Field(..., description="CEFR Level")
    module_id: str = Field(..., description="Module identifier")
    score: int = Field(..., description="Achieved score")
    total: int = Field(..., description="Total available points")


class ChatRequest(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    message: str = Field(..., description="User message prompt")
    history: Optional[List[Dict[str, str]]] = Field(default=None, description="Previous conversation turns")


class MemeRequest(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    topic: Optional[str] = Field(default="English Grammar & Vocabulary", description="Meme theme or topic")
    count: int = Field(default=1, description="Number of memes to generate (default 1 per click)")
    top_px: int = Field(default=0, description="Pixels to crop from top")
    bottom_px: int = Field(default=14, description="Pixels to crop from bottom")
    left_px: int = Field(default=0, description="Pixels to crop from left")
    right_px: int = Field(default=0, description="Pixels to crop from right")


class SpeakingTextRequest(BaseModel):
    transcript: str = Field(..., description="Speech transcript text")
    topic: Optional[str] = Field(default="Describe a memorable journey", description="IELTS topic")
    prompt: Optional[str] = Field(default="Describe a memorable journey.", description="Examiner question prompt")
    model: Optional[str] = Field(default="deepseek-v4.1-flash:free", description="LLM evaluator model")


class GoalRequest(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    target_band: float = Field(default=7.5, description="Target IELTS overall band (e.g. 7.5)")
    target_exam_date: Optional[str] = Field(default="", description="Target exam date YYYY-MM-DD")
    daily_minutes: int = Field(default=30, description="Target daily study minutes")
    current_focus: Optional[str] = Field(default="Fluency & Coherence", description="Current primary focus area")
    target_level: Optional[str] = Field(default="B2", description="Target CEFR mastery level")
    notes: Optional[str] = Field(default="", description="Personal study notes or strategy")


class UserPreferencesRequest(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    display_name: Optional[str] = Field(default="Learner", description="Display name")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User UI & study preferences")


class ScoringEventRequest(BaseModel):
    user_id: str = Field(default="guest", description="User identifier")
    event_type: str = Field(default="quiz_complete", description="Event type (quiz_complete, speaking_test, speed_game, daily_login)")
    category: Optional[str] = Field(default="grammar", description="Track/category (grammar, vocabulary, listening, writing, speaking)")
    score: float = Field(default=0.0, description="Earned score or band")
    max_score: float = Field(default=0.0, description="Maximum possible score")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context/metadata")

