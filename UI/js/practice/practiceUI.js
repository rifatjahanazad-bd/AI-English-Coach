/**
 * ==========================================================================
 * PRACTICE UI CONTROLLER (practiceUI.js)
 * Coordinates the Practice Arena interface:
 * - 4 Category Cards selection (Grammar, Vocabulary, Listening, Writing)
 * - Step 1 -> Step 2 transitions & back navigation
 * - Subtopic module selection & exercise view
 * - Real-time word counter & AI feedback orchestration
 * ==========================================================================
 */

function initPractice() {
    // Registry of the 4 specialized practice modules
    const modules = {
        grammar: window.grammarPracticeModule,
        vocabulary: window.vocabularyPracticeModule,
        listening: window.listeningPracticeModule,
        writing: window.writingPracticeModule
    };

    // Fallback to practiceData if modules haven't loaded yet
    function getModule(catKey) {
        if (modules[catKey]) return modules[catKey];
        if (window.practiceData && window.practiceData[catKey]) return window.practiceData[catKey];
        return window.grammarPracticeModule || (window.practiceData ? window.practiceData.grammar : null);
    }

    let selectedCategory = 'grammar';
    let selectedSubtopicIndex = 0;

    const categoryCards = document.querySelectorAll('.practice-category-card');
    const practiceNextBtn = document.getElementById('practiceNextBtn');
    const practiceStep1 = document.getElementById('practiceStep1');
    const practiceStep2 = document.getElementById('practiceStep2');
    const practiceBackBtn = document.getElementById('practiceBackBtn');
    const practiceSubtopicsList = document.getElementById('practiceSubtopicsList');
    const currentTopicChip = document.getElementById('currentTopicChip');
    const currentQuestionNum = document.getElementById('currentQuestionNum');
    const practiceQuestionText = document.getElementById('practiceQuestionText');
    const practiceQuestionHint = document.getElementById('practiceQuestionHint');
    const practiceSelectedCategoryPill = document.getElementById('practiceSelectedCategoryPill');
    const answerText = document.getElementById('answerText');
    const wordCountSpan = document.getElementById('wordCount');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const feedbackPanel = document.getElementById('feedbackPanel');
    // Grammar CEFR levels view (grammar-only; other tracks ignore these)
    const grammarLevelsCard = document.getElementById('grammarLevelsCard');
    const grammarLevelsGrid = document.getElementById('grammarLevelsGrid');
    const practiceSubtopicsCard = document.getElementById('practiceSubtopicsCard');
    // Module view for selected level (rendered by modulepractice.js)
    const modulePracticeCard = document.getElementById('modulePracticeCard');
    const modulePracticeView = document.getElementById('modulePracticeView');
    let selectedGrammarLevel = null;

    // Helper: update Next button text
    function updateNextButtonLabel() {
        if (!practiceNextBtn) return;
        const mod = getModule(selectedCategory);
        if (mod) {
            practiceNextBtn.innerHTML = `Start ${mod.title} (${mod.emoji}) →`;
        }
    }

    // 1. Category Selection Handler
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const isAlreadySelected = card.classList.contains('selected');
            categoryCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCategory = card.dataset.category || 'grammar';
            updateNextButtonLabel();

            // Direct entry on click/double-click if already selected
            if (isAlreadySelected) {
                goToStep2();
            }
        });
    });

    // 2. Next Button -> Transition to Step 2
    function goToStep2(skipNavigate = false) {
        loadCategoryExercise(selectedCategory);
        if (practiceStep1) practiceStep1.classList.add('hidden');
        if (practiceStep2) practiceStep2.classList.remove('hidden');
        if (!skipNavigate && window.AIEC_Router) {
            window.AIEC_Router.navigate('/practice/' + selectedCategory);
        }
        if (practiceStep2) practiceStep2.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (practiceNextBtn) {
        practiceNextBtn.addEventListener('click', () => goToStep2());
        updateNextButtonLabel();
    }

    // 3. Back Button -> Return to 4 Big Thumb Options
    if (practiceBackBtn) {
        practiceBackBtn.addEventListener('click', () => {
            if (practiceStep2) practiceStep2.classList.add('hidden');
            if (practiceStep1) {
                practiceStep1.classList.remove('hidden');
                practiceStep1.scrollTop = 0;
            }
            if (feedbackPanel) feedbackPanel.classList.add('hidden');
            selectedGrammarLevel = null;
            if (modulePracticeCard) modulePracticeCard.classList.add('hidden');
            if (modulePracticeView) modulePracticeView.innerHTML = '';
            if (window.AIEC_Router) {
                window.AIEC_Router.navigate('/practice');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Grammar levels mode toggle (grammar-only; no-ops for other tracks)
    function setGrammarMode(on) {
        if (grammarLevelsCard) grammarLevelsCard.classList.toggle('hidden', !on);
        if (practiceSubtopicsCard) practiceSubtopicsCard.classList.toggle('hidden', on);
        const questionCard = document.querySelector('#practiceStep2 .question-card');
        const textareaWrap = answerText ? answerText.closest('.textarea-wrapper') : null;
        const linkWrap = document.querySelector('#practiceStep2 .link-input');
        // In levels mode the question card becomes the level detail panel (shown on select);
        // writing exercise controls stay hidden until module pages land.
        if (questionCard) questionCard.classList.toggle('hidden', on && !selectedGrammarLevel);
        if (textareaWrap) textareaWrap.style.display = on ? 'none' : '';
        if (linkWrap) linkWrap.style.display = on ? 'none' : '';
        if (submitAnswerBtn) submitAnswerBtn.style.display = on ? 'none' : '';
        // Module view only shows after a grammar level is selected
        if (modulePracticeCard) modulePracticeCard.classList.toggle('hidden', !on || !selectedGrammarLevel);
    }

    // 4. Load Subtopics & Initial Exercise
    function loadCategoryExercise(catKey) {
        const mod = getModule(catKey);
        if (!mod) return;
        selectedSubtopicIndex = 0;

        // Track hook for CSS (mirrors UI/css/practice.css sections 1-4). Additive only.
        if (practiceStep2) practiceStep2.dataset.activeTrack = (mod.id || catKey);

        if (practiceSelectedCategoryPill) {
            practiceSelectedCategoryPill.textContent = `${mod.emoji} ${mod.title}`;
        }

        // Grammar track shows CEFR level cards (A1-C2) instead of generic subtopics.
        if ((mod.id || catKey) === 'grammar' && Array.isArray(mod.levels)) {
            selectedGrammarLevel = null;
            setGrammarMode(true);
            renderGrammarLevels(mod);
            if (feedbackPanel) feedbackPanel.classList.add('hidden');
            return;
        }
        setGrammarMode(false);

        renderSubtopics(mod);
        renderExercise(mod, 0);
    }

    // Grammar CEFR levels grid (cards with thumbnail + description + game teaser).
    // Module/topic/game screens land next — selecting a level shows its detail panel.
    function renderGrammarLevels(mod) {
        if (!grammarLevelsGrid) return;
        grammarLevelsGrid.innerHTML = '';
        const sections = window.grammarSections || {};
        const game = window.grammarGame || { type: 'quiz' };

        mod.levels.forEach((lv) => {
            const sec = sections[lv.level] || {};
            const status = sec.status || lv.status || 'ready';
            if (window.PracticeCards && typeof window.PracticeCards.createGrammarLevelCard === 'function') {
                // Card view lives in js/practice/components/cards.js
                grammarLevelsGrid.appendChild(window.PracticeCards.createGrammarLevelCard({
                    lv, sec, game,
                    onSelect: () => selectGrammarLevel(mod, lv, sec)
                }));
                return;
            }
            const desc = sec.desc || lv.desc || '';
            const count = (sec.count != null ? sec.count : lv.count) || 0;
            const soon = status === 'soon';
            const themeClass = (window.PracticeCards && window.PracticeCards.getThemeClass) ? window.PracticeCards.getThemeClass(lv.level) : 'card-theme-' + String(lv.level).toLowerCase().replace('+', 'plus');
            const svgArt = (window.PracticeCards && window.PracticeCards.getLevelSvg) ? window.PracticeCards.getLevelSvg(lv.level) : `<span class="grammar-level-emoji">${escapeHtml(sec.emoji || lv.emoji || '📐')}</span>`;
            const card = document.createElement('button');
            card.className = 'grammar-level-card ' + themeClass + (soon ? ' is-soon' : '');
            card.dataset.level = lv.level;
            card.disabled = !!soon;
            card.innerHTML = `
                <div class="grammar-level-thumb">
                    <div class="thumb-art-container">${svgArt}</div>
                    <div class="thumb-pill-banner">
                        <span class="thumb-pill-code">${escapeHtml(lv.level)}</span>
                        <span class="thumb-pill-title">${escapeHtml(sec.title || lv.title || '')}</span>
                    </div>
                </div>
                <div class="grammar-card-body">
                    <h4>${escapeHtml(lv.level)} · ${escapeHtml(sec.title || lv.title || '')}</h4>
                    <p class="caption">${escapeHtml(desc)}</p>
                    <div class="grammar-level-meta">
                        <span class="grammar-level-count${soon ? ' soon' : ''}">${soon ? 'Coming soon' : count + ' topics'}</span>
                        <span class="grammar-level-game-tag">🎮 ${escapeHtml(game.type || 'quiz')}</span>
                    </div>
                </div>
            `;
            if (!soon) {
                card.addEventListener('click', () => selectGrammarLevel(mod, lv, sec));
            }
            grammarLevelsGrid.appendChild(card);
        });
    }

    function selectGrammarLevel(mod, lv, sec, options = {}) {
        selectedGrammarLevel = lv.level;
        document.querySelectorAll('.grammar-level-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.level === lv.level);
        });
        if (practiceSelectedCategoryPill) {
            practiceSelectedCategoryPill.textContent = `${mod.emoji} Grammar · ${lv.level}`;
        }
        if (!options.skipNavigate && window.AIEC_Router) {
            const trackKey = (mod.id || selectedCategory || 'grammar').toLowerCase();
            window.AIEC_Router.navigate(`/practice/${trackKey}/${lv.level.toLowerCase()}`);
        }
        // Level detail panel (module pages with topics/games land next step).
        const count = (sec.count != null ? sec.count : lv.count) || 0;
        const game = window.grammarGame || { type: 'quiz' };
        if (currentTopicChip) currentTopicChip.textContent = `📌 Grammar · ${lv.level} ${sec.title || lv.title || ''}`;
        if (currentQuestionNum) currentQuestionNum.textContent = `${count} topics · 🎮 ${game.type || 'quiz'} game`;
        if (practiceQuestionText) practiceQuestionText.textContent = `${sec.emoji || lv.emoji || '📐'} ${lv.level} — ${sec.title || lv.title || ''}`;
        if (practiceQuestionHint) practiceQuestionHint.innerHTML = `💡 ${escapeHtml(sec.desc || lv.desc || '')}<br>Modules, topics & game land on the module pages (next step).`;
        const questionCard = document.querySelector('#practiceStep2 .question-card');
        if (feedbackPanel) feedbackPanel.classList.add('hidden');
        // Drill in: hide levels grid + detail panel, show this level's modules.
        if (grammarLevelsCard) grammarLevelsCard.classList.add('hidden');
        if (questionCard) questionCard.classList.add('hidden');
        // Module look for this level (markup lives in modulepractice.js)
        if (window.ModulePractice && typeof window.ModulePractice.renderLevelModules === 'function') {
            const items = sec.items || lv.items || [];
            const showModules = () => window.ModulePractice.renderLevelModules(modulePracticeView, {
                track: 'grammar',
                level: lv.level,
                title: sec.title || lv.title || '',
                desc: sec.desc || lv.desc || '',
                emoji: sec.emoji || lv.emoji || '📐',
                count: (sec.count != null ? sec.count : lv.count) || 0,
                status: sec.status || lv.status || 'ready',
                items,
                initialClassId: options.initialClassId,
                game: window.grammarGame || { type: 'quiz' },
                onBackLevels: () => backToGrammarLevels(),
                onSelectModule: (item, idx) => {
                    // 2-pane layout keeps module list and topic learning together seamlessly
                },
                onSubmitAnswer: (item, text) => {
                    if (!text) return;
                    // Reuse the shared AI feedback builder for the active track
                    buildFeedbackContent(selectedCategory, 0, text);
                    if (feedbackPanel) {
                        feedbackPanel.classList.remove('hidden');
                        feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                },
                onPlayGame: () => {
                    if (typeof window.openFastPhrasesGame === 'function') {
                        window.openFastPhrasesGame();
                    } else {
                        window.open('/game/', '_blank');
                    }
                }
            });
            showModules();
            if (modulePracticeCard) modulePracticeCard.classList.remove('hidden');
            if (modulePracticeCard) modulePracticeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Back from modules list to the levels grid
    function backToGrammarLevels() {
        selectedGrammarLevel = null;
        if (modulePracticeCard) modulePracticeCard.classList.add('hidden');
        if (modulePracticeView) modulePracticeView.innerHTML = '';
        if (grammarLevelsCard) grammarLevelsCard.classList.remove('hidden');
        const mod = getModule('grammar');
        if (practiceSelectedCategoryPill && mod) {
            practiceSelectedCategoryPill.textContent = `${mod.emoji} ${mod.title}`;
        }
        if (window.AIEC_Router) {
            window.AIEC_Router.navigate('/practice/' + selectedCategory);
        }
        if (grammarLevelsCard) grammarLevelsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Expose route openers for router.js integration
    window.openTrackFromRoute = function(trackName) {
        const catKey = (trackName || 'grammar').toLowerCase();
        selectedCategory = catKey;
        categoryCards.forEach(c => c.classList.toggle('selected', (c.dataset.category || '').toLowerCase() === catKey));
        goToStep2(true);
    };

    window.openLevelFromRoute = function(trackName, levelCode) {
        window.openTrackFromRoute(trackName);
        const mod = getModule(trackName);
        if (mod && Array.isArray(mod.levels)) {
            const normLevel = (levelCode || '').toUpperCase().replace('PLUS', '+');
            const targetLv = mod.levels.find(l => l.level.toUpperCase() === normLevel || l.level.toUpperCase().replace('+', 'PLUS') === normLevel);
            if (targetLv) {
                const sec = (window.grammarSections && window.grammarSections[targetLv.level]) || {};
                selectGrammarLevel(mod, targetLv, sec, { skipNavigate: true });
            }
        }
    };

    window.openClassFromRoute = async function(trackName, levelCode, classId) {
        window.openLevelFromRoute(trackName, levelCode);
        const normClass = (classId || '').toLowerCase();

        // 1. Try immediate select if level controller is mounted
        if (window.AIEC_ActiveLevelController && typeof window.AIEC_ActiveLevelController.selectClassById === 'function') {
            const ok = window.AIEC_ActiveLevelController.selectClassById(normClass);
            if (ok) return;
        }

        // 2. Fetch via path parameter API endpoint to ensure class data is populated
        if (window.AIEC_API && typeof window.AIEC_API.fetchModuleClass === 'function') {
            try {
                const res = await window.AIEC_API.fetchModuleClass(trackName, levelCode, classId);
                if (res && res.class && window.AIEC_ActiveLevelController) {
                    window.AIEC_ActiveLevelController.selectClassById(res.class.id || normClass);
                }
            } catch (err) {
                console.warn('[Router] Error loading class via API path parameter:', err);
            }
        }
    };

    // Single module page under level/topic/ — back returns to this level's modules
    function showModuleSingle(mod, lv, sec, item, idx, items, showModules) {
        if (!window.ModulePractice || typeof window.ModulePractice.renderModuleSingle !== 'function') return;
        window.ModulePractice.renderModuleSingle(modulePracticeView, {
            track: 'grammar',
            level: lv.level,
            item,
            idx,
            total: items.length,
            emoji: sec.emoji || lv.emoji || '📐',
            game: window.grammarGame || { type: 'quiz' },
            onBackModules: () => showModules(),
            onToggleComplete: () => showModules()
        });
    }

    function renderSubtopics(mod) {
        if (!practiceSubtopicsList) return;
        practiceSubtopicsList.innerHTML = '';

        mod.subtopics.forEach((sub, idx) => {
            // Card view lives in js/practice/components/cards.js (fallback below)
            if (window.PracticeCards && typeof window.PracticeCards.createSubtopicButton === 'function') {
                const btn = window.PracticeCards.createSubtopicButton({
                    sub,
                    trackId: (mod.id || 'grammar'),
                    selected: idx === selectedSubtopicIndex,
                    onSelect: () => {
                        document.querySelectorAll('.subtopic-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedSubtopicIndex = idx;
                        renderExercise(mod, idx);
                    }
                });
                practiceSubtopicsList.appendChild(btn);
                return;
            }
            const btn = document.createElement('button');
            // Track hook class mirrors UI/css/practice.css sections 1-4. Additive only.
            btn.className = 'subtopic-btn track-' + (mod.id || 'grammar') + (idx === selectedSubtopicIndex ? ' selected' : '');
            btn.innerHTML = `
                <span class="title">${escapeHtml(sub.title)}</span>
                <span class="desc">${escapeHtml(sub.desc)}</span>
            `;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.subtopic-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSubtopicIndex = idx;
                renderExercise(mod, idx);
            });
            practiceSubtopicsList.appendChild(btn);
        });
    }

    function renderExercise(mod, subIdx) {
        const sub = mod.subtopics[subIdx];
        if (!sub) return;

        if (currentTopicChip) currentTopicChip.textContent = `📌 ${mod.title}`;
        if (currentQuestionNum) currentQuestionNum.textContent = `Exercise ${subIdx + 1} of ${mod.subtopics.length}`;
        if (practiceQuestionText) practiceQuestionText.textContent = sub.question;
        if (practiceQuestionHint) practiceQuestionHint.innerHTML = `💡 <strong>Hint:</strong> ${escapeHtml(sub.hint)}`;

        if (answerText) {
            answerText.value = '';
            if (wordCountSpan) wordCountSpan.textContent = '0';
        }
        if (feedbackPanel) feedbackPanel.classList.add('hidden');
    }

    // Real-Time Word Count Tracker
    if (answerText && wordCountSpan) {
        answerText.addEventListener('input', () => {
            const words = answerText.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            wordCountSpan.textContent = words;
        });
    }

    // Get AI Feedback Trigger
    if (submitAnswerBtn && feedbackPanel) {
        submitAnswerBtn.addEventListener('click', () => {
            const textValue = answerText ? answerText.value.trim() : '';
            if (!textValue) {
                alert('Please type a response first before asking for AI Feedback!');
                if (answerText) answerText.focus();
                return;
            }

            submitAnswerBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Analyzing...';
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                submitAnswerBtn.innerHTML = '<i data-lucide="sparkles"></i> Get AI Feedback';
                if (window.lucide) lucide.createIcons();
                buildFeedbackContent(selectedCategory, selectedSubtopicIndex, textValue);
                feedbackPanel.classList.remove('hidden');
                feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 800);
        });
    }

    function buildFeedbackContent(catKey, subIdx, userResponse) {
        const mod = getModule(catKey);
        const sub = mod.subtopics[subIdx];
        const feedback = mod.generateFeedback ? mod.generateFeedback(subIdx, userResponse) : {
            bandScore: '7.5',
            criteriaLabel: 'IELTS Assessment Criteria',
            strengths: ['Addressed prompt effectively', 'Sound sentence cadence', 'Good contextual grammar'],
            recommendations: [{ wrong: 'Basic phrasing', correct: 'Academic phrasing', note: 'Register' }],
            proTip: 'Vary sentence length for better rhythm.'
        };

        const strengthsHtml = feedback.strengths.map(s => `<div class="flex-row gap-8"><span>✔️</span> ${escapeHtml(s)}</div>`).join('');
        const recommendationsHtml = feedback.recommendations.map(r => `
            <div class="diff-view">
                <span class="wrong">${escapeHtml(r.wrong)}</span> → <span class="correct">${escapeHtml(r.correct)}</span>
                <span class="suggestion">(${escapeHtml(r.note)})</span>
            </div>
        `).join('');

        feedbackPanel.innerHTML = `
            <div class="feedback-card green-border">
                <div class="space-between">
                    <div>
                        <span class="badge-green">Band ${escapeHtml(feedback.bandScore)}</span>
                        <p class="caption mt-8">Evaluated against ${escapeHtml(feedback.criteriaLabel)}</p>
                    </div>
                    <div class="progress-ring-wrapper" style="padding: 0;">
                        <div class="progress-ring" style="width: 60px; height: 60px;">
                            <span class="score-inner" style="font-size: 18px;">${escapeHtml(feedback.bandScore)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="feedback-card green-border">
                <div class="collapsible-header" onclick="toggleCollapse(this)">
                    <h3 style="font-size: 16px;">✅ Key Strengths</h3>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="collapsible-content">
                    ${strengthsHtml}
                </div>
            </div>

            <div class="feedback-card yellow-border">
                <div class="collapsible-header" onclick="toggleCollapse(this)">
                    <h3 style="font-size: 16px;">⚠️ Precision & Nuance Recommendations</h3>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="collapsible-content">
                    ${recommendationsHtml}
                </div>
            </div>

            <div class="feedback-card" style="background: #FFF9E0; border-left-color: #FFD43B;">
                <h3 style="font-size: 16px;">💡 Band 8+ Pro Tip</h3>
                <p style="margin-top: 8px; color: #1A1A1A; font-size: 14px;">${escapeHtml(feedback.proTip)}</p>
            </div>

            <div class="flex-row gap-12 mt-8">
                <button class="btn-secondary" style="flex: 1;" onclick="document.getElementById('answerText').focus()">🔁 Revise & Try Again</button>
                <button class="btn-secondary" style="flex: 1;" onclick="alert('Feedback saved to your practice notebook!')">💾 Save to Notebook</button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        initCollapsibles();
    }
}

// Collapsible helper
function initCollapsibles() {
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.display = 'flex';
    });
}

function toggleCollapse(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('svg, i');
    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'flex';
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(-90deg)';
    }
}
window.toggleCollapse = toggleCollapse;

// Expose initPractice globally
window.initPractice = initPractice;
