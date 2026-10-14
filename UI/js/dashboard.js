/**
 * ==========================================================================
 * DASHBOARD CONTROLLER (dashboard.js)
 * Implements the gamified educational dashboard inspired by user reference:
 * - Rounded capsule aesthetic (border-radius: 22px-30px)
 * - Profile bar with avatar, learner info, streak flame & XP counters
 * - Featured progress hero card with slider track and pulsing play button
 * - 3-pillar capsule stat counters: Total Activities, Completed, Pending
 * - Interactive CEFR English Levels Track (A1, A2, B1, B1+, B2, C1, C2)
 * - Bento-style feature cards with rich visual meters:
 *     1. English Practice Score (Circular SVG gauge ring + bar meters)
 *     2. Current Vocabulary Problems (Interactive flashcards with instant AI Mentor review)
 *     3. Speaking Arena Readiness (IELTS 4-criteria official band meters)
 *     4. Fast Phrases Sentence Builder (Interactive teaser mini-puzzle & game launcher)
 * - Learning Leaderboard Podium (1st, 2nd, 3rd places with avatars & XP)
 * - 7-Day study milestone banner with streak dots
 * - Strictly isolated to #pageDashboard so other pages (Practice, Chat, Test)
 *   remain clean and unaffected.
 * - Works gracefully in both Guest Mode (interactive demo) and Member Mode (persisted).
 * ==========================================================================
 */

(function () {
    'use strict';

    // CEFR Levels Data with IELTS equivalence & skill tags
    const CEFR_LEVELS = [
        {
            id: 'a1',
            code: 'A1',
            label: 'A1 Beginner',
            ielts: 'IELTS 2.0 - 3.0',
            status: 'mastered',
            desc: 'Can understand basic everyday phrases, self-introductions, and familiar everyday questions.',
            progress: '8/8 Completed',
            tags: ['Basic Pronouns', 'Present Simple', 'Everyday Vocab']
        },
        {
            id: 'a2',
            code: 'A2',
            label: 'A2 Elementary',
            ielts: 'IELTS 3.5 - 4.0',
            status: 'mastered',
            desc: 'Can communicate during routine tasks and describe background, immediate surroundings, and needs.',
            progress: '10/10 Completed',
            tags: ['Past Simple', 'Comparative Adjectives', 'Routine Descriptions']
        },
        {
            id: 'b1',
            code: 'B1',
            label: 'B1 Intermediate',
            ielts: 'IELTS 4.5 - 5.0',
            status: 'mastered',
            desc: 'Can understand main points of standard speech, express hopes, plans, and narrate events clearly.',
            progress: '12/12 Completed',
            tags: ['Conditionals 1 & 2', 'Future Intentions', 'Short Narratives']
        },
        {
            id: 'b1_plus',
            code: 'B1+',
            label: 'B1+ Threshold',
            ielts: 'IELTS 5.0 - 5.5',
            status: 'mastered',
            desc: 'Can express spontaneous opinions, explain reasoning, and maintain a conversation on familiar topics.',
            progress: '8/8 Completed',
            tags: ['Present Perfect Continuous', 'Connecting Phrases', 'Opinion Coherence']
        },
        {
            id: 'b2',
            code: 'B2',
            label: 'B2 Vantage',
            ielts: 'IELTS 5.5 - 6.5',
            status: 'active',
            desc: 'Can interact fluently with native speakers and understand complex ideas in academic and professional contexts.',
            progress: '8/14 In Progress',
            tags: ['Complex Conditionals', 'Academic Collocations', 'Argumentative Coherence', 'Fluency Under Stress']
        },
        {
            id: 'c1',
            code: 'C1',
            label: 'C1 Advanced',
            ielts: 'IELTS 7.0 - 8.0',
            status: 'upcoming',
            desc: 'Can express ideas fluently, spontaneously, and flexibly for demanding academic and professional essays/speaking.',
            progress: '0/16 Available',
            tags: ['Inversion & Cleft Sentences', 'Nuanced Idiomatic Lexicon', 'Task 2 Task Response', 'Abstract Hypotheses']
        },
        {
            id: 'c2',
            code: 'C2',
            label: 'C2 Mastery',
            ielts: 'IELTS 8.5 - 9.0',
            status: 'upcoming',
            desc: 'Native-like precision; can summarize information from different sources and reconstruct arguments seamlessly.',
            progress: '0/12 Available',
            tags: ['Subtle Connotations', 'Speed Coherence', 'Stylistic Versatility', 'Native Phrasing']
        }
    ];

    // Current Vocabulary Problems flagged from recent practice
    const VOCAB_PROBLEMS = [
        {
            word: 'Ubiquitous',
            type: 'Academic Adj.',
            severity: '🚨 High Priority',
            issue: 'Often confused with "omniscient". Means present everywhere.',
            collocation: '“Smartphones are now ubiquitous in modern education.”',
            prompt: 'Can you teach me how to use the word "Ubiquitous" correctly in an IELTS Academic Task 2 essay? Please give 2 Band 8 example sentences and common collocations.'
        },
        {
            word: 'In spite of',
            type: 'Prepositional',
            severity: '⚠️ Grammar Slip',
            issue: 'Followed by a noun or gerund, NOT a full subject+verb clause.',
            collocation: '“In spite of the adverse climate, agriculture flourished.”',
            prompt: 'Can you explain the exact grammar rules for "In spite of" vs "Although" and provide 3 IELTS Speaking Part 3 sample answers?'
        },
        {
            word: 'Substantial',
            type: 'Task 1 Lexicon',
            severity: '💡 Band 8 Collocation',
            issue: 'Underused synonym for "large/significant" when describing chart trends.',
            collocation: '“A substantial increase in renewable energy consumption.”',
            prompt: 'How can I use "Substantial" and "Substantially" when analyzing IELTS Academic Task 1 data trends?'
        },
        {
            word: 'Albeit',
            type: 'Conjunction',
            severity: '✨ Formal Connector',
            issue: 'Conjunction placement & comma syntax ("albeit small, it was impactful").',
            collocation: '“Progress was attained, albeit at significant financial expense.”',
            prompt: 'What are the rules and punctuation for using "albeit" in high-scoring IELTS Writing Task 2 essays?'
        }
    ];

    let selectedLevelId = 'b2';
    let teaserGameState = {
        answered: false,
        selectedOption: null,
        isCorrect: false
    };

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

    // Helper: Safely navigate to route
    function navigateTo(route) {
        if (window.AIEC_Router && typeof window.AIEC_Router.navigate === 'function') {
            window.AIEC_Router.navigate(route);
        } else if (window.switchAppPage) {
            const page = route.replace('/', '');
            window.switchAppPage(page === 'personalmentor' ? 'chat' : (page === 'goal' ? 'test' : page));
        }
    }

    // Helper: Open personal mentor chat with a preloaded prompt
    function askMentorAboutWord(promptText) {
        navigateTo('/personalmentor');
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendBtn');
            if (chatInput && sendBtn) {
                chatInput.value = promptText;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                sendBtn.click();
            }
        }, 220);
    }

    function renderDashboard() {
        const root = document.getElementById('dashboardRoot');
        if (!root) return;

        const loggedIn = isUserLoggedIn();

        let targetBand = '7.5';
        let userName = loggedIn ? 'Alex Morgan' : 'Alex Morgan';
        let userRole = loggedIn ? 'Active Candidate' : 'Guest Explorer';

        try {
            if (window.AIEC_Auth && typeof window.AIEC_Auth.getUser === 'function') {
                const u = window.AIEC_Auth.getUser();
                if (u && u.name) userName = u.name;
            } else {
                const savedUser = JSON.parse(localStorage.getItem('aiec_auth_user_v1') || 'null');
                if (savedUser && savedUser.name) userName = savedUser.name;
            }
            const savedGoal = localStorage.getItem('aiec_user_goal');
            if (savedGoal) {
                const parsed = JSON.parse(savedGoal);
                if (parsed.target_band) targetBand = parsed.target_band;
            }
        } catch (e) {}

        const activeLevel = CEFR_LEVELS.find(l => l.id === selectedLevelId) || CEFR_LEVELS[4];

        root.innerHTML = `
            <!-- SVG Gradient Definitions for Circular Gauge -->
            <svg style="width:0;height:0;position:absolute;" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2563EB" />
                        <stop offset="50%" stop-color="#3B82F6" />
                        <stop offset="100%" stop-color="#10B981" />
                    </linearGradient>
                </defs>
            </svg>

            <div class="dashboard-container">
                <!-- 0. GUEST DEMO MODE BANNER (Shown if not logged in) -->
                ${!loggedIn ? `
                    <div class="dash-guest-notice">
                        <div class="dash-guest-notice-content">
                            <span class="dash-guest-notice-icon">✨</span>
                            <div class="dash-guest-notice-text">
                                <strong>Exploring in Demo Mode:</strong> Track your CEFR levels (A1 to C2), practice accuracy, and vocabulary. Sign in free to save your streak and mock scores across devices!
                            </div>
                        </div>
                        <button class="dash-guest-notice-btn" id="dashNoticeSignInBtn">
                            <span>🔑 Sign In / Sign Up</span>
                        </button>
                    </div>
                ` : ''}

                <!-- 1. TOP PROFILE & GREETING BAR -->
                <div class="dash-profile-bar">
                    <div class="dash-profile-info">
                        <div class="dash-avatar-circle" title="Student Profile">
                            <span>🧑‍🎓</span>
                            <span class="dash-avatar-level-badge">LVL 12</span>
                        </div>
                        <div class="dash-user-names">
                            <h2>${userName}</h2>
                            <div class="dash-user-subtitle">
                                <span>IELTS Academic Track</span>
                                <span class="dash-band-tag">Target Band ${targetBand} 🎯</span>
                                <span style="color: #94A3B8;">•</span>
                                <span style="color: ${loggedIn ? '#16A34A' : '#3B82F6'}; font-weight: 700;">
                                    ${loggedIn ? '🟢 Cloud Synced' : '⚡ Local Session'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="dash-profile-actions">
                        <div class="dash-streak-pill" title="4-Day Study Streak">
                            <span class="dash-flame">🔥</span>
                            <span>4 Days Streak</span>
                        </div>
                        <div class="dash-xp-pill" title="Experience Points">
                            <span>⭐</span>
                            <span>1,680 XP</span>
                        </div>
                        <button class="dash-icon-btn" id="dashTimerBtn" title="Study Time: 28h Total">
                            <i data-lucide="clock"></i>
                        </button>
                        <button class="dash-icon-btn" id="dashBellBtn" title="3 New Coach Recommendations">
                            <i data-lucide="bell"></i>
                            <span class="dash-icon-badge"></span>
                        </button>
                    </div>
                </div>

                <!-- 2. FEATURED PROGRESS HERO CARD -->
                <div class="dash-hero-card">
                    <div class="dash-hero-content">
                        <div class="dash-hero-badge-tag">
                            <span>⚡ WEEKLY SPRINT</span>
                        </div>
                        <h3>5 Activities Completed This Week</h3>
                        <div class="dash-hero-sub">Speaking Fluency & Lexical Precision · Level ${activeLevel.code} Vantage</div>
                        <div class="dash-progress-wrap">
                            <div class="dash-progress-track">
                                <div class="dash-progress-fill" style="width: 72%;"></div>
                            </div>
                            <button class="dash-hero-play-btn" id="dashHeroPlayBtn" title="Resume Daily Sprint">
                                <i data-lucide="play" style="width: 22px; height: 22px; margin-left: 3px;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="dash-hero-badge-right">
                        <div class="dash-hero-avatar-anim">🎧</div>
                        <div class="dash-hero-badge-title">Band ${targetBand} Target</div>
                        <div class="dash-hero-badge-sub">On Track · 72% Pacing</div>
                    </div>
                </div>

                <!-- 3. MY LEARNING PLAN (3 Stat Pillars from Reference) -->
                <div class="dash-section-header">
                    <h3 class="dash-section-title">
                        <span>📋</span>
                        <span>My Learning Plan</span>
                    </h3>
                    <span class="dash-section-sub">Personalized IELTS syllabus</span>
                </div>

                <div class="dash-pillars-grid">
                    <!-- Pillar 1: Mint Green -->
                    <div class="dash-stat-capsule capsule-green" data-action="navigate" data-route="/practice" title="View all practice activities">
                        <div class="dash-capsule-icon">
                            <i data-lucide="graduation-cap"></i>
                        </div>
                        <div class="dash-capsule-number">48</div>
                        <div class="dash-capsule-label">Total Activities</div>
                        <span class="dash-capsule-pill-tag">100% Assigned</span>
                    </div>

                    <!-- Pillar 2: Warm Peach -->
                    <div class="dash-stat-capsule capsule-peach" data-action="navigate" data-route="/practice" title="View completed modules">
                        <div class="dash-capsule-icon">
                            <i data-lucide="check-circle-2"></i>
                        </div>
                        <div class="dash-capsule-number">32</div>
                        <div class="dash-capsule-label">Completed</div>
                        <span class="dash-capsule-pill-tag">67% Mastered</span>
                    </div>

                    <!-- Pillar 3: Sky Blue -->
                    <div class="dash-stat-capsule capsule-blue" data-action="navigate" data-route="/practice" title="View pending reviews">
                        <div class="dash-capsule-icon">
                            <i data-lucide="clock-3"></i>
                        </div>
                        <div class="dash-capsule-number">16</div>
                        <div class="dash-capsule-label">Pending Review</div>
                        <span class="dash-capsule-pill-tag">33% Up Next</span>
                    </div>
                </div>

                <!-- 4. CEFR ENGLISH LEVELS TRACK (Horizontal Pill Chips) -->
                <div class="dash-section-header">
                    <h3 class="dash-section-title">
                        <span>🎓</span>
                        <span>CEFR English Levels</span>
                    </h3>
                    <span class="dash-section-sub">A1 to C2 Framework</span>
                </div>

                <div class="dash-levels-bar" id="dashLevelsBar">
                    ${CEFR_LEVELS.map(level => {
                        const isSelected = level.id === selectedLevelId;
                        const stateClass = level.status === 'mastered' ? 'mastered' : (isSelected ? 'active' : '');
                        return `
                            <button class="dash-level-pill ${stateClass}" data-level-id="${level.id}">
                                <span class="dash-level-dot"></span>
                                <span>${level.label}</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <!-- Dynamic Level Detail Banner -->
                <div class="dash-level-banner" id="dashLevelBanner">
                    <div class="dash-level-banner-left">
                        <div class="dash-level-banner-badge">
                            ${activeLevel.ielts}
                        </div>
                        <div class="dash-level-banner-desc">
                            <div>
                                <strong>${activeLevel.label}:</strong>
                                <span>${activeLevel.desc}</span>
                                <span style="font-weight: 800; color: #2563EB; margin-left: 6px;">(${activeLevel.progress})</span>
                            </div>
                            <div class="dash-level-banner-tags">
                                ${activeLevel.tags.map(t => `<span class="dash-level-tag tag-blue">${t}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                    <button class="dash-level-banner-btn" id="dashLevelPracticeBtn">
                        Practice ${activeLevel.code} Modules →
                    </button>
                </div>

                <!-- 5. BENTO FEATURE CARDS GRID (Score, Vocab Problems, Speaking, Fast Phrases) -->
                <div class="dash-bento-grid">
                    <!-- CARD 1: English Practice Score (With SVG Gauge & Breakdown) -->
                    <div class="dash-bento-card">
                        <div>
                            <div class="dash-card-top">
                                <div class="dash-card-icon-circle icon-blue-soft">
                                    <i data-lucide="bar-chart-3"></i>
                                </div>
                                <span class="dash-card-fraction-pill fraction-blue">88% / 100</span>
                            </div>
                            <div class="dash-card-body" style="margin-top: 14px;">
                                <h4>English Practice Score</h4>
                                <p>Comprehensive assessment across Grammar, Vocabulary, Reading and Sentence Speed.</p>
                                
                                <div class="dash-score-visual-row">
                                    <div class="dash-score-gauge-wrap">
                                        <svg class="dash-gauge-svg" viewBox="0 0 84 84">
                                            <circle class="dash-gauge-bg" cx="42" cy="42" r="35" />
                                            <circle class="dash-gauge-fill" cx="42" cy="42" r="35" />
                                        </svg>
                                        <div class="dash-gauge-inner-text">
                                            <strong>88%</strong>
                                            <span>High</span>
                                        </div>
                                    </div>
                                    <div class="dash-score-bars-wrap">
                                        <div class="dash-score-bar-item">
                                            <div class="dash-score-bar-labels">
                                                <span>Grammar Accuracy</span>
                                                <strong>92%</strong>
                                            </div>
                                            <div class="dash-score-bar-track">
                                                <div class="dash-score-bar-fill bar-green" style="width: 92%;"></div>
                                            </div>
                                        </div>
                                        <div class="dash-score-bar-item">
                                            <div class="dash-score-bar-labels">
                                                <span>Lexical Sophistication</span>
                                                <strong>84%</strong>
                                            </div>
                                            <div class="dash-score-bar-track">
                                                <div class="dash-score-bar-fill bar-amber" style="width: 84%;"></div>
                                            </div>
                                        </div>
                                        <div class="dash-score-bar-item">
                                            <div class="dash-score-bar-labels">
                                                <span>Sentence Speed</span>
                                                <strong>88%</strong>
                                            </div>
                                            <div class="dash-score-bar-track">
                                                <div class="dash-score-bar-fill bar-purple" style="width: 88%;"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dash-card-footer">
                            <div class="dash-author-meta">
                                <div class="dash-author-avatar">🤖</div>
                                <span>AI Coach Verified</span>
                            </div>
                            <button class="dash-card-cta-btn" data-action="navigate" data-route="/practice">
                                <span>Practice Arena</span>
                                <i data-lucide="arrow-right" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>

                    <!-- CARD 2: Current Vocabulary Problems (Interactive Flashcards) -->
                    <div class="dash-bento-card">
                        <div>
                            <div class="dash-card-top">
                                <div class="dash-card-icon-circle icon-orange-soft">
                                    <i data-lucide="alert-triangle"></i>
                                </div>
                                <span class="dash-card-fraction-pill fraction-orange">4 Flagged</span>
                            </div>
                            <div class="dash-card-body" style="margin-top: 14px;">
                                <h4>Vocabulary Problem Focus</h4>
                                <p>Words flagged for revision with one-click Personal Mentor guidance:</p>
                                
                                <div class="dash-vocab-problem-list">
                                    ${VOCAB_PROBLEMS.map(item => `
                                        <div class="dash-vocab-card-interactive">
                                            <div style="flex: 1;">
                                                <div class="dash-vocab-word-title">
                                                    <span>${item.word}</span>
                                                    <span class="dash-vocab-type-badge">${item.type}</span>
                                                </div>
                                                <div class="dash-vocab-issue-text">${item.issue}</div>
                                            </div>
                                            <button class="dash-vocab-ask-btn" data-prompt="${encodeURIComponent(item.prompt)}" title="Ask Coach in Chat">
                                                <span>Ask Coach</span>
                                                <span>💬</span>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="dash-card-footer">
                            <div class="dash-author-meta">
                                <div class="dash-author-avatar">💬</div>
                                <span>Personal Mentor</span>
                            </div>
                            <button class="dash-card-cta-btn" data-action="navigate" data-route="/personalmentor">
                                <span>Open Mentor</span>
                                <i data-lucide="arrow-right" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>

                    <!-- CARD 3: Speaking Arena Readiness (IELTS 4-Criteria Meters) -->
                    <div class="dash-bento-card">
                        <div>
                            <div class="dash-card-top">
                                <div class="dash-card-icon-circle icon-green-soft">
                                    <i data-lucide="mic"></i>
                                </div>
                                <span class="dash-card-fraction-pill fraction-green">Band 7.0 Est.</span>
                            </div>
                            <div class="dash-card-body" style="margin-top: 14px;">
                                <h4>Speaking Arena Readiness</h4>
                                <p>Live assessment against official IELTS criteria from recorded audio tests:</p>
                                
                                <div class="dash-speaking-criteria-grid">
                                    <div class="dash-criteria-item">
                                        <div class="dash-criteria-top">
                                            <span>Fluency & Coherence</span>
                                            <strong class="dash-criteria-band">7.0</strong>
                                        </div>
                                        <div class="dash-criteria-meter">
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg"></div>
                                            <div class="dash-meter-seg"></div>
                                        </div>
                                    </div>
                                    <div class="dash-criteria-item">
                                        <div class="dash-criteria-top">
                                            <span>Lexical Resource</span>
                                            <strong class="dash-criteria-band">7.5</strong>
                                        </div>
                                        <div class="dash-criteria-meter">
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg"></div>
                                        </div>
                                    </div>
                                    <div class="dash-criteria-item">
                                        <div class="dash-criteria-top">
                                            <span>Grammatical Range</span>
                                            <strong class="dash-criteria-band">6.5</strong>
                                        </div>
                                        <div class="dash-criteria-meter">
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg"></div>
                                            <div class="dash-meter-seg"></div>
                                            <div class="dash-meter-seg"></div>
                                        </div>
                                    </div>
                                    <div class="dash-criteria-item">
                                        <div class="dash-criteria-top">
                                            <span>Pronunciation</span>
                                            <strong class="dash-criteria-band">7.0</strong>
                                        </div>
                                        <div class="dash-criteria-meter">
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg filled"></div>
                                            <div class="dash-meter-seg"></div>
                                            <div class="dash-meter-seg"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dash-card-footer">
                            <div class="dash-author-meta">
                                <div class="dash-author-avatar">🎙️</div>
                                <span>Based on 6 audio samples</span>
                            </div>
                            <button class="dash-card-cta-btn" data-action="navigate" data-route="/goal">
                                <span>Speaking Arena</span>
                                <i data-lucide="arrow-right" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>

                    <!-- CARD 4: Explore Section - Fast Phrases Interactive Teaser -->
                    <div class="dash-bento-card">
                        <div>
                            <div class="dash-card-top">
                                <div class="dash-card-icon-circle icon-yellow-soft">
                                    <i data-lucide="zap"></i>
                                </div>
                                <span class="dash-card-fraction-pill fraction-orange">Level 3 / 10</span>
                            </div>
                            <div class="dash-card-body" style="margin-top: 14px;">
                                <h4>Fast Phrases Speed Game</h4>
                                <p>Assemble grammatically flawless sentences from 5 tricky options under time pressure!</p>
                                
                                <div class="dash-game-teaser-box">
                                    <div class="dash-game-target-sentence">
                                        "The committee decided to ________ the conference."
                                    </div>
                                    <div class="dash-game-chips-row" id="dashTeaserChips">
                                        <button class="dash-game-preview-chip" data-choice="postpone" style="${teaserGameState.selectedOption === 'postpone' ? 'background: #10B981; color: #FFFFFF; border-color: #10B981;' : ''}">postpone ✓</button>
                                        <button class="dash-game-preview-chip" data-choice="postponing" style="${teaserGameState.selectedOption === 'postponing' ? 'background: #EF4444; color: #FFFFFF; border-color: #EF4444;' : ''}">postponing</button>
                                        <button class="dash-game-preview-chip" data-choice="postponed" style="${teaserGameState.selectedOption === 'postponed' ? 'background: #EF4444; color: #FFFFFF; border-color: #EF4444;' : ''}">postponed</button>
                                        <button class="dash-game-preview-chip" data-choice="delay of" style="${teaserGameState.selectedOption === 'delay of' ? 'background: #EF4444; color: #FFFFFF; border-color: #EF4444;' : ''}">delay of</button>
                                        <button class="dash-game-preview-chip" data-choice="cancelation" style="${teaserGameState.selectedOption === 'cancelation' ? 'background: #EF4444; color: #FFFFFF; border-color: #EF4444;' : ''}">cancelation</button>
                                    </div>
                                    <div class="dash-game-stats-mini">
                                        <span>Best Time: <strong>14.2s</strong></span>
                                        <span>Streak: <strong>x3 Multiplier 🔥</strong></span>
                                        <span>Score: <strong>1,680 pts</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dash-card-footer">
                            <div class="dash-author-meta">
                                <div class="dash-author-avatar">🎮</div>
                                <span>Speed Puzzle</span>
                            </div>
                            <button class="dash-card-cta-btn" id="dashPlayFastPhrasesBtn" style="color: #D97706; border-color: #FCD34D;">
                                <span>Play Full Game</span>
                                <i data-lucide="play" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 6. LEARNING LEADERBOARD PODIUM (Directly from User Reference Screen #3) -->
                <div class="dash-leaderboard-card">
                    <div class="dash-leaderboard-header">
                        <div class="dash-leaderboard-title-group">
                            <h3>
                                <span>Learning Leaderboard</span>
                                <span>🏆</span>
                            </h3>
                            <p>See who is learning the most this week and celebrate top scorers!</p>
                        </div>
                        <div class="dash-leaderboard-top-stats">
                            <div class="dash-top-stat-pill">
                                <strong>28h 35m</strong>
                                <span>Total Study Time</span>
                            </div>
                            <div class="dash-top-stat-pill">
                                <strong>10 / 10</strong>
                                <span>Lessons Finished</span>
                            </div>
                            <div class="dash-top-stat-pill">
                                <strong>165,420</strong>
                                <span>Top Score XP</span>
                            </div>
                        </div>
                    </div>

                    <!-- 3D Visual Podium -->
                    <div class="dash-podium-wrap">
                        <!-- Spot 2: Silver -->
                        <div class="dash-podium-spot spot-silver">
                            <div class="dash-podium-avatar">
                                <span>👦</span>
                                <span class="dash-podium-rank-tag">#2</span>
                            </div>
                            <div class="dash-podium-name">Noah Bennett</div>
                            <div class="dash-podium-score">142,800 XP</div>
                            <div class="dash-podium-bar">2</div>
                        </div>

                        <!-- Spot 1: Gold (Center) -->
                        <div class="dash-podium-spot spot-gold">
                            <div class="dash-podium-avatar">
                                <span>🧑‍🎓</span>
                                <span class="dash-podium-rank-tag">#1</span>
                            </div>
                            <div class="dash-podium-name">Oliver James</div>
                            <div class="dash-podium-score">165,420 XP</div>
                            <div class="dash-podium-bar">1</div>
                        </div>

                        <!-- Spot 3: Bronze -->
                        <div class="dash-podium-spot spot-bronze">
                            <div class="dash-podium-avatar">
                                <span>👧</span>
                                <span class="dash-podium-rank-tag">#3</span>
                            </div>
                            <div class="dash-podium-name">Emma Collins</div>
                            <div class="dash-podium-score">128,450 XP</div>
                            <div class="dash-podium-bar">3</div>
                        </div>
                    </div>

                    <!-- Current User's Ranking Bar -->
                    <div class="dash-user-rank-strip">
                        <div class="dash-user-rank-left">
                            <span class="dash-user-rank-number">#4</span>
                            <span>${userName} (You) · Level B2 Vantage</span>
                        </div>
                        <div class="dash-user-rank-right">
                            <span>118,600 XP</span>
                            <span>•</span>
                            <span>Top 5% of Learners 🚀</span>
                        </div>
                    </div>
                </div>

                <!-- 7. BOTTOM 7-DAY MILESTONE BANNER (From Reference Screen) -->
                <div class="dash-milestone-banner">
                    <div class="dash-milestone-left">
                        <div class="dash-milestone-trophy">🏆</div>
                        <div class="dash-milestone-text">
                            <h4>Keep 7 days milestone</h4>
                            <p>Practice daily to unlock full-length IELTS simulation mock tests!</p>
                        </div>
                    </div>
                    <div class="dash-milestone-days" title="Weekly study streak">
                        <div class="dash-day-dot completed" title="Monday: Completed">✓</div>
                        <div class="dash-day-dot completed" title="Tuesday: Completed">✓</div>
                        <div class="dash-day-dot completed" title="Wednesday: Completed">✓</div>
                        <div class="dash-day-dot completed" title="Thursday: Completed">✓</div>
                        <div class="dash-day-dot today" title="Friday: Active Today!">T</div>
                        <div class="dash-day-dot locked" title="Saturday: Upcoming">S</div>
                        <div class="dash-day-dot locked" title="Sunday: Upcoming (Reward Day 🎁)">🎁</div>
                    </div>
                </div>
            </div>
        `;

        // Wire Event Listeners
        // 1. Navigation buttons
        root.querySelectorAll('[data-action="navigate"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const route = btn.dataset.route;
                if (route) navigateTo(route);
            });
        });

        // 2. Sign In Notice button
        const noticeSignInBtn = document.getElementById('dashNoticeSignInBtn');
        if (noticeSignInBtn) {
            noticeSignInBtn.addEventListener('click', () => {
                if (window.AIEC_Auth && typeof window.AIEC_Auth.showAuthModal === 'function') {
                    window.AIEC_Auth.showAuthModal();
                } else {
                    const userAuthBtn = document.getElementById('userAuthBtn');
                    if (userAuthBtn) userAuthBtn.click();
                }
            });
        }

        // 3. Featured Hero Play button
        const heroPlayBtn = document.getElementById('dashHeroPlayBtn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                navigateTo('/practice');
            });
        }

        // 4. CEFR Level pills interactive selection
        root.querySelectorAll('.dash-level-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                selectedLevelId = pill.dataset.levelId;
                renderDashboard();
            });
        });

        // 5. Level Banner Practice button
        const levelPracticeBtn = document.getElementById('dashLevelPracticeBtn');
        if (levelPracticeBtn) {
            levelPracticeBtn.addEventListener('click', () => {
                navigateTo('/practice');
            });
        }

        // 6. Vocabulary Ask Coach buttons
        root.querySelectorAll('.dash-vocab-ask-btn').forEach(actionBtn => {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const encodedPrompt = actionBtn.dataset.prompt;
                if (encodedPrompt) {
                    const prompt = decodeURIComponent(encodedPrompt);
                    askMentorAboutWord(prompt);
                }
            });
        });

        // 7. Interactive Teaser Chips in Fast Phrases Card
        root.querySelectorAll('.dash-game-preview-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const choice = chip.dataset.choice;
                teaserGameState.selectedOption = choice;
                teaserGameState.isCorrect = (choice === 'postpone');
                renderDashboard();
            });
        });

        // 8. Fast Phrases launch button
        const fastPhrasesBtn = document.getElementById('dashPlayFastPhrasesBtn');
        if (fastPhrasesBtn) {
            fastPhrasesBtn.addEventListener('click', () => {
                const gameBtn = document.getElementById('gameLaunchBtn');
                if (gameBtn) {
                    gameBtn.click();
                } else {
                    window.open('/game/', '_blank');
                }
            });
        }

        // 9. Lucide icons initialization
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Expose globally
    window.renderDashboard = renderDashboard;

    // Listen to Auth State Changes so Dashboard dynamically updates on login / logout
    window.addEventListener('aiec-auth-changed', () => {
        const pageDashboard = document.getElementById('pageDashboard');
        if (pageDashboard && pageDashboard.classList.contains('active')) {
            renderDashboard();
        }
    });

    // Auto-render on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderDashboard);
    } else {
        renderDashboard();
    }
})();
