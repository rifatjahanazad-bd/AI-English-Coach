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
    const API_BASE = (function () {
        // 1. Explicit override if set globally or in localStorage
        if (typeof window.AIEC_API_BASE === 'string' && window.AIEC_API_BASE.trim()) {
            return window.AIEC_API_BASE.trim().replace(/\/+$/, '');
        }
        try {
            const stored = localStorage.getItem('aiec_api_base');
            if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
        } catch (e) {}

        // 2. Frontend dev servers (e.g. Vite :5173, Live Server :5500, :8000, :8080)
        // If frontend is on a separate port on localhost/127.0.0.1, point to backend at :3000
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            if (window.location.port && window.location.port !== '3000') {
                return `${window.location.protocol}//${window.location.hostname}:3000`;
            }
        }

        // 3. Same-origin backend (:3000) or Vercel serverless: relative path works everywhere
        return '';
    })();

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

    async function fetchModuleClass(track, level, classId) {
        try {
            const res = await fetch(`${API_BASE}/api/modules/${encodeURIComponent(track)}/${encodeURIComponent(level)}/${encodeURIComponent(classId)}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[API Client] Server single class fetch failed:', e);
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
        // Direct Cloud Firestore backup if signed in
        if (window.AIEC_Auth && typeof window.AIEC_Auth.saveProgressToFirestore === 'function') {
            window.AIEC_Auth.saveProgressToFirestore(track, level, moduleId, isCompleted);
        }
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
        // Direct Cloud Firestore backup if signed in
        if (window.AIEC_Auth && typeof window.AIEC_Auth.saveScoreToFirestore === 'function') {
            window.AIEC_Auth.saveScoreToFirestore(track, level, moduleId, score, total);
        }
        let scoreRes = null;
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
            if (res.ok) scoreRes = await res.json();
        } catch (e) {
            console.warn('[API Client] Server score save failed');
        }

        // Duolingo Behavioral Scoring & Level-Up Trigger
        recordScoringEvent({
            user_id: uid,
            event_type: 'quiz_complete',
            category: track,
            score: Number(score) || 0,
            max_score: Number(total) || 0,
            metadata: { level, module_id: moduleId }
        }).catch(err => console.warn('[API Client] Scoring event dispatch note:', err));

        return scoreRes;
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
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 45000) : null;
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid, message, history: history || [] }),
                signal: controller ? controller.signal : undefined
            });
            if (timeoutId) clearTimeout(timeoutId);
            if (res.ok) return await res.json();
            const errText = await res.text().catch(() => '');
            console.error('[API Client] Chat API failed with HTTP', res.status, errText);
        } catch (e) {
            console.warn('[API Client] Chat API network failed:', e);
        }
        return null;
    }

    async function getChatHistory(userId) {
        const uid = userId || getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/chat/history/${encodeURIComponent(uid)}`);
            if (res.ok) {
                const data = await res.json();
                return data.history || [];
            }
        } catch (e) {
            console.warn('[API Client] Chat history fetch failed:', e);
        }
        return [];
    }

    async function evaluateSpeakingAudio(audioBlob, topic, prompt) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'speaking_recording.webm');
            formData.append('topic', topic || 'General Speaking');
            formData.append('prompt', prompt || 'Speak freely on the topic.');
            formData.append('verify_compression', 'false');

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

    async function getGoal(userId) {
        const uid = userId || getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/goal/${encodeURIComponent(uid)}`);
            if (res.ok) {
                const data = await res.json();
                try {
                    localStorage.setItem('aiec_user_goal', JSON.stringify(data));
                } catch (e) {}
                return data;
            }
        } catch (e) {
            console.warn('[API Client] Goal fetch failed:', e);
        }

        // Offline or cached fallback
        try {
            const cached = localStorage.getItem('aiec_user_goal');
            if (cached) return JSON.parse(cached);
        } catch (e) {}

        return {
            user_id: uid,
            target_band: 7.5,
            target_exam_date: '',
            daily_minutes: 30,
            current_focus: 'Fluency & Coherence',
            target_level: 'B2',
            notes: ''
        };
    }

    async function saveGoal(goalData) {
        const uid = getUserId();
        const payload = Object.assign({ user_id: uid }, goalData);

        // Immediate local sync & window event dispatch
        try {
            localStorage.setItem('aiec_user_goal', JSON.stringify(payload));
            window.dispatchEvent(new CustomEvent('aiec-goal-updated', { detail: payload }));
        } catch (e) {}

        // Direct Cloud Firestore backup if signed in
        if (window.AIEC_Auth && typeof window.AIEC_Auth.saveGoalToFirestore === 'function') {
            window.AIEC_Auth.saveGoalToFirestore(payload);
        }
        try {
            const res = await fetch(`${API_BASE}/api/goal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                try {
                    localStorage.setItem('aiec_user_goal', JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent('aiec-goal-updated', { detail: data }));
                } catch (e) {}
                return data;
            }
        } catch (e) {
            console.warn('[API Client] Goal save failed:', e);
        }
        return payload;
    }

    async function getSpeakingTopics() {
        try {
            const res = await fetch(`${API_BASE}/api/speaking/topics`);
            if (res.ok) {
                const data = await res.json();
                return data.topics || [];
            }
        } catch (e) {
            console.warn('[API Client] Speaking topics fetch failed:', e);
        }
        return (typeof window.topics !== 'undefined' && Array.isArray(window.topics)) ? window.topics : [];
    }

    async function getSpeakingTopic(topicId) {
        try {
            const res = await fetch(`${API_BASE}/api/speaking/topic/${encodeURIComponent(topicId)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Speaking topic fetch failed:', e);
        }
        return null;
    }

    // =========================================================================
    // Duolingo Behavioral Scoring & Level-Up API
    // =========================================================================

    function playCelebrationSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const start = ctx.currentTime + (idx * 0.09);
                gain.gain.setValueAtTime(0.01, start);
                gain.gain.exponentialRampToValueAtTime(0.28, start + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.35);
            });
        } catch (e) {}
    }

    function showLevelUpCelebration(celebration) {
        if (!celebration) return;
        playCelebrationSound();

        // Dispatch window event so dashboard or profile bars can refresh
        window.dispatchEvent(new CustomEvent('aiec:levelup', { detail: celebration }));

        // Remove any existing celebration modal
        const existing = document.getElementById('aiecLevelUpModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'aiecLevelUpModal';
        modal.className = 'aiec-levelup-overlay';
        modal.innerHTML = `
            <div class="aiec-levelup-card animate-pop-in">
                <div class="aiec-levelup-stars">✨ 🌟 ✨</div>
                <div class="aiec-levelup-badge-ring">
                    <span class="aiec-levelup-number">LVL ${celebration.new_level}</span>
                </div>
                <h2 class="aiec-levelup-title">${celebration.title || '🎉 LEVEL UP!'}</h2>
                <p class="aiec-levelup-msg">${celebration.message || 'You reached a new learning milestone!'}</p>
                <div class="aiec-levelup-bonus">
                    <span>⭐ +${celebration.reward_xp || 50} Bonus XP</span>
                    <span>🔥 Streak Active</span>
                </div>
                <button class="aiec-levelup-btn" id="aiecLevelUpClaimBtn">Continue Crushing It! 🚀</button>
            </div>
        `;
        document.body.appendChild(modal);

        const claimBtn = modal.querySelector('#aiecLevelUpClaimBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                modal.classList.add('fade-out');
                setTimeout(() => modal.remove(), 260);
            });
        }
        // Auto-dismiss after 7 seconds if unclicked
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.classList.add('fade-out');
                setTimeout(() => modal.remove(), 260);
            }
        }, 7000);
    }

    async function getUserScoring(userId) {
        const uid = userId || getUserId();
        try {
            const res = await fetch(`${API_BASE}/api/scoring/user/${encodeURIComponent(uid)}`);
            if (res.ok) {
                const data = await res.json();
                // Cache locally for offline reliability
                try {
                    localStorage.setItem(`aiec_scoring_${uid}`, JSON.stringify(data));
                } catch (e) {}
                return data;
            }
        } catch (e) {
            console.warn('[API Client] Scoring profile fetch failed, using local fallback:', e);
        }

        // Offline Fallback
        try {
            const cached = localStorage.getItem(`aiec_scoring_${uid}`);
            if (cached) return JSON.parse(cached);
        } catch (e) {}

        return {
            user_id: uid,
            total_xp: 0,
            current_level: 1,
            current_league: 'Bronze',
            league_details: { badge: '🥉', name: 'Bronze', color: '#CD7F32' },
            streak_days: 1,
            streak_multiplier: 1.0,
            streak_boost_label: 'Standard Pace (1.0x)',
            accuracy_rate: 0.0,
            quizzes_taken: 0,
            speaking_tests_taken: 0,
            perfect_scores_count: 0,
            level_progress: { level: 1, progress_percentage: 0, remaining_xp_to_next: 100 },
            track_mastery: {
                grammar: { count: 0, correct: 0, total: 0, accuracy: 0.0 },
                vocabulary: { count: 0, correct: 0, total: 0, accuracy: 0.0 },
                listening: { count: 0, correct: 0, total: 0, accuracy: 0.0 },
                speaking: { count: 0, avg_band: 0.0 }
            },
            badges: [],
            cefr_readiness: { current_cefr: 'B1', next_target_cefr: 'B2', readiness_percentage: 0, is_ready_for_promotion: false, checklist: [] },
            coaching_insights: [{ type: 'streak', title: 'Start Today! 🔥', text: 'Daily consistency unlocks streak multipliers.', icon: '⚡' }]
        };
    }

    async function recordScoringEvent(eventData) {
        const uid = (eventData && eventData.user_id) || getUserId();
        const payload = Object.assign({
            user_id: uid,
            event_type: 'quiz_complete',
            category: 'grammar',
            score: 0,
            max_score: 0,
            metadata: {}
        }, eventData);

        try {
            const res = await fetch(`${API_BASE}/api/scoring/event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.leveled_up && data.celebration) {
                    showLevelUpCelebration(data.celebration);
                }
                // Refresh local cached scoring
                if (data.profile) {
                    try {
                        localStorage.setItem(`aiec_scoring_${uid}`, JSON.stringify(data.profile));
                    } catch (e) {}
                }
                window.dispatchEvent(new CustomEvent('aiec-scoring-updated', { detail: data }));
                window.dispatchEvent(new CustomEvent('aiec:scoring-updated', { detail: data }));
                return data;
            }
        } catch (e) {
            console.warn('[API Client] Record scoring event failed:', e);
        }
        return null;
    }

    async function getScoringLeaderboard(limit = 10) {
        try {
            const res = await fetch(`${API_BASE}/api/scoring/leaderboard?limit=${encodeURIComponent(limit)}`);
            if (res.ok) {
                const data = await res.json();
                return data.leaderboard || [];
            }
        } catch (e) {
            console.warn('[API Client] Leaderboard fetch failed:', e);
        }
        return [];
    }

    async function getAvailableBadges() {
        try {
            const res = await fetch(`${API_BASE}/api/scoring/badges`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('[API Client] Badges fetch failed:', e);
        }
        return { badges: [], leagues: [] };
    }

    window.AIEC_API = {
        fetchModule,
        fetchModuleClass,
        getProgress,
        saveProgress,
        getScores,
        saveScore,
        generateMeme,
        getMemeStatus,
        sendChatMessage,
        getChatHistory,
        evaluateSpeakingAudio,
        evaluateSpeakingText,
        getGoal,
        saveGoal,
        getSpeakingTopics,
        getSpeakingTopic,
        getRoutes,
        getUserScoring,
        recordScoringEvent,
        getScoringLeaderboard,
        getAvailableBadges,
        showLevelUpCelebration
    };
})();
