/**
 * ==========================================================================
 * PRACTICE UI COMPONENTS — Layout Engine (layout.js)
 * Unified 2-pane layout component for ALL practice levels (A1 through C2)
 * and all modules.
 *
 * Responsibilities:
 * - Level Header (Breadcrumb, Title, Emoji, Topic count, Progress pill)
 * - 2-Pane Split (Left module navigation list + Right topic learning detail)
 * - Auto-selection of active module
 * - Reactive progress updates (Mark Complete toggles done states across panes)
 * - Bottom Game / Quiz Banner
 *
 * Markup and structural wiring live here so other files stay clean.
 * ==========================================================================
 */
(function () {
    function esc(s) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
        if (typeof escapeHtml === 'function') return escapeHtml(s);
        const div = document.createElement('div');
        div.textContent = (s == null ? '' : String(s));
        return div.innerHTML;
    }

    // Unbiased Fisher-Yates array shuffling helper
    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = copy[i];
            copy[i] = copy[j];
            copy[j] = temp;
        }
        return copy;
    }

    function el(tag, className, html) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function doneOf(track, level, id) {
        if (window.ModulePractice && typeof window.ModulePractice.isComplete === 'function') {
            return window.ModulePractice.isComplete(track, level, id);
        }
        return false;
    }

    function countDone(track, level, items) {
        let n = 0;
        (items || []).forEach((it) => {
            if (doneOf(track, level, it.id || it.title)) n++;
        });
        return n;
    }

    /**
     * Renders the complete standardized Level & Modules screen.
     * Used identically by A1, A2, B1, B1+, B2, C1, and C2.
     */
    function renderLevelLayout(container, opts) {
        if (!container) return;
        const o = opts || {};
        const track = o.track || 'grammar';
        const level = o.level || '';
        const items = Array.isArray(o.items) ? o.items : (Array.isArray(o.classes) ? o.classes : []);
        const game = o.game || { type: 'quiz' };
        const soon = o.status === 'soon';
        let currentSelectedIdx = 0;

        container.innerHTML = '';

        // 1. Level Header
        const head = el('div', 'module-view-head');
        head.innerHTML = `
            <button class="link-back" data-act="back-levels">← All levels</button>
            <p class="caption">${esc(track.toUpperCase())} · LEVEL ${esc(level)}</p>
            <h3>${esc(o.emoji || '📐')} ${esc(level)} — ${esc(o.title || '')}</h3>
            <p class="caption">${esc(o.desc || '')}</p>
            <div class="module-view-meta">
                <span class="pill-chip">${soon ? 'Coming soon' : (o.count || items.length || 0) + ' topics'}</span>
                ${items.length ? `<span class="pill-chip green" data-act="done-count">${countDone(track, level, items)}/${items.length} done</span>` : ''}
                <span class="pill-chip green">🎮 ${esc(game.type || 'quiz')} game</span>
            </div>
        `;
        head.querySelector('[data-act="back-levels"]').addEventListener('click', () => {
            if (typeof o.onBackLevels === 'function') o.onBackLevels();
        });
        container.appendChild(head);

        if (soon || !items.length) {
            const emptyBox = el('div', 'module-empty-state');
            emptyBox.innerHTML = `
                <p class="caption" style="padding: 24px 0;">Content for ${esc(level)} is being prepared. Check back soon!</p>
            `;
            container.appendChild(emptyBox);
            return;
        }

        // 2. Main Practice Layout Container (Grid when browsing, Split when a class is selected)
        const mainArea = el('div', 'practice-main-area');
        const classesSideEl = el('div', 'classes-side-pane');
        const gridEl = el('div', 'classes-collage-grid');
        classesSideEl.appendChild(gridEl);
        mainArea.appendChild(classesSideEl);

        const quizSideEl = el('div', 'class-quiz-side-pane');
        quizSideEl.style.display = 'none'; // Hidden until a class is active
        mainArea.appendChild(quizSideEl);

        container.appendChild(mainArea);

        // Web Audio Synthesizer for clean feedback chimes (Right / Wrong)
        let audioCtx = null;
        function getAudioContext() {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) audioCtx = new AudioContextClass();
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            return audioCtx;
        }

        function playSound(type) {
            try {
                const ctx = getAudioContext();
                if (!ctx) return;
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                if (type === 'correct') {
                    // Cheerful bright two-tone chime (C5 -> G5)
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.36);
                } else {
                    // Soft low double bonk for wrong
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(220, now); // A3
                    osc.frequency.setValueAtTime(164.81, now + 0.1); // E3
                    gain.gain.setValueAtTime(0.22, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                    osc.start(now);
                    osc.stop(now + 0.3);
                }
            } catch (e) {
                console.warn('Audio feedback failed:', e);
            }
        }

        // Helper: Update header progress pill
        const updateHeaderPill = () => {
            const pill = head.querySelector('[data-act="done-count"]');
            if (pill) pill.textContent = `${countDone(track, level, items)}/${items.length} done`;
        };

        // Active Quiz Player State & Score Store
        let activeClassIdx = null;
        let currentQuestionIdx = 0;
        let selectedOption = null;
        let hasAnswered = false;
        let correctCount = 0;
        let timerSeconds = 180;
        let timerInterval = null;

        function getSavedScore(id) {
            try {
                const store = JSON.parse(localStorage.getItem('aiec-scores-v1') || '{}');
                return (store[track] && store[track][level] && store[track][level][id]) || null;
            } catch (e) {
                return null;
            }
        }

        function saveClassScore(id, score, total) {
            try {
                const store = JSON.parse(localStorage.getItem('aiec-scores-v1') || '{}');
                store[track] = store[track] || {};
                store[track][level] = store[track][level] || {};
                store[track][level][id] = { score, total, pct: Math.round((score / total) * 100), ts: Date.now() };
                localStorage.setItem('aiec-scores-v1', JSON.stringify(store));
            } catch (e) {}

            // Sync with backend API & database
            if (window.AIEC_API && typeof window.AIEC_API.saveScore === 'function') {
                window.AIEC_API.saveScore(track, level, id, score, total);
            }
        }

        function formatTimer(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (timerSeconds > 0) {
                    timerSeconds--;
                    const badge = quizSideEl.querySelector('.quiz-timer-badge span');
                    if (badge) badge.textContent = `⏱ ${formatTimer(timerSeconds)}`;
                } else {
                    clearInterval(timerInterval);
                }
            }, 1000);
        }

        function renderQuizPlayer(item, classIdx) {
            activeClassIdx = classIdx;
            const qList = (item.questions && item.questions.length) ? item.questions : [
                { q: "Choose the correct sentence.", options: ["He is happy.", "He are happy.", "He am happy.", "He be happy."], answer: "He is happy.", explanation: "Singular 'He' takes 'is'." }
            ];

            const totalQ = qList.length;
            const qData = qList[currentQuestionIdx];
            hasAnswered = false;
            selectedOption = null;

            // Question prompt
            let qText = qData.q || '';

            // Unbiased Fisher-Yates randomization: ensures correct answers are unpredictably distributed across A, B, C, D
            if (!qData._shuffledOptions) {
                const rawOptions = (qData.options && qData.options.length) 
                    ? [...qData.options] 
                    : ['Option A', 'Option B', 'Option C', 'Option D'];
                qData._shuffledOptions = shuffleArray(rawOptions);
            }
            const options = qData._shuffledOptions;
            const correctAnswer = (qData.answer || '').trim();

            quizSideEl.innerHTML = `
                <div class="quiz-player-card">
                    <!-- Top Bar: Back, Class Name + Timer Beneath, Grid Icon -->
                    <div class="quiz-player-top">
                        <button type="button" class="quiz-top-btn quiz-back-btn" title="Back to collage grid">
                            <span class="btn-icon">‹</span>
                        </button>
                        <div class="quiz-top-center">
                            <h4 class="quiz-top-title">${esc(item.title || ('Class ' + (classIdx + 1)))}</h4>
                            <div class="quiz-timer-badge">
                                <span>⏱ ${formatTimer(timerSeconds)}</span>
                            </div>
                        </div>
                        <button type="button" class="quiz-top-btn quiz-grid-btn" title="View all classes grid">
                            <span class="btn-icon">⊞</span>
                        </button>
                    </div>

                    <!-- Progress Header -->
                    <div class="quiz-meta-row">
                        <span class="quiz-q-counter">${String(currentQuestionIdx + 1).padStart(2, '0')} Question</span>
                        <span class="quiz-q-total">${currentQuestionIdx + 1} of ${totalQ}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="quiz-progress-track">
                        <div class="quiz-progress-fill" style="width: ${((currentQuestionIdx + 1) / totalQ) * 100}%;"></div>
                    </div>

                    <!-- Question Prompt / Blank Sentence -->
                    <div class="quiz-question-box">
                        <h2 class="quiz-question-text">${esc(qText)}</h2>
                    </div>

                    <!-- Interactive Bulb Hint Box -->
                    <div class="quiz-hint-box" style="display: none;"></div>

                    <!-- Choose Your Answer Header & Quick Hint Button -->
                    <div class="quiz-options-header">
                        <p class="quiz-section-label">Choose your answer</p>
                        <button type="button" class="quiz-inline-hint-btn" id="quizInlineHintBtn" title="Get a hint for this question">
                            <span class="inline-hint-icon">💡</span> Need a hint?
                        </button>
                    </div>

                    <!-- 4 Option Choice Grid (A, B, C, D) -->
                    <div class="quiz-options-grid">
                        ${options.map((opt, optIdx) => {
                            const letter = ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);
                            return `
                                <button type="button" class="quiz-option-btn" data-opt="${esc(opt)}" data-index="${optIdx}">
                                    <span class="quiz-opt-letter">${letter}.</span>
                                    <span class="quiz-opt-text">${esc(opt)}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- Feedback message area (shows right answer when wrong) -->
                    <div class="quiz-feedback-box" style="display: none;"></div>

                    <!-- Bottom Nav Actions: Previous, Hint/Bulb, Next -->
                    <div class="quiz-player-bottom">
                        <button type="button" class="quiz-nav-btn quiz-prev-btn" ${currentQuestionIdx === 0 ? 'disabled' : ''}>
                            <span>‹ Previous</span>
                        </button>
                        <button type="button" class="quiz-hint-circle" id="quizHintBtn" aria-label="Toggle Hint" title="Click for Hint">
                            <span class="hint-icon">💡</span>
                            <span class="hint-badge-tag">HINT</span>
                        </button>
                        <button type="button" class="quiz-nav-btn quiz-next-btn">
                            <span>Next ›</span>
                        </button>
                    </div>
                </div>
            `;

            startTimer();

            const feedbackBox = quizSideEl.querySelector('.quiz-feedback-box');
            const nextBtn = quizSideEl.querySelector('.quiz-next-btn');
            const prevBtn = quizSideEl.querySelector('.quiz-prev-btn');
            const optBtns = quizSideEl.querySelectorAll('.quiz-option-btn');

            // Handle Option Click
            optBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (hasAnswered) return;
                    hasAnswered = true;
                    selectedOption = btn.dataset.opt;

                    const isMatch = (selectedOption.trim().toLowerCase() === correctAnswer.toLowerCase());

                    if (isMatch) {
                        btn.classList.add('is-correct');
                        playSound('correct');
                        correctCount++;
                        feedbackBox.className = 'quiz-feedback-box is-correct';
                        feedbackBox.innerHTML = `<strong>✓ Perfect!</strong> Correct answer.`;
                        feedbackBox.style.display = 'block';
                    } else {
                        btn.classList.add('is-wrong');
                        playSound('wrong');

                        optBtns.forEach(b => {
                            if (b.dataset.opt.trim().toLowerCase() === correctAnswer.toLowerCase()) {
                                b.classList.add('is-correct');
                            }
                        });

                        feedbackBox.className = 'quiz-feedback-box is-wrong';
                        feedbackBox.innerHTML = `
                            <div class="feedback-wrong-content">
                                <strong>✕ Incorrect</strong>
                                <span class="feedback-correct-answer">Correct answer: <strong>${esc(correctAnswer)}</strong></span>
                                ${qData.explanation ? `<p class="feedback-explain">${esc(qData.explanation)}</p>` : ''}
                            </div>
                        `;
                        feedbackBox.style.display = 'block';
                    }

                    nextBtn.classList.add('is-active');
                    nextBtn.focus();
                });
            });

            // Handle Next Question / Finish Class
            nextBtn.addEventListener('click', () => {
                if (currentQuestionIdx < totalQ - 1) {
                    currentQuestionIdx++;
                    renderQuizPlayer(item, classIdx);
                } else {
                    finishClass(item, classIdx, totalQ);
                }
            });

            // Handle Previous Question
            prevBtn.addEventListener('click', () => {
                if (currentQuestionIdx > 0) {
                    currentQuestionIdx--;
                    renderQuizPlayer(item, classIdx);
                }
            });

        function buildQuizHint(qData, qText, correctAnswer, options) {
            const ansLower = (correctAnswer || '').trim().toLowerCase();
            
            // Find which option letter matches the answer in the shuffled options (A, B, C, D)
            const optIdx = options.findIndex(o => (o || '').trim().toLowerCase() === ansLower);
            const optLetter = optIdx >= 0 ? (['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx)) : '';

            // Formulate an intuitive similar sentence
            let similarSentence = '';
            let helpfulTip = '';

            if (ansLower === 'am') {
                similarSentence = "I am excited to learn English today.";
                helpfulTip = "In present simple, the first-person pronoun 'I' exclusively takes 'am'.";
            } else if (ansLower === 'is') {
                similarSentence = "She is an outstanding teacher in our school.";
                helpfulTip = "Third-person singular subjects (he, she, it) pair with 'is'.";
            } else if (ansLower === 'are') {
                similarSentence = "They are ready to join the conversation.";
                helpfulTip = "Plural subjects (we, you, they) pair with 'are'.";
            } else if (ansLower === 'be') {
                similarSentence = "Always try to be calm and confident.";
                helpfulTip = "Use the base form 'be' following modals or imperatives.";
            } else if (ansLower.includes("isn't") || ansLower.includes("is not")) {
                similarSentence = "He isn't busy at the moment.";
                helpfulTip = "Use 'isn't' / 'is not' for singular negative statements.";
            } else if (ansLower.includes("aren't") || ansLower.includes("are not")) {
                similarSentence = "We aren't late for our morning class.";
                helpfulTip = "Use 'aren't' / 'are not' for plural negative statements.";
            } else if (ansLower.includes("don't") || ansLower.includes("do not")) {
                similarSentence = "I don't drink cold tea in the winter.";
                helpfulTip = "Use 'don't' with I, you, we, and they in present simple.";
            } else if (ansLower.includes("doesn't") || ansLower.includes("does not")) {
                similarSentence = "She doesn't drive a car to work.";
                helpfulTip = "Use 'doesn't' with third-person singular (he, she, it).";
            } else if (ansLower.includes("where is")) {
                similarSentence = "Where is the nearest library?";
                helpfulTip = "Wh- question + 'is' + singular noun phrase.";
            } else if (ansLower.includes("where are")) {
                similarSentence = "Where are my keys?";
                helpfulTip = "Wh- question + 'are' + plural noun phrase.";
            } else if (ansLower.includes("yes, i am")) {
                similarSentence = "Are you ready? → Yes, I am.";
                helpfulTip = "In affirmative short answers, do not contract 'I am' into 'I'm'.";
            } else if (ansLower.includes("no, she isn't") || ansLower.includes("no, he isn't")) {
                similarSentence = "Is she tired? → No, she isn't.";
                helpfulTip = "In negative short answers, use contracted forms like 'No, she isn't.'";
            } else if (qText.includes('___')) {
                // If template sentence, create a clean similar model
                const subjectMatch = qText.match(/\b(I|You|He|She|It|We|They)\b/i);
                const subj = subjectMatch ? subjectMatch[0] : 'I';
                if (/^i$/i.test(subj)) {
                    similarSentence = "I am ready to practice right now.";
                    helpfulTip = "Notice the first-person subject 'I'.";
                } else if (/^(he|she|it)$/i.test(subj)) {
                    similarSentence = `${subj} is always on time.`;
                    helpfulTip = `Notice the third-person singular subject '${subj}'.`;
                } else {
                    similarSentence = `${subj} are learning together.`;
                    helpfulTip = `Notice the plural subject '${subj}'.`;
                }
            } else {
                helpfulTip = "Pay close attention to grammatical agreement, clause structure, and word order.";
            }

            const ruleText = qData.explanation || qData.hint || 'Carefully match the subject pronoun with the correct verb form.';

            return `
                <div class="quiz-hint-inner">
                    <div class="quiz-hint-badge-row">
                        <span class="quiz-hint-badge">💡 Grammar Hint & Clue</span>
                        <button type="button" class="quiz-hint-close-btn" aria-label="Close Hint" title="Close Hint">✕</button>
                    </div>
                    <div class="quiz-hint-content">
                        <p class="quiz-hint-line">
                            <span class="hint-label">Grammar rule:</span>
                            <span class="hint-desc">${esc(ruleText)}</span>
                        </p>
                        ${similarSentence ? `
                        <p class="quiz-hint-line">
                            <span class="hint-label">Model example:</span>
                            <span class="hint-sentence">"${esc(similarSentence)}"</span>
                        </p>` : ''}
                        ${helpfulTip ? `
                        <p class="quiz-hint-line">
                            <span class="hint-label">Key clue:</span>
                            <span class="hint-desc">${esc(helpfulTip)}</span>
                        </p>` : ''}
                    </div>
                    <div class="quiz-hint-footer">
                        <button type="button" class="quiz-reveal-clue-btn">🔍 Reveal option clue</button>
                        <span class="quiz-revealed-clue" style="display: none;">
                            ${optLetter ? `Correct choice is <strong>Option ${optLetter}</strong> (${esc(correctAnswer)})` : `Answer: <strong>${esc(correctAnswer)}</strong>`}
                        </span>
                    </div>
                </div>
            `;
        }

        // Handle Bulb Hint Click & Inline Hint Button: show structured hint & smooth scroll
        const hintCircle = quizSideEl.querySelector('.quiz-hint-circle');
        const inlineHintBtn = quizSideEl.querySelector('.quiz-inline-hint-btn');
        const hintBox = quizSideEl.querySelector('.quiz-hint-box');

        function toggleHint() {
            if (!hintBox) return;
            const isVisible = hintBox.style.display !== 'none';
            if (isVisible) {
                hintBox.style.display = 'none';
                if (hintCircle) hintCircle.classList.remove('is-active');
                if (inlineHintBtn) inlineHintBtn.classList.remove('is-active');
            } else {
                hintBox.innerHTML = buildQuizHint(qData, qText, correctAnswer, options);
                hintBox.style.display = 'block';
                if (hintCircle) hintCircle.classList.add('is-active');
                if (inlineHintBtn) inlineHintBtn.classList.add('is-active');
                playSound('correct');

                // Hook up close button inside hint
                const closeBtn = hintBox.querySelector('.quiz-hint-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleHint();
                    });
                }

                // Hook up reveal clue button inside hint
                const revealBtn = hintBox.querySelector('.quiz-reveal-clue-btn');
                const revealedClue = hintBox.querySelector('.quiz-revealed-clue');
                if (revealBtn && revealedClue) {
                    revealBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        revealBtn.style.display = 'none';
                        revealedClue.style.display = 'inline-block';
                    });
                }

                // Smoothly scroll hint into clear view
                hintBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        if (hintCircle) {
            hintCircle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleHint();
            });
        }
        if (inlineHintBtn) {
            inlineHintBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleHint();
            });
        }

            // Back button and Grid button: returns to 4-in-a-row collage grid
            quizSideEl.querySelectorAll('.quiz-back-btn, .quiz-grid-btn').forEach(b => {
                b.addEventListener('click', () => {
                    closeQuizAndShowGrid();
                });
            });
        }

        // Completion flow & Score Saving
        function finishClass(item, classIdx, totalQ) {
            if (timerInterval) clearInterval(timerInterval);
            const id = item.id || ('module-' + (classIdx + 1));
            
            // Save persistent score and complete status
            saveClassScore(id, correctCount, totalQ);

            if (window.ModulePractice && typeof window.ModulePractice.toggleComplete === 'function') {
                if (!doneOf(track, level, id)) {
                    window.ModulePractice.toggleComplete(track, level, id);
                }
            }
            playSound('correct');
            updateHeaderPill();
            paintCollage();

            const pct = Math.round((correctCount / totalQ) * 100);
            quizSideEl.innerHTML = `
                <div class="quiz-player-card quiz-completed-card">
                    <div class="completion-badge">${pct >= 70 ? '🎉' : '💪'}</div>
                    <h3>Class ${classIdx + 1} Finished!</h3>
                    <p class="caption">${esc(item.title || '')}</p>
                    <div class="completion-stats">
                        <span class="stat-pill">Score: ${correctCount}/${totalQ} (${pct}%)</span>
                        <span class="stat-pill green">✓ Saved</span>
                    </div>
                    <div class="completion-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" class="btn-try-again quiz-retry-btn" style="flex: 1; min-width: 140px;">🔁 Try Again</button>
                        <button type="button" class="btn-secondary quiz-return-grid-btn" style="flex: 1; min-width: 130px;">Classes Grid</button>
                        ${(classIdx + 1 < items.length) ? `<button type="button" class="btn-primary quiz-next-class-btn" style="flex: 1; min-width: 140px;">Next Class →</button>` : ''}
                    </div>
                </div>
            `;

            quizSideEl.querySelector('.quiz-retry-btn').addEventListener('click', () => {
                selectClassAndStart(item, classIdx);
            });

            quizSideEl.querySelector('.quiz-return-grid-btn').addEventListener('click', () => {
                closeQuizAndShowGrid();
            });

            const nextClassBtn = quizSideEl.querySelector('.quiz-next-class-btn');
            if (nextClassBtn) {
                nextClassBtn.addEventListener('click', () => {
                    selectClassAndStart(items[classIdx + 1], classIdx + 1);
                });
            }
        }

        function closeQuizAndShowGrid() {
            if (timerInterval) clearInterval(timerInterval);
            mainArea.classList.remove('is-quiz-active');
            quizSideEl.style.display = 'none';
            paintCollage();
            if (window.AIEC_Router) {
                window.AIEC_Router.navigate(`/practice/${track.toLowerCase()}/${level.toLowerCase()}`);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function selectClassAndStart(item, idx, skipNavigate = false) {
            currentSelectedIdx = idx;
            currentQuestionIdx = 0;
            correctCount = 0;
            timerSeconds = 180;

            // Reset cached shuffled options so every new attempt gets fresh, unpredictable option distribution
            if (item && Array.isArray(item.questions)) {
                item.questions.forEach(q => {
                    delete q._shuffledOptions;
                });
            }

            mainArea.classList.add('is-quiz-active');
            quizSideEl.style.display = 'block';
            paintCollage();
            renderQuizPlayer(item, idx);
            if (!skipNavigate && window.AIEC_Router) {
                const classSlug = (item.id || ('class' + String(idx + 1).padStart(2, '0'))).toLowerCase();
                window.AIEC_Router.navigate(`/practice/${track.toLowerCase()}/${level.toLowerCase()}/${classSlug}`);
            }
            quizSideEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Active layout controller for direct router deep-linking
        window.AIEC_ActiveLevelController = {
            selectClassById: function(targetClassId) {
                const norm = String(targetClassId || '').toLowerCase().replace(/[-_]/g, '');
                for (let i = 0; i < items.length; i++) {
                    const cid = String(items[i].id || ('class' + String(i + 1).padStart(2, '0'))).toLowerCase().replace(/[-_]/g, '');
                    const titleSlug = String(items[i].title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cid === norm || titleSlug === norm || String(i + 1) === norm || ('class' + (i + 1)) === norm || ('class0' + (i + 1)) === norm) {
                        selectClassAndStart(items[i], i, true);
                        return true;
                    }
                }
                if (items.length > 0) {
                    selectClassAndStart(items[0], 0, true);
                    return true;
                }
                return false;
            }
        };

        // Paint the classes cards (renders as 4-column collage or 1-column side list)
        const paintCollage = () => {
            const selectedId = items[currentSelectedIdx] ? (items[currentSelectedIdx].id || ('module-' + (currentSelectedIdx + 1))) : null;
            if (window.ModuleList && typeof window.ModuleList.renderList === 'function') {
                window.ModuleList.renderList(gridEl, {
                    track,
                    level,
                    items,
                    fallbackEmoji: o.emoji,
                    selectedId,
                    onSelect: (item, idx) => {
                        selectClassAndStart(item, idx);
                    }
                });
            }
        };

        // React immediately if user signs in or auth changes
        const onAuthChanged = () => {
            updateHeaderPill();
            paintCollage();
        };
        window.addEventListener('aiec-auth-changed', onAuthChanged);

        // Initial paint of collage grid (full 4-in-a-row)
        paintCollage();

        // If an initial classId was requested from route:
        if (o.initialClassId) {
            window.AIEC_ActiveLevelController.selectClassById(o.initialClassId);
        }

        // 3. Vibrant Meme Generator Banner ("Tired? Want some fun?" -> Generate 3 Memes)
        const memeBanner = el('div', 'meme-fun-banner');
        memeBanner.innerHTML = `
            <div class="meme-banner-left">
                <span class="meme-banner-badge">✨ Take a break</span>
                <h3 class="meme-banner-title">Tired? Want some fun?</h3>
                <p class="meme-banner-subtitle">Generate hilarious AI learning memes! (1 meme per click • 15 memes/day • 30-min break after 3 memes)</p>
                <div class="meme-status-pills">
                    <span class="meme-quota-badge" id="memeQuotaBadge">🎯 <strong id="memeUsedCount">0</strong>/15 memes used today</span>
                    <span class="meme-cooldown-badge" id="memeCooldownBadge" style="display:none;">⏳ Cooldown: <strong id="memeCountdownTime">30:00</strong></span>
                </div>
            </div>
            <div class="meme-banner-right">
                <button type="button" class="meme-generate-btn" id="generateMemeBtn">
                    <span class="meme-btn-icon">⚡</span>
                    <span class="meme-btn-text">Generate Meme</span>
                </button>
            </div>
        `;

        // Curated funny English learning memes catalog with 100% verified templates
        const MEME_CATALOG = [
            {
                template: "drake",
                top: "Using everyday normal words",
                bottom: "Forcing Band 9 collocations into every sentence",
                topic: "IELTS Lexical Resource",
                caption: "Why say 'I am tired' when you can say 'I am utterly fatigued by mundane exertion'?"
            },
            {
                template: "fry",
                top: "Not sure if native speaker",
                bottom: "Or just speaking at 3x speed with heavy slang",
                topic: "Listening Comprehension",
                caption: "When the examiner starts speaking and all consonants vanish into thin air."
            },
            {
                template: "rollsafe",
                top: "Can't make grammar mistakes",
                bottom: "If you only answer with one-word answers",
                topic: "Speaking Strategy",
                caption: "Examiner: Describe your hometown. Me: Yes."
            },
            {
                template: "spongebob",
                top: "Me writing: Henceforth furthermore nevertheless",
                bottom: "My actual essay content: Dogs are cute",
                topic: "IELTS Writing Task 2",
                caption: "Linking words won't save a 20-word argument, but we try anyway!"
            },
            {
                template: "doge",
                top: "Much IELTS very band 9",
                bottom: "Such lexical resource wow",
                topic: "Vocabulary Flex",
                caption: "Throwing 'ubiquitous' and 'myriad' into casual conversation like confetti."
            },
            {
                template: "disastergirl",
                top: "Me forgetting third-person -s in present simple",
                bottom: "My English teacher watching in agony",
                topic: "A1 Grammar Trap",
                caption: "'He go to school' gives your teacher physical chills."
            },
            {
                template: "fine",
                top: "Examiner: Describe a book that influenced you",
                bottom: "Me who has not read a book since 2018: This is fine",
                topic: "Speaking Part 2",
                caption: "Time to invent an award-winning novel in 60 seconds."
            },
            {
                template: "buzz",
                top: "Prepositions",
                bottom: "Irregular prepositions everywhere",
                topic: "Prepositions",
                caption: "In time? On time? At the end? In the end? Why does time have four different prepositions?"
            },
            {
                template: "db",
                top: "Me trying to master past perfect",
                bottom: "Phrasal verbs with 14 different meanings walking by",
                topic: "Grammar Traps",
                caption: "Turn up, turn down, turn off, turn out... please have mercy!"
            }
        ];

        function sanitizeMemegen(txt) {
            if (!txt) return '_';
            let t = txt.trim()
                .replace(/_/g, '__')
                .replace(/-/g, '--')
                .replace(/\?/g, '~q')
                .replace(/%/g, '~p')
                .replace(/#/g, '~h')
                .replace(/\//g, '~s')
                .replace(/"/g, "''")
                .replace(/\s+/g, '_');
            return encodeURIComponent(t).replace(/%7E/g, '~').replace(/%5F/g, '_');
        }

        let memeCountdownInterval = null;

        async function syncMemeStatus() {
            if (!window.AIEC_API || typeof window.AIEC_API.getMemeStatus !== 'function') return;
            const st = await window.AIEC_API.getMemeStatus();
            if (!st) return;

            const usedEl = memeBanner.querySelector('#memeUsedCount');
            if (usedEl) usedEl.textContent = st.today_count || 0;

            const btn = memeBanner.querySelector('#generateMemeBtn');
            const btnText = btn ? btn.querySelector('.meme-btn-text') : null;
            const cooldownBadge = memeBanner.querySelector('#memeCooldownBadge');
            const countdownTime = memeBanner.querySelector('#memeCountdownTime');

            if (memeCountdownInterval) {
                clearInterval(memeCountdownInterval);
                memeCountdownInterval = null;
            }

            if (st.in_cooldown && st.cooldown_remaining_seconds > 0) {
                if (btn) btn.disabled = true;
                if (btnText) btnText.textContent = 'In 30m Cooldown';
                if (cooldownBadge) cooldownBadge.style.display = 'inline-flex';

                let remaining = st.cooldown_remaining_seconds;
                const tick = () => {
                    if (remaining <= 0) {
                        clearInterval(memeCountdownInterval);
                        memeCountdownInterval = null;
                        if (btn) btn.disabled = false;
                        if (btnText) btnText.textContent = 'Generate 3 Memes';
                        if (cooldownBadge) cooldownBadge.style.display = 'none';
                        syncMemeStatus();
                        return;
                    }
                    const m = Math.floor(remaining / 60);
                    const s = remaining % 60;
                    if (countdownTime) {
                        countdownTime.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    }
                    remaining--;
                };
                tick();
                memeCountdownInterval = setInterval(tick, 1000);
            } else if (st.remaining_today <= 0) {
                if (btn) btn.disabled = true;
                if (btnText) btnText.textContent = 'Daily Limit Reached (15/15)';
                if (cooldownBadge) cooldownBadge.style.display = 'none';
            } else {
                if (btn) btn.disabled = false;
                if (btnText) btnText.textContent = 'Generate 3 Memes';
                if (cooldownBadge) cooldownBadge.style.display = 'none';
            }
        }

        // Initialize meme banner status on load
        syncMemeStatus();

        async function openMemeModal() {
            const oldModal = document.getElementById('memeFunModal');
            if (oldModal) oldModal.remove();

            const generateBtn = memeBanner.querySelector('#generateMemeBtn');
            const btnText = generateBtn ? generateBtn.querySelector('.meme-btn-text') : null;
            const originalText = btnText ? btnText.textContent : 'Generate Meme';

            if (generateBtn) generateBtn.disabled = true;
            if (btnText) btnText.textContent = '⚡ Generating Meme...';

            let memesList = [];
            let statsData = null;

            // Try backend API meme generator (request 1 meme per click)
            if (window.AIEC_API && typeof window.AIEC_API.generateMeme === 'function') {
                try {
                    const topicName = (items && items[currentSelectedIdx] && items[currentSelectedIdx].title) || level;
                    const res = await window.AIEC_API.generateMeme(topicName, 1);

                    // Check for rate limit rejection
                    if (res && res.rate_limited) {
                        const err = res.detail || {};
                        const errMsg = err.message || (err.error === 'cooldown_active'
                            ? 'Cooldown active: You generated 3 memes. Please wait 30 minutes before generating again.'
                            : 'Daily limit reached: 15/15 memes generated today.');
                        alert(errMsg);
                        await syncMemeStatus();
                        return;
                    }

                    if (res && res.memes && Array.isArray(res.memes) && res.memes.length > 0) {
                        memesList = res.memes;
                        statsData = res.stats;
                    }
                } catch (e) {
                    console.warn('[Meme UI] Generation failed, using local offline memes:', e);
                }
            }

            // Fallback: Pick 1 curated meme from catalog if offline
            if (!memesList || memesList.length === 0) {
                const shuffled = [...MEME_CATALOG].sort(() => 0.5 - Math.random());
                const picked = shuffled.slice(0, 1);
                memesList = picked.map(m => {
                    const topEnc = sanitizeMemegen(m.top);
                    const botEnc = sanitizeMemegen(m.bottom);
                    return {
                        template: m.template,
                        top_text: m.top,
                        bottom_text: m.bottom,
                        topic: m.topic,
                        joke: m.caption,
                        image_url: `https://api.memegen.link/images/${m.template}/${topEnc}/${botEnc}.png`
                    };
                });
            }

            // Restore button text
            if (btnText) btnText.textContent = originalText;

            // Construct Meme Modal
            const modal = el('div', 'meme-modal-overlay');
            modal.id = 'memeFunModal';

            const usedCount = (statsData && statsData.today_count) || 1;
            const dailyLimit = (statsData && statsData.daily_limit) || 15;
            const inCooldown = (statsData && statsData.in_cooldown);

            modal.innerHTML = `
                <div class="meme-modal-dialog">
                    <div class="meme-modal-header">
                        <div class="meme-modal-title-wrap">
                            <span class="meme-tag">🎭 Learning Meme</span>
                            <h4>Your IELTS Study Break Meme</h4>
                        </div>
                        <button type="button" class="meme-modal-close" aria-label="Close">✕</button>
                    </div>

                    <!-- Meme Gallery Grid -->
                    <div class="meme-gallery-grid" style="grid-template-columns: 1fr; width: 100%; margin: 0 auto;">
                        ${memesList.map((m, idx) => `
                            <div class="meme-card-item">
                                <div class="meme-card-header">
                                    <span class="meme-card-idx">Meme</span>
                                    <span class="meme-card-topic">🔥 ${esc(m.topic || 'English')}</span>
                                </div>
                                <div class="meme-card-img-wrap">
                                    <img src="${esc(m.image_url)}" alt="English Meme" onerror="this.onerror=null; this.src='https://api.memegen.link/images/drake/Studying_Grammar/Making_Memes.png';">
                                </div>
                                <div class="meme-card-body">
                                    <div class="meme-hint-box">
                                        <div class="meme-hint-header">
                                            <span class="meme-hint-badge">💡 IELTS Grammar Hint & Tip</span>
                                        </div>
                                        <p class="meme-hint-text">"${esc(m.joke || 'Keep learning and smiling!')}"</p>
                                    </div>
                                    <div class="meme-card-actions">
                                        <a href="${esc(m.image_url)}" target="_blank" rel="noopener noreferrer" class="meme-download-btn" title="Open full image">
                                            <span>↗ View Full Size</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Cooldown & Quota Information Banner -->
                    <div class="meme-modal-cooldown-notice">
                        <span>🎯 <strong>Quota:</strong> ${usedCount}/${dailyLimit} used today ${inCooldown ? '• ⏳ <strong>30-Minute Break Active</strong> (take a study break!)' : ''}</span>
                    </div>

                    <div class="meme-modal-footer">
                        <span class="caption">1 meme per click • Laugh, refresh & get back to practice!</span>
                        <button type="button" class="meme-back-btn">Back to Practice</button>
                    </div>
                </div>
            `;

            modal.querySelector('.meme-modal-close').addEventListener('click', () => modal.remove());
            modal.querySelector('.meme-back-btn').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.body.appendChild(modal);

            // Re-sync status to start countdown on the banner immediately
            await syncMemeStatus();
        }

        memeBanner.querySelector('#generateMemeBtn').addEventListener('click', () => {
            openMemeModal();
        });

        container.appendChild(memeBanner);
    }

    window.PracticeLayout = {
        renderLevelLayout
    };
})();
