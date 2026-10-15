/**
 * ==========================================================================
 * CLEAN PLAYFUL DASHBOARD CONTROLLER (dashboard.js)
 * Cleaned and streamlined to focus strictly on user profile and learning essentials:
 * 1. [User Name with Dynamic Greetings & Status]
 * 2. [English Proficiency Breakdown: Reading, Writing, Speaking]
 *    - Full handling for new users, first-time visits & Day 1 diagnostic baseline
 * 3. [Speaking Test Section Banner (11 Official Topics)]
 * 4. [Current Streaks: Weekly Strip (Mon-Sun, marking active, missed & today)]
 * 5. [Game Scores (Fast Phrases) & Other Scores (XP, Level, Accuracy)]
 * 6. [Random Meme Card with IELTS Hint & Interactive Shuffle]
 * 7. [Banner: Chat with AI IELTS Mentor with direct action button]
 * ==========================================================================
 */

(function () {
    'use strict';

    // 23 Curated Photographic Memes with educational IELTS tips
    const DASH_MEME_CATALOG = [
        {
            template: "woman-cat",
            topic: "Irregular Verbs",
            top: "Teacher: You cannot just invent irregular verbs!",
            bottom: "Me: I eated, I sleeped, and I catched the bus",
            joke: "Why conjugate when you can add -ed to everything? Remember: eat ➔ ate, sleep ➔ slept, catch ➔ caught!"
        },
        {
            template: "gb",
            topic: "Lexical Resource",
            top: "Very good -> Exceptional -> Quintessentially sublime",
            bottom: "Me substituting every single basic word in IELTS Task 2",
            joke: "Examiners value natural, precise collocation over 5-syllable synonyms used out of context."
        },
        {
            template: "right",
            topic: "Essay Proofreading",
            top: "I just finished my 250-word essay in 12 minutes!",
            bottom: "You checked for subject-verb agreement, right? ... Right?",
            joke: "Always reserve 3–5 minutes at the end to catch missing plural 's' endings and run-on sentences."
        },
        {
            template: "panik-kalm-panik",
            topic: "Listening Section 4",
            top: "Exam tomorrow: PANIK! Practiced with AI English Coach: KALM!",
            bottom: "Section 4 has an Australian accent talking about tectonic plates: PANIK!",
            joke: "In Listening Section 4, read ahead during the 30-second silence to anticipate nouns and numbers."
        },
        {
            template: "leo",
            topic: "Over-Formal Speech",
            top: "Using 'Notwithstanding the aforementioned' in a casual conversation",
            bottom: "Cheers to Band 9 fluency",
            joke: "In Speaking Part 1, keep it natural and conversational! Save academic formal connectors for Writing Task 2."
        },
        {
            template: "cheems",
            topic: "Speaking Pressure",
            top: "English when typing online: Eloquent & profound",
            bottom: "English when IELTS examiner stares at me: me no speak good",
            joke: "Breathe, speak slowly, and use fillers like 'That is an intriguing question' to buy yourself thinking time."
        },
        {
            template: "facepalm",
            topic: "Tense Traps",
            top: "Examiner: How long have you lived in your hometown?",
            bottom: "Me: Yes, I am live here since 20 years ago",
            joke: "Use Present Perfect Continuous for actions starting in the past and continuing now: 'I have been living here for 20 years'."
        },
        {
            template: "ams",
            topic: "Speaking Part 1",
            top: "Examiner: What is your full name?",
            bottom: "Me: I completely agree with this statement",
            joke: "Listen carefully to the question type! Part 1 questions are personal and straightforward."
        },
        {
            template: "db",
            topic: "Grammar Traps",
            top: "Me trying to master past perfect",
            bottom: "Phrasal verbs with 14 different meanings",
            joke: "Phrasal verbs like 'turn down' (reject vs lower volume) are best learned through context and stories."
        },
        {
            template: "drake",
            topic: "Vocabulary Flex",
            top: "Using common everyday words",
            bottom: "Forcing Band 9 collocations into every single sentence",
            joke: "Natural, accurate vocabulary always scores higher than forced, unnatural academic jargon."
        },
        {
            template: "fry",
            topic: "Listening Comprehension",
            top: "Not sure if native speaker",
            bottom: "Or just speaking at 3x speed with heavy slang",
            joke: "Focus on stressed content words (nouns, verbs) rather than catching every single unstressed preposition."
        },
        {
            template: "rollsafe",
            topic: "Speaking Strategy",
            top: "Can't make grammar mistakes",
            bottom: "If you only speak in one-word answers",
            joke: "Short answers hurt your Fluency & Coherence score! Always use the Point + Reason + Example formula."
        },
        {
            template: "buzz",
            topic: "Linking Words",
            top: "Linking words",
            bottom: "Linking words everywhere",
            joke: "Overusing 'Moreover', 'Furthermore', and 'In addition' sounds robotic. Variety and logical flow matter most."
        },
        {
            template: "doge",
            topic: "Grammar Accuracy",
            top: "much grammar very band 9",
            bottom: "such inversion wow conditional",
            joke: "Rarely had such sophisticated inversion been seen! Inversion adds high grammatical range when used correctly."
        },
        {
            template: "disastergirl",
            topic: "Vocabulary Boost",
            top: "Me using 'plethora' correctly",
            bottom: "Examiner giving me a Band 8.5",
            joke: "A plethora of varied sentence structures combined with accurate grammar impresses any examiner."
        },
        {
            template: "spongebob",
            topic: "Speaking Part 1",
            top: "Examiner: Tell me about yourself",
            bottom: "Me: Since the dawn of civilization humans have existed",
            joke: "Avoid memorized generic introductions. Answer directly with genuine personal details and natural enthusiasm."
        },
        {
            template: "gru",
            topic: "Exam Panic",
            top: "Study 50 grammar rules",
            bottom: "Forget every single one when examiner says hello",
            joke: "Confidence comes from daily vocal practice. Warm up with your AI English Coach 10 minutes before studying!"
        },
        {
            template: "wonka",
            topic: "Learning Myths",
            top: "Please tell me more",
            bottom: "About how watching movies without subtitles made you fluent",
            joke: "Active speaking drills and shadow reading build fluency 5x faster than passive TV watching."
        },
        {
            template: "fine",
            topic: "Speaking Part 2",
            top: "Examiner: Describe a book that influenced you",
            bottom: "Me who has not read a book since 2018: This is fine",
            joke: "You can invent a story or talk about a movie as a book! IELTS tests English ability, not historical truth."
        }
    ];

    let currentMemeIndex = Math.floor(Math.random() * DASH_MEME_CATALOG.length);

    // Helper: Escape text for safe memegen URLs
    function sanitizeMemegen(str) {
        if (!str) return '_';
        return encodeURIComponent(
            str.replace(/_/g, '__')
               .replace(/-/g, '--')
               .replace(/\?/g, '~q')
               .replace(/&/g, '~a')
               .replace(/%/g, '~p')
               .replace(/#/g, '~h')
               .replace(/\//g, '~s')
               .replace(/"/g, "''")
               .replace(/\s+/g, '_')
        );
    }

    // Helper: Check if current user is logged in
    function isUserLoggedIn() {
        if (window.AIEC_Auth && typeof window.AIEC_Auth.isLoggedIn === 'function') {
            return window.AIEC_Auth.isLoggedIn();
        }
        try {
            const u = JSON.parse(localStorage.getItem('aiec_auth_user_v1') || 'null');
            return !!(u && u.isLoggedIn);
        } catch (e) {
            return false;
        }
    }

    // Helper: Retrieve active user data
    function getCurrentUser() {
        if (window.AIEC_Auth && typeof window.AIEC_Auth.getUser === 'function') {
            const u = window.AIEC_Auth.getUser();
            if (u && u.name) return u;
        }
        try {
            const saved = JSON.parse(localStorage.getItem('aiec_auth_user_v1') || 'null');
            if (saved && saved.name) return saved;
        } catch (e) {}
        return {
            id: 'guest',
            name: 'Learner',
            isLoggedIn: false,
            loggedAt: Date.now()
        };
    }

    // Helper: Navigate cleanly between pages
    function navigateTo(route) {
        if (window.AIEC_Router && typeof window.AIEC_Router.navigate === 'function') {
            window.AIEC_Router.navigate(route);
        } else if (window.switchAppPage) {
            const page = route.replace('/', '');
            window.switchAppPage(page === 'personalmentor' ? 'chat' : (page === 'goal' || page === 'speaking' ? 'test' : page));
        }
    }

    // Compute weekly calendar strip (Mon - Sun) with active, missed, today & upcoming days
    function computeWeeklyStreakStrip(scoring, user) {
        const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const now = new Date();
        // 0 = Monday, 6 = Sunday
        const currentDayIndex = (now.getDay() + 6) % 7;

        // Build active dates set from user scoring and local storage
        const activeDates = new Set();
        if (scoring && scoring.last_active_date) {
            activeDates.add(scoring.last_active_date.slice(0, 10));
        }
        try {
            const stored = JSON.parse(localStorage.getItem('aiec_active_dates') || '[]');
            if (Array.isArray(stored)) {
                stored.forEach(d => activeDates.add(d));
            }
        } catch (e) {}

        const todayStr = now.toISOString().slice(0, 10);
        // If user practiced today or has an active streak recorded today
        const hasStudiedToday = activeDates.has(todayStr) || (scoring && scoring.streak_days > 0);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - currentDayIndex + i);
            const dateStr = targetDate.toISOString().slice(0, 10);
            const isToday = i === currentDayIndex;
            const isPast = i < currentDayIndex;
            const isFuture = i > currentDayIndex;

            let cellClass = 'day-upcoming';
            let statusPill = '⚪ Later';

            if (isToday) {
                cellClass = hasStudiedToday ? 'day-completed day-today' : 'day-today';
                statusPill = hasStudiedToday ? '🔥 Done' : '⚡ Today';
            } else if (isPast) {
                // If date was marked active or within current streak range
                const daysAgo = currentDayIndex - i;
                const wasActiveInStreak = scoring && scoring.streak_days > daysAgo;
                const wasActiveDate = activeDates.has(dateStr);

                if (wasActiveInStreak || wasActiveDate) {
                    cellClass = 'day-completed';
                    statusPill = '🔥 Done';
                } else {
                    cellClass = 'day-missed';
                    statusPill = '⭕ Missed';
                }
            } else {
                cellClass = 'day-upcoming';
                statusPill = '⚪ Later';
            }

            weekDays.push({
                name: dayNames[i],
                dayNum: targetDate.getDate(),
                isToday,
                cellClass,
                statusPill
            });
        }

        return weekDays;
    }

    // Helper: Compute skill proficiency metrics dynamically based on real user actions
    function computeSkillProficiency(skillKey, scoring) {
        let count = 0;
        let accuracy = 0;
        let avgBand = 0;

        let localScores = null;
        try {
            const raw = localStorage.getItem('aiec-scores-v1');
            if (raw) localScores = JSON.parse(raw);
        } catch (e) {}

        if (skillKey === 'reading') {
            const vocTrack = scoring.track_mastery && scoring.track_mastery.vocabulary;
            let vCount = (vocTrack && vocTrack.count) || 0;
            let vAcc = (vocTrack && vocTrack.accuracy) || 0;

            if (localScores && localScores.vocabulary) {
                let lTotal = 0, lScore = 0, lCount = 0;
                Object.values(localScores.vocabulary).forEach(lvl => {
                    Object.values(lvl).forEach(item => {
                        lTotal += (item.total || 0);
                        lScore += (item.score || 0);
                        lCount++;
                    });
                });
                if (lCount > vCount) {
                    vCount = lCount;
                    vAcc = lTotal > 0 ? Math.round((lScore / lTotal) * 100) : 0;
                }
            }
            count = vCount;
            accuracy = vAcc;
        } else if (skillKey === 'writing') {
            const gramTrack = scoring.track_mastery && scoring.track_mastery.grammar;
            let gCount = (gramTrack && gramTrack.count) || 0;
            let gAcc = (gramTrack && gramTrack.accuracy) || 0;

            if (localScores) {
                let lTotal = 0, lScore = 0, lCount = 0;
                ['grammar', 'writing'].forEach(t => {
                    if (localScores[t]) {
                        Object.values(localScores[t]).forEach(lvl => {
                            Object.values(lvl).forEach(item => {
                                lTotal += (item.total || 0);
                                lScore += (item.score || 0);
                                lCount++;
                            });
                        });
                    }
                });
                if (lCount > gCount) {
                    gCount = lCount;
                    gAcc = lTotal > 0 ? Math.round((lScore / lTotal) * 100) : 0;
                }
            }
            count = gCount;
            accuracy = gAcc;
        } else if (skillKey === 'speaking') {
            const spkTrack = scoring.track_mastery && scoring.track_mastery.speaking;
            count = (spkTrack && spkTrack.count) || scoring.speaking_tests_taken || 0;
            avgBand = (spkTrack && spkTrack.avg_band) || 0;

            try {
                const rawSpk = localStorage.getItem('aiec_speaking_reports');
                if (rawSpk) {
                    const repList = JSON.parse(rawSpk);
                    if (Array.isArray(repList) && repList.length > 0) {
                        if (repList.length > count) count = repList.length;
                        const bands = repList.map(r => parseFloat(r.overall_band || 0)).filter(b => b > 0);
                        if (bands.length > 0) {
                            const sum = bands.reduce((a, b) => a + b, 0);
                            avgBand = Math.round((sum / bands.length) * 10) / 10;
                        }
                    }
                }
            } catch (e) {}

            if (avgBand > 0) {
                accuracy = Math.min(100, Math.round((avgBand / 9.0) * 100));
            }
        }

        const assessed = count > 0;
        let band = 'Baseline 5.5';
        let cefr = 'Starting Level: CEFR B1';

        if (skillKey === 'speaking') {
            if (assessed && avgBand > 0) {
                band = `Band ${avgBand.toFixed(1)}`;
                if (avgBand >= 8.0) cefr = 'Mastered Level: CEFR C1-C2';
                else if (avgBand >= 7.0) cefr = 'Mastered Level: CEFR B2-C1';
                else if (avgBand >= 6.0) cefr = 'Developing: CEFR B2';
                else cefr = 'Baseline: CEFR B1';
            }
        } else {
            if (assessed && accuracy > 0) {
                if (accuracy >= 90) {
                    band = `Band 8.0 (${accuracy}%)`;
                    cefr = 'Mastered Level: CEFR C1';
                } else if (accuracy >= 80) {
                    band = `Band 7.5 (${accuracy}%)`;
                    cefr = 'Mastered Level: CEFR B2+';
                } else if (accuracy >= 70) {
                    band = `Band 7.0 (${accuracy}%)`;
                    cefr = 'Mastered Level: CEFR B2';
                } else if (accuracy >= 60) {
                    band = `Band 6.5 (${accuracy}%)`;
                    cefr = 'Developing: CEFR B1+';
                } else {
                    band = `Band 6.0 (${accuracy}%)`;
                    cefr = 'Developing: CEFR B1';
                }
            }
        }

        return { count, accuracy, avgBand, band, cefr, assessed };
    }

    // Main Dashboard Render Function
    function renderDashboard() {
        const root = document.getElementById('dashboardRoot');
        if (!root) return;

        const user = getCurrentUser();
        const loggedIn = isUserLoggedIn();

        // 1. Determine time-based greetings
        const currentHour = new Date().getHours();
        let greetingPrefix = "Good morning";
        if (currentHour >= 12 && currentHour < 17) {
            greetingPrefix = "Good afternoon";
        } else if (currentHour >= 17) {
            greetingPrefix = "Good evening";
        }

        // 2. Load scoring profile from DB or cache
        const currentUid = user.id || 'guest';
        let scoring = {
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
            level_progress: { level: 1, progress_percentage: 0, remaining_xp_to_next: 100 }
        };

        try {
            const cachedScoring = localStorage.getItem(`aiec_scoring_${currentUid}`);
            if (cachedScoring) {
                scoring = Object.assign(scoring, JSON.parse(cachedScoring));
            }
        } catch (e) {}

        // 3. User Diagnostic & New User Possibilities Check
        const hasDiagnosticFlag = !!localStorage.getItem(`aiec_diagnostic_done_${currentUid}`);
        const isNewUser = (!hasDiagnosticFlag && scoring.quizzes_taken === 0 && scoring.speaking_tests_taken === 0);
        const isTodayFirstDay = isNewUser || (scoring.streak_days <= 1 && scoring.total_xp === 0);

        // Personalized Greeting Header
        let greetingTitle = `${greetingPrefix}, ${user.name}! 👋`;
        if (isTodayFirstDay) {
            greetingTitle = `Welcome to Day 1, ${user.name}! 🎉`;
        }

        // Target Band from goals
        let targetBand = '7.5';
        try {
            const savedGoal = localStorage.getItem('aiec_user_goal');
            if (savedGoal) {
                const parsed = JSON.parse(savedGoal);
                if (parsed.target_band) targetBand = parsed.target_band;
            }
        } catch (e) {}

        // Weekly Streak Strip
        const weekDays = computeWeeklyStreakStrip(scoring, user);

        // Dynamic Skill Proficiency Calculations (Reading, Writing, Speaking)
        const readingProf = computeSkillProficiency('reading', scoring);
        const writingProf = computeSkillProficiency('writing', scoring);
        const speakingProf = computeSkillProficiency('speaking', scoring);

        // Fast Phrases Game persistent records
        let gameBestScore = 0;
        let gameTotalAnswered = 0;
        try {
            const rawGame = localStorage.getItem('fastphrases_save_v4');
            if (rawGame) {
                const gameData = JSON.parse(rawGame);
                gameBestScore = gameData.bestScore || 0;
                gameTotalAnswered = gameData.totalAnswered || 0;
            }
        } catch (e) {}

        // Current Random Meme Data
        const currentMeme = DASH_MEME_CATALOG[currentMemeIndex] || DASH_MEME_CATALOG[0];
        const topEnc = sanitizeMemegen(currentMeme.top);
        const botEnc = sanitizeMemegen(currentMeme.bottom);
        const memeImgUrl = `https://api.memegen.link/images/${currentMeme.template}/${topEnc}/${botEnc}.png`;

        root.innerHTML = `
            <div class="dashboard-container">
                <!-- 0. GUEST DEMO NOTICE (Only if not logged into Google) -->
                ${!loggedIn ? `
                    <div class="dash-guest-notice">
                        <div class="dash-guest-notice-content">
                            <span class="dash-guest-notice-icon">✨</span>
                            <div class="dash-guest-notice-text">
                                <strong>Guest Mode Active:</strong> Sign in with Google to sync your study streaks, IELTS mock tests, and AI mentor history across all devices.
                            </div>
                        </div>
                        <button class="dash-guest-notice-btn" id="dashNoticeSignInBtn">
                            <span>🔑 Sign In with Google</span>
                        </button>
                    </div>
                ` : ''}

                <!-- ============================================================== -->
                <!-- [1] USER NAME WITH GREETINGS & PROFILE CAPSULE                  -->
                <!-- ============================================================== -->
                <div class="dash-profile-bar">
                    <div class="dash-profile-info">
                        <div class="dash-avatar-circle" title="Student Profile">
                            ${user.photoURL ? `<img src="${user.photoURL}" alt="User Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : `<span>🧑‍🎓</span>`}
                            <span class="dash-avatar-level-badge">LVL ${scoring.current_level}</span>
                        </div>
                        <div class="dash-user-names">
                            <h2>${greetingTitle}</h2>
                            <div class="dash-user-subtitle">
                                <span>IELTS Academic Prep</span>
                                <span class="dash-band-tag">Target Band ${targetBand} 🎯</span>
                                <span style="color: #CBD5E1;">•</span>
                                <span style="color: ${loggedIn ? '#16A34A' : '#3B82F6'}; font-weight: 700;">
                                    ${loggedIn ? '🟢 Google Synced' : '⚡ Local Session'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="dash-profile-actions">
                        <div class="dash-streak-pill" title="${scoring.streak_boost_label}">
                            <span class="dash-flame">🔥</span>
                            <span>${scoring.streak_days} Day${scoring.streak_days === 1 ? '' : 's'} Streak</span>
                        </div>
                        <div class="dash-xp-pill" title="Experience Points">
                            <span>⭐</span>
                            <span>${(scoring.total_xp || 0).toLocaleString()} XP</span>
                        </div>
                        <div class="dash-xp-pill" style="background: rgba(99, 102, 241, 0.12); color: #4338CA;" title="${scoring.current_league} League Tier">
                            <span>${(scoring.league_details && scoring.league_details.badge) || '🥉'}</span>
                            <span>${scoring.current_league}</span>
                        </div>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- [2] ENGLISH PROFICIENCY SCORE: READING, WRITING, SPEAKING      -->
                <!-- ============================================================== -->
                <div class="dash-clean-section-header">
                    <h3 class="dash-clean-section-title">
                        <span>📊</span>
                        <span>English Proficiency Assessment</span>
                    </h3>
                    <span class="dash-clean-section-sub">
                        ${isNewUser ? 'Initial Diagnostic Benchmark' : 'Comprehensive Skill Breakdown'}
                    </span>
                </div>

                ${isNewUser ? `
                    <!-- New Learner / First Day Welcome Callout -->
                    <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 20px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                        <div style="display: flex; align-items: center; gap: 12px; max-width: 700px;">
                            <span style="font-size: 28px;">🌱</span>
                            <div>
                                <strong style="color: #1E3A8A; font-size: 14.5px;">Welcome to your first day! Baseline Ready (CEFR B1 / Band 5.5)</strong>
                                <p style="margin: 3px 0 0 0; color: #3B82F6; font-size: 13px; font-weight: 600;">
                                    Complete your first 5-minute diagnostic test below to calculate your real AI band scores across Reading, Writing, and Speaking!
                                </p>
                            </div>
                        </div>
                        <button class="dash-speaking-btn" id="dashTakeDiagnosticBtn" style="background: #2563EB; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                            <span>Take Diagnostic Test 🚀</span>
                        </button>
                    </div>
                ` : ''}

                <div class="dash-prof-grid">
                    <!-- 1. Reading Proficiency Card -->
                    <div class="dash-prof-card prof-reading ${!readingProf.assessed ? 'is-new-user' : ''}">
                        <div>
                            <div class="dash-prof-header">
                                <div class="dash-prof-icon-wrap icon-blue-bg">📖</div>
                                <span class="dash-prof-band-badge ${!readingProf.assessed ? 'badge-amber' : 'badge-blue'}">
                                    ${readingProf.band}
                                </span>
                            </div>
                            <h4 class="dash-prof-name">Reading & Lexis</h4>
                            <div class="dash-prof-level-tag">
                                ${readingProf.cefr}
                            </div>

                            <div class="dash-prof-bar-track">
                                <div class="dash-prof-bar-fill ${!readingProf.assessed ? 'fill-dashed' : 'fill-blue'}" style="width: ${!readingProf.assessed ? '55%' : `${readingProf.accuracy}%`};"></div>
                            </div>

                            ${!readingProf.assessed ? `
                                <div class="dash-new-user-note">
                                    Awaiting your first reading quiz to compute precise academic lexical resource.
                                </div>
                            ` : `
                                <div class="dash-prof-metrics">
                                    <div class="dash-prof-metric-row">
                                        <span>Vocabulary Accuracy</span>
                                        <strong>${readingProf.accuracy}%</strong>
                                    </div>
                                    <div class="dash-prof-metric-row">
                                        <span>Quizzes Completed</span>
                                        <strong>${readingProf.count} finished</strong>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 2. Writing Proficiency Card -->
                    <div class="dash-prof-card prof-writing ${!writingProf.assessed ? 'is-new-user' : ''}">
                        <div>
                            <div class="dash-prof-header">
                                <div class="dash-prof-icon-wrap icon-purple-bg">✍️</div>
                                <span class="dash-prof-band-badge ${!writingProf.assessed ? 'badge-amber' : 'badge-purple'}">
                                    ${writingProf.band}
                                </span>
                            </div>
                            <h4 class="dash-prof-name">Writing & Grammar</h4>
                            <div class="dash-prof-level-tag">
                                ${writingProf.cefr}
                            </div>

                            <div class="dash-prof-bar-track">
                                <div class="dash-prof-bar-fill ${!writingProf.assessed ? 'fill-dashed' : 'fill-purple'}" style="width: ${!writingProf.assessed ? '55%' : `${writingProf.accuracy}%`};"></div>
                            </div>

                            ${!writingProf.assessed ? `
                                <div class="dash-new-user-note">
                                    Awaiting your first grammar drill to measure sentence cohesion and grammatical range.
                                </div>
                            ` : `
                                <div class="dash-prof-metrics">
                                    <div class="dash-prof-metric-row">
                                        <span>Grammar Accuracy</span>
                                        <strong>${writingProf.accuracy}%</strong>
                                    </div>
                                    <div class="dash-prof-metric-row">
                                        <span>Drills Completed</span>
                                        <strong>${writingProf.count} finished</strong>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 3. Speaking Proficiency Card -->
                    <div class="dash-prof-card prof-speaking ${!speakingProf.assessed ? 'is-new-user' : ''}">
                        <div>
                            <div class="dash-prof-header">
                                <div class="dash-prof-icon-wrap icon-green-bg">🎙️</div>
                                <span class="dash-prof-band-badge ${!speakingProf.assessed ? 'badge-amber' : 'badge-green'}">
                                    ${speakingProf.band}
                                </span>
                            </div>
                            <h4 class="dash-prof-name">Speaking & Fluency</h4>
                            <div class="dash-prof-level-tag">
                                ${speakingProf.cefr}
                            </div>

                            <div class="dash-prof-bar-track">
                                <div class="dash-prof-bar-fill ${!speakingProf.assessed ? 'fill-dashed' : 'fill-green'}" style="width: ${!speakingProf.assessed ? '55%' : `${speakingProf.accuracy}%`};"></div>
                            </div>

                            ${!speakingProf.assessed ? `
                                <div class="dash-new-user-note">
                                    Awaiting your first audio recording to analyze speech fluency, pause rate, and phonetics.
                                </div>
                            ` : `
                                <div class="dash-prof-metrics">
                                    <div class="dash-prof-metric-row">
                                        <span>Interviews Completed</span>
                                        <strong>${speakingProf.count} recorded</strong>
                                    </div>
                                    <div class="dash-prof-metric-row">
                                        <span>Average Band</span>
                                        <strong>Band ${speakingProf.avgBand.toFixed(1)} / 9.0</strong>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- [3] SPEAKING TEST SECTION BANNER                               -->
                <!-- ============================================================== -->
                <div class="dash-speaking-cta-card">
                    <div class="dash-speaking-cta-left">
                        <div class="dash-speaking-cta-mic-badge">🎙️</div>
                        <div class="dash-speaking-cta-content">
                            <h3>Speaking Test Arena: 11 Official IELTS Topics</h3>
                            <p>
                                Practice authentic IELTS Part 1, 2, and 3 interviews under live exam conditions. Get real-time audio transcription, IELTS band ratings, and native speech corrections!
                            </p>
                            <div class="dash-speaking-tags">
                                <span class="dash-speaking-pill">🎯 11 Curated Topics</span>
                                <span class="dash-speaking-pill">⚡ Instant AI Band Score</span>
                                <span class="dash-speaking-pill">🔊 Pronunciation Feedback</span>
                            </div>
                        </div>
                    </div>
                    <button class="dash-speaking-btn" id="dashStartSpeakingTestBtn">
                        <span>Start Speaking Test 🎙️</span>
                    </button>
                </div>

                <!-- ============================================================== -->
                <!-- [4] CURRENT STREAKS: WEEKLY STRIP (MARKING ACTIVE & MISSED)    -->
                <!-- ============================================================== -->
                <div class="dash-week-card">
                    <div class="dash-week-header">
                        <div class="dash-week-header-left">
                            <span class="dash-week-flame-icon">🔥</span>
                            <div>
                                <h3>Weekly Practice Habit Tracker</h3>
                                <p>
                                    ${scoring.streak_days > 1 ? `${scoring.streak_days} days consecutive streak! Study 5 minutes today to protect your flame.` : 'Start your daily English habit today to unlock streak multipliers.'}
                                </p>
                            </div>
                        </div>
                        <div class="dash-streak-pill" style="margin: 0;">
                            <span>⚡ ${scoring.streak_boost_label}</span>
                        </div>
                    </div>

                    <div class="dash-week-grid">
                        ${weekDays.map(d => `
                            <div class="dash-week-day-cell ${d.cellClass}">
                                <span class="dash-week-day-name">${d.name}</span>
                                <span class="dash-week-day-num">${d.dayNum}</span>
                                <span class="dash-week-status-pill">${d.statusPill}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- [5] GAME SCORES & OTHER SCORES                                 -->
                <!-- ============================================================== -->
                <div class="dash-clean-section-header">
                    <h3 class="dash-clean-section-title">
                        <span>🎮</span>
                        <span>Game Scores & Progress Stats</span>
                    </h3>
                    <span class="dash-clean-section-sub">Speed Drills & Experience</span>
                </div>

                <div class="dash-scores-clean-grid">
                    <!-- 1. Fast Phrases Speed Game Card -->
                    <div class="dash-score-clean-card">
                        <div>
                            <div class="dash-score-clean-top">
                                <div class="dash-score-clean-icon" style="background: #FEF3C7;">⚡</div>
                                <span class="dash-prof-band-badge badge-amber">Speed Drill</span>
                            </div>
                            <h4>Fast Phrases Game</h4>
                            <p>Assemble grammatically flawless sentences under time pressure.</p>
                            <div class="dash-score-clean-num-big">
                                ${gameBestScore > 0 ? gameBestScore.toLocaleString() : '0'} <small>pts best</small>
                            </div>
                            <div class="dash-score-clean-subtags">
                                <span>⏱️ ${gameBestScore > 0 ? `Total Solved: <strong>${gameTotalAnswered} phrases</strong>` : 'Status: <strong>Ready to Play</strong>'}</span>
                                <span>🔥 Multiplier: <strong>${scoring.streak_boost_label}</strong></span>
                            </div>
                        </div>
                        <a href="/game/" target="_blank" class="dash-game-play-btn" id="dashFastPhrasesBtn">
                            <span>Play Fast Phrases 🎮</span>
                        </a>
                    </div>

                    <!-- 2. Total XP & Level Card -->
                    <div class="dash-score-clean-card">
                        <div>
                            <div class="dash-score-clean-top">
                                <div class="dash-score-clean-icon" style="background: #F0FDF4;">⭐</div>
                                <span class="dash-prof-band-badge badge-green">${scoring.current_league} League</span>
                            </div>
                            <h4>Practice Experience</h4>
                            <p>Level progression based on overall practice accuracy.</p>
                            <div class="dash-score-clean-num-big">
                                ${(scoring.total_xp || 0).toLocaleString()} <small>lifetime XP</small>
                            </div>
                            <div class="dash-score-clean-subtags">
                                <span>🏆 Current Tier: <strong>Level ${scoring.current_level} Learner</strong></span>
                                <span>🚀 Next Level: <strong>${scoring.level_progress.remaining_xp_to_next} XP needed</strong></span>
                            </div>
                        </div>
                        <div class="dash-prof-bar-track" style="margin-top: 14px;">
                            <div class="dash-prof-bar-fill fill-green" style="width: ${scoring.level_progress.progress_percentage}%;"></div>
                        </div>
                    </div>

                    <!-- 3. Overall Accuracy & Quizzes -->
                    <div class="dash-score-clean-card">
                        <div>
                            <div class="dash-score-clean-top">
                                <div class="dash-score-clean-icon" style="background: #EFF6FF;">🎯</div>
                                <span class="dash-prof-band-badge badge-blue">Quizzes</span>
                            </div>
                            <h4>Drill Accuracy Rate</h4>
                            <p>Percentage of correct answers across all completed curriculum quizzes.</p>
                            <div class="dash-score-clean-num-big">
                                ${scoring.accuracy_rate > 0 ? `${scoring.accuracy_rate}%` : 'New'} <small>accuracy</small>
                            </div>
                            <div class="dash-score-clean-subtags">
                                <span>📝 Quizzes Taken: <strong>${scoring.quizzes_taken || 0} Finished</strong></span>
                                <span>🌟 Perfect Scores: <strong>${scoring.perfect_scores_count} Perfect</strong></span>
                            </div>
                        </div>
                        <div class="dash-prof-bar-track" style="margin-top: 14px;">
                            <div class="dash-prof-bar-fill fill-blue" style="width: ${scoring.accuracy_rate > 0 ? `${scoring.accuracy_rate}%` : '50%'};"></div>
                        </div>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- [6] RANDOM STUDY BREAK MEME WITH HINT                          -->
                <!-- ============================================================== -->
                <div class="dash-meme-clean-card">
                    <div class="dash-meme-clean-header">
                        <div class="dash-meme-clean-title">
                            <span>🎭</span>
                            <span>Daily IELTS Study Break Meme</span>
                            <span class="dash-prof-band-badge badge-amber" style="margin-left: 6px;">🔥 ${currentMeme.topic}</span>
                        </div>
                        <div class="dash-meme-clean-actions">
                            <button type="button" class="dash-meme-shuffle-btn" id="dashShuffleMemeBtn" title="Shuffle a new meme">
                                <span>🎲 Shuffle Meme</span>
                            </button>
                            <a href="${memeImgUrl}" target="_blank" rel="noopener noreferrer" class="dash-meme-shuffle-btn" style="text-decoration: none;" title="Open image in full size">
                                <span>↗ Full Size</span>
                            </a>
                        </div>
                    </div>

                    <div class="dash-meme-img-container">
                        <img src="${memeImgUrl}" alt="IELTS Study Break Meme" id="dashMemeImg" onerror="this.onerror=null; this.src='https://api.memegen.link/images/drake/Studying_Grammar/Making_Memes.png';">
                    </div>

                    <div class="dash-meme-hint-box">
                        <div class="dash-meme-hint-header">
                            <span>💡</span>
                            <span>IELTS Coach Hint & Tip</span>
                        </div>
                        <p class="dash-meme-hint-text" id="dashMemeHintText">"${currentMeme.joke}"</p>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- [7] BANNER: CHAT WITH AI PERSONAL MENTOR                       -->
                <!-- ============================================================== -->
                <div class="dash-chat-clean-card">
                    <div class="dash-chat-clean-left">
                        <div class="dash-chat-clean-avatar">🌿</div>
                        <div class="dash-chat-clean-text">
                            <h4>Chat with your AI Personal Mentor</h4>
                            <p>
                                Have a question about third conditionals, formal essay vocabulary, or want a 2-minute speaking conversation? Your AI IELTS Coach is online 24/7 with instant grammar feedback!
                            </p>
                        </div>
                    </div>
                    <button class="dash-chat-clean-btn" id="dashOpenChatMentorBtn">
                        <span>Chat with AI Coach 💬</span>
                    </button>
                </div>
            </div>
        `;

        // Bind interactive event handlers
        bindDashboardEvents();

        // Render Lucide icons if available
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Attach all clean dashboard event listeners
    function bindDashboardEvents() {
        // Sign-in prompt
        const signInBtn = document.getElementById('dashNoticeSignInBtn');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => {
                if (window.AIEC_Auth && typeof window.AIEC_Auth.openModal === 'function') {
                    window.AIEC_Auth.openModal();
                } else {
                    const authHeaderBtn = document.getElementById('userAuthBtn');
                    if (authHeaderBtn) authHeaderBtn.click();
                }
            });
        }

        // Diagnostic Test button (for new users)
        const diagnosticBtn = document.getElementById('dashTakeDiagnosticBtn');
        if (diagnosticBtn) {
            diagnosticBtn.addEventListener('click', () => {
                navigateTo('/practice');
            });
        }

        // Speaking Test Banner button
        const speakingBtn = document.getElementById('dashStartSpeakingTestBtn');
        if (speakingBtn) {
            speakingBtn.addEventListener('click', () => {
                navigateTo('/goal');
            });
        }

        // AI Mentor Chat Banner button
        const chatBtn = document.getElementById('dashOpenChatMentorBtn');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                navigateTo('/personalmentor');
            });
        }

        // Fast Phrases Game button
        const fastPhrasesBtn = document.getElementById('dashFastPhrasesBtn');
        if (fastPhrasesBtn) {
            fastPhrasesBtn.addEventListener('click', (e) => {
                if (typeof window.openFastPhrasesGame === 'function') {
                    e.preventDefault();
                    window.openFastPhrasesGame();
                }
            });
        }

        // Shuffle Meme button
        const shuffleBtn = document.getElementById('dashShuffleMemeBtn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                let nextIdx = Math.floor(Math.random() * DASH_MEME_CATALOG.length);
                if (nextIdx === currentMemeIndex) {
                    nextIdx = (currentMemeIndex + 1) % DASH_MEME_CATALOG.length;
                }
                currentMemeIndex = nextIdx;
                const meme = DASH_MEME_CATALOG[currentMemeIndex];
                const top = sanitizeMemegen(meme.top);
                const bot = sanitizeMemegen(meme.bottom);
                const url = `https://api.memegen.link/images/${meme.template}/${top}/${bot}.png`;

                const imgEl = document.getElementById('dashMemeImg');
                const hintEl = document.getElementById('dashMemeHintText');
                if (imgEl) imgEl.src = url;
                if (hintEl) hintEl.textContent = `"${meme.joke}"`;
            });
        }
    }

    // Expose global render function
    window.renderDashboard = renderDashboard;

    // Auto-update dashboard on relevant global events
    window.addEventListener('aiec-auth-changed', () => {
        const pageDashboard = document.getElementById('pageDashboard');
        if (pageDashboard && pageDashboard.classList.contains('active')) {
            renderDashboard();
        }
    });

    window.addEventListener('aiec-scoring-updated', () => {
        const pageDashboard = document.getElementById('pageDashboard');
        if (pageDashboard && pageDashboard.classList.contains('active')) {
            renderDashboard();
        }
    });

    window.addEventListener('aiec:scoring-updated', () => {
        const pageDashboard = document.getElementById('pageDashboard');
        if (pageDashboard && pageDashboard.classList.contains('active')) {
            renderDashboard();
        }
    });

    window.addEventListener('aiec-goal-updated', () => {
        const pageDashboard = document.getElementById('pageDashboard');
        if (pageDashboard && pageDashboard.classList.contains('active')) {
            renderDashboard();
        }
    });

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderDashboard);
    } else {
        renderDashboard();
    }
})();
