/**
 * api.js - Lightweight API client between UI and Backend Server
 * Handles:
 * - Module fetching (/api/modules/{track}/{level})
 * - User progress syncing (/api/progress)
 * - Quiz / class score saving & retrieval (/api/scores)
 * - Chat Coach AI interaction (/api/chat)
 * - AI Meme Generation (/api/meme/generate)
 *
 * Automatically falls back to offline local storage if backend server is unreachable.
 */
(function () {
    const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? window.location.origin
        : '';

    function getUserId() {
        if (window.AIEC_Auth && typeof window.AIEC_Auth.getUser === 'function') {
            const u = window.AIEC_Auth.getUser();
            return (u && u.id) || 'guest';
        }
        return 'guest';
    }

    async function fetchModule(track, level) {
        try {
            const res = await fetch(`${API_BASE}/api/modules/${encodeURIComponent(track)}/${encodeURIComponent(level)}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[API Client] Server module fetch failed, checking memory fallback:', e);
        }

        // Fallback: Check window.grammarSections, etc.
        if (track === 'grammar' && window.grammarSections && window.grammarSections[level.toUpperCase()]) {
            return window.grammarSections[level.toUpperCase()];
        }
        return null;
    }

    async function getProgress(track, level) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(uid)}/${encodeURIComponent(track)}/${encodeURIComponent(level)}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[API Client] Server progress fetch failed, falling back to localStorage');
        }
        return null;
    }

    async function saveProgress(track, level, moduleId, isCompleted) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: uid,
                    track,
                    level,
                    module_id: moduleId,
                    is_completed: !!isCompleted
                })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Server progress save failed, using local persistence');
        }
        return null;
    }

    async function getScores(track, level) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/scores/${encodeURIComponent(uid)}/${encodeURIComponent(track)}/${encodeURIComponent(level)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Server scores fetch failed');
        }
        return null;
    }

    async function saveScore(track, level, moduleId, score, total) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: uid,
                    track,
                    level,
                    module_id: moduleId,
                    score,
                    total
                })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Server score save failed');
        }
        return null;
    }

    async function getMemeStatus() {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/meme/status?user_id=${encodeURIComponent(uid)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Server meme status failed, checking localStorage fallback');
        }

        // Offline Fallback for status
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const saved = JSON.parse(localStorage.getItem('aiec_meme_status_v1') || '{}');
            const dayCount = saved.date === todayStr ? (saved.count || 0) : 0;
            const cooldownUntil = saved.cooldownUntil ? new Date(saved.cooldownUntil) : null;
            const now = new Date();
            const inCooldown = cooldownUntil && now < cooldownUntil;
            const remainingSec = inCooldown ? Math.max(0, Math.round((cooldownUntil - now) / 1000)) : 0;
            const remainingToday = Math.max(0, 15 - dayCount);

            return {
                user_id: uid,
                today_count: dayCount,
                daily_limit: 15,
                remaining_today: remainingToday,
                in_cooldown: !!inCooldown,
                cooldown_remaining_seconds: remainingSec,
                cooldown_until: inCooldown ? saved.cooldownUntil : null,
                can_generate: !inCooldown && remainingToday > 0,
                batch_size: Math.min(3, remainingToday)
            };
        } catch (e) {
            return {
                user_id: uid,
                today_count: 0,
                daily_limit: 15,
                remaining_today: 15,
                in_cooldown: false,
                cooldown_remaining_seconds: 0,
                can_generate: true,
                batch_size: 1
            };
        }
    }

    async function generateMeme(topic, count = 1) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/meme/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: uid,
                    topic: topic || 'English Grammar',
                    count: count || 1
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Sync localStorage with server stats
                if (data && data.stats) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    localStorage.setItem('aiec_meme_status_v1', JSON.stringify({
                        date: todayStr,
                        count: data.stats.today_count,
                        cooldownUntil: data.stats.cooldown_until
                    }));
                }
                return data;
            }

            // If rate limited (HTTP 429), parse the structured error
            if (res.status === 429) {
                const errJson = await res.json().catch(() => ({}));
                return {
                    success: false,
                    rate_limited: true,
                    detail: errJson.detail || errJson
                };
            }
        } catch (e) {
            console.warn('[API Client] Server meme generation failed, using local offline generator');
        }

        // Offline generation fallback
        const status = await getMemeStatus();
        if (status.in_cooldown) {
            return {
                success: false,
                rate_limited: true,
                detail: {
                    error: 'cooldown_active',
                    message: `Cooldown active. Please wait ${Math.ceil(status.cooldown_remaining_seconds / 60)} minutes.`,
                    remaining_seconds: status.cooldown_remaining_seconds,
                    status
                }
            };
        }
        if (status.remaining_today <= 0) {
            return {
                success: false,
                rate_limited: true,
                detail: {
                    error: 'daily_limit_reached',
                    message: 'Daily limit reached: 15/15 memes generated today. Come back tomorrow!',
                    status
                }
            };
        }

        return null;
    }

    async function sendChatMessage(message, history) {
        const uid = getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid, message, history: history || [] })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Chat API failed');
        }
        return null;
    }

    async function evaluateSpeakingAudio(audioBlob, topic, prompt) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'speaking_recording.webm');
            formData.append('topic', topic || 'General Speaking');
            formData.append('prompt', prompt || 'Speak freely on the topic.');
            formData.append('verify_compression', 'true');

            const res = await fetch(`${API_BASE}/api/speaking/evaluate`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                return await res.json();
            }
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Evaluation request failed');
        } catch (e) {
            console.warn('[API Client] Audio evaluation request failed:', e);
            throw e;
        }
    }

    async function evaluateSpeakingText(transcript, topic, prompt) {
        try {
            const res = await fetch(`${API_BASE}/api/speaking/evaluate-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, topic, prompt })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Text evaluation failed:', e);
        }
        return null;
    }

    window.AIEC_API = {
        fetchModule,
        getProgress,
        saveProgress,
        getScores,
        saveScore,
        generateMeme,
        getMemeStatus,
        sendChatMessage,
        evaluateSpeakingAudio,
        evaluateSpeakingText
    };
})();
