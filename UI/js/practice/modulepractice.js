/**
 * ==========================================================================
 * MODULE PRACTICE VIEW (modulepractice.js)
 * Drill-down flow for a selected practice level:
 *   levels grid -> modules list -> single module page (level/topic/)
 * Markup lives here; practiceUI.js only passes data + callbacks.
 * Styles: UI/css/practice.css (section 8. MODULE VIEW).
 *
 * Progress (green done / white todo) persists in localStorage.
 *
 * API:
 *   window.ModulePractice.renderLevelModules(container, opts)
 *   window.ModulePractice.renderModuleSingle(container, opts)
 *   window.ModulePractice.getProgress(track, level)
 *   window.ModulePractice.toggleComplete(track, level, moduleId)
 * opts (list): { track, level, title, desc, emoji, count, status,
 *   items: [{ id, title, desc, type, emoji }], game: { type },
 *   onBackLevels(), onSelectModule(item, idx), onPlayGame() }
 * opts (single): { track, level, item, idx, total, game,
 *   onBackModules(), onToggleComplete(item, done) }
 * ==========================================================================
 */
(function () {
    var STORE_KEY = 'aiec-progress-v1';

    function esc(s) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
        if (typeof escapeHtml === 'function') return escapeHtml(s);
        const div = document.createElement('div');
        div.textContent = (s == null ? '' : String(s));
        return div.innerHTML;
    }

    function el(tag, className, html) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (html != null) n.innerHTML = html;
        return n;
    }

    // ---------------- Progress store (done = green, else white) ----------------
    function loadStore() {
        try {
            return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveStore(store) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (e) { /* private mode etc — progress just won't persist */ }
    }

    function getProgress(track, level) {
        const store = loadStore();
        const done = store && store[track] && store[track][level] && store[track][level].modules;
        return done || {};
    }

    function isComplete(track, level, moduleId) {
        return !!getProgress(track, level)[moduleId];
    }

    function toggleComplete(track, level, moduleId) {
        const store = loadStore();
        store[track] = store[track] || {};
        store[track][level] = store[track][level] || { modules: {} };
        const mods = store[track][level].modules;
        const done = !mods[moduleId];
        if (done) mods[moduleId] = true;
        else delete mods[moduleId];
        saveStore(store);

        // Sync with backend database API
        if (window.AIEC_API && typeof window.AIEC_API.saveProgress === 'function') {
            window.AIEC_API.saveProgress(track, level, moduleId, done);
        }

        return done;
    }

    function levelDoneCount(track, level, items) {
        let n = 0;
        (items || []).forEach((it) => {
            if (isComplete(track, level, it.id || it.title)) n++;
        });
        return n;
    }

    // ---------------- Modules list ----------------
    function moduleCard(track, level, item, idx, opts) {
        const id = item.id || ('module-' + (idx + 1));
        const done = isComplete(track, level, id);
        const card = el('button', 'module-card' + (done ? ' is-done' : ''));
        card.dataset.module = id;
        card.innerHTML = `
            <span class="module-thumb">${esc(item.emoji || (opts && opts.emoji) || '📝')}</span>
            <span class="module-body">
                <span class="module-title">${esc(item.title || ('Module ' + (idx + 1)))}</span>
                <span class="caption">${esc(item.desc || '')}</span>
            </span>
            ${done ? '<span class="module-done-badge">✓ Done</span>' : '<span class="module-type">' + esc(item.type || 'Lesson') + '</span>'}
        `;
        if (opts && typeof opts.onSelectModule === 'function') {
            card.addEventListener('click', () => opts.onSelectModule(item, idx));
        }
        return card;
    }

    function skeletonCard(idx) {
        const card = el('div', 'module-card is-skeleton');
        card.innerHTML = `
            <span class="module-thumb">📝</span>
            <span class="module-body">
                <span class="module-title">Module lands here</span>
                <span class="caption">Topics from lessons/ fill this slot next.</span>
            </span>
            <span class="module-type">Soon</span>
        `;
        return card;
    }

    function renderLevelModules(container, opts) {
        if (!container) return;
        if (window.PracticeLayout && typeof window.PracticeLayout.renderLevelLayout === 'function') {
            window.PracticeLayout.renderLevelLayout(container, opts);
            return;
        }
        const o = opts || {};
        const track = o.track || 'grammar';
        const level = o.level || '';
        const items = Array.isArray(o.items) ? o.items : [];
        const game = o.game || { type: 'quiz' };
        const soon = o.status === 'soon';
        const doneCount = levelDoneCount(track, level, items);
        container.innerHTML = '';

        // Header with back-to-levels
        const head = el('div', 'module-view-head');
        head.innerHTML = `
            <button class="link-back" data-act="back-levels">← All levels</button>
            <p class="caption">${esc(track.toUpperCase())} · LEVEL ${esc(level)}</p>
            <h3>${esc(o.emoji || '📐')} ${esc(level)} — ${esc(o.title || '')}</h3>
            <p class="caption">${esc(o.desc || '')}</p>
            <div class="module-view-meta">
                <span class="pill-chip">${soon ? 'Coming soon' : (o.count || items.length || 0) + ' topics'}</span>
                ${items.length ? `<span class="pill-chip green" data-act="done-count">${doneCount}/${items.length} done</span>` : ''}
                <span class="pill-chip green">🎮 ${esc(game.type || 'quiz')} game</span>
            </div>
        `;
        head.querySelector('[data-act="back-levels"]').addEventListener('click', () => {
            if (typeof o.onBackLevels === 'function') o.onBackLevels();
        });
        container.appendChild(head);

        if (soon) {
            container.appendChild(el('p', 'caption', 'Mastery content is on its way.'));
            return;
        }

        // Two-pane layout: module list (left) + Q&A detail (right).
        // List renders through components/module_list.js (green done / white todo).
        const layout = el('div', 'module-layout');
        const listPane = el('div', 'module-list-pane');
        const listEl = el('div', 'module-list');
        listPane.appendChild(listEl);
        const detailPane = el('div', 'module-detail-pane');
        layout.appendChild(listPane);
        layout.appendChild(detailPane);
        container.appendChild(layout);

        const selectItem = (item, idx) => {
            renderModuleDetail(detailPane, {
                track, level, item, idx, total: items.length,
                emoji: o.emoji, game,
                onSubmitAnswer: o.onSubmitAnswer,
                onToggleComplete: () => {
                    // refresh list done-states + header counter, keep detail open
                    paintList();
                    paintHead();
                    const id = item.id || ('module-' + (idx + 1));
                    renderModuleDetail(detailPane, {
                        track, level, item, idx, total: items.length,
                        emoji: o.emoji, game,
                        onSubmitAnswer: o.onSubmitAnswer,
                        onToggleComplete: selectItemRefresh
                    });
                }
            });
            if (typeof o.onSelectModule === 'function') o.onSelectModule(item, idx);
        };
        const selectItemRefresh = (item, idx) => selectItem(item, idx);

        const paintList = () => {
            listEl.innerHTML = '';
            if (window.ModuleList && typeof window.ModuleList.renderList === 'function') {
                window.ModuleList.renderList(listEl, {
                    track, level, items,
                    fallbackEmoji: o.emoji,
                    selectedId: null,
                    onSelect: selectItem
                });
            } else {
                items.forEach((item, idx) => listEl.appendChild(moduleCard(track, level, item, idx, {
                    emoji: o.emoji,
                    onSelectModule: selectItem
                })));
            }
        };
        const paintHead = () => {
            const pill = head.querySelector('[data-act="done-count"]');
            if (pill) pill.textContent = `${levelDoneCount(track, level, items)}/${items.length} done`;
        };

        if (items.length) {
            paintList();
            // Right side waits for a selection
            detailPane.innerHTML = '';
            detailPane.appendChild(el('p', 'caption', 'Select a module on the left to load its questions here.'));
        } else {
            for (let i = 0; i < 3; i++) listEl.appendChild(skeletonCard(i));
            listEl.appendChild(el('p', 'caption',
                `Modules land here next — ${esc(String(o.count || 0))} topics from lessons/ fill these slots.`));
            detailPane.innerHTML = '';
            detailPane.appendChild(el('p', 'caption', 'Module questions load here once content lands.'));
        }

        // Game banner
        const banner = el('div', 'game-banner');
        banner.innerHTML = `
            <div>
                <h4>🎮 ${esc(level)} Quiz Game</h4>
                <p class="caption">Single-form quiz across this level's topics.</p>
            </div>
        `;
        const play = el('button', 'btn-primary', 'Play Quiz →');
        play.addEventListener('click', () => {
            if (typeof o.onPlayGame === 'function') o.onPlayGame();
        });
        banner.appendChild(play);
        container.appendChild(banner);
    }

    // ---------------- Right-side Q&A detail (module selected in list) ----------------
    function renderModuleDetail(pane, opts) {
        if (!pane) return;
        const o = opts || {};
        const track = o.track || 'grammar';
        const level = o.level || '';
        const item = o.item || {};
        const idx = o.idx || 0;
        const total = o.total || 0;
        const id = item.id || ('module-' + (idx + 1));
        const done = isComplete(track, level, id);
        const hasQuestion = !!(item.question && String(item.question).trim());
        const hasSet = Array.isArray(item.questions) && item.questions.length > 0;
        pane.innerHTML = '';

        const wrap = el('div', 'module-detail');
        wrap.innerHTML = `
            <p class="caption">${esc(track.toUpperCase())} · ${esc(level)} · MODULE ${esc(String(idx + 1))}${total ? ' OF ' + esc(String(total)) : ''}</p>
            <h3>${esc(item.emoji || o.emoji || '📝')} ${esc(item.title || ('Module ' + (idx + 1)))}</h3>
            <p class="caption">${esc(item.desc || '')}</p>
        `;
        // Structured topic body lives in components/learning.js (fallback below)
        if (window.Learning && typeof window.Learning.renderTopicBody === 'function') {
            window.Learning.renderTopicBody(wrap, {
                item, track, level, idx, total,
                emoji: o.emoji, game: o.game,
                onSubmitAnswer: o.onSubmitAnswer,
                onToggleComplete: o.onToggleComplete
            });
            pane.appendChild(wrap);
            return;
        }
        // Fallback when learning.js is unavailable (reuses hasQuestion/hasSet above)
        wrap.innerHTML += `
            ${Array.isArray(item.learn) && item.learn.length ? `<div class="module-learn">${item.learn.map(l => `<span class="caption">• ${esc(l)}</span>`).join('')}</div>` : ''}
            <div class="module-qa">
                ${hasSet ? `<p class="module-question">${esc(String(item.questions.length))} questions — tap one to reveal its answer.</p>`
                    : `<p class="module-question">${hasQuestion ? esc(item.question) : 'Questions from lessons/ land here next.'}</p>`}
                ${item.hint ? `<p class="caption">💡 ${esc(item.hint)}</p>` : ''}
            </div>
            <div class="module-single-actions"></div>
        `;
        const actions = wrap.querySelector('.module-single-actions');

        if (hasSet) {
            const list = el('ol', 'module-questions');
            item.questions.forEach((qq, qi) => {
                const li = el('li', 'module-question-item');
                const stars = '★'.repeat(Math.min(3, Math.max(1, qq.stars || 1)));
                li.innerHTML = `
                    <button class="module-question-q"><span class="q-stars">${stars}</span> ${esc(qq.q)}</button>
                    <p class="module-answer-key hidden"><strong>Answer:</strong> ${esc(qq.answer || '')}</p>
                `;
                li.querySelector('.module-question-q').addEventListener('click', () => {
                    li.querySelector('.module-answer-key').classList.toggle('hidden');
                    li.classList.toggle('open');
                });
                list.appendChild(li);
            });
            wrap.insertBefore(list, actions);
            if (item.outcome) {
                wrap.insertBefore(el('p', 'caption', `✅ ${esc(item.outcome)}`), actions);
            }
        }

        if (hasQuestion) {
            const area = el('div', 'module-answer');
            area.innerHTML = `
                <textarea placeholder="Write your answer here..." rows="4"></textarea>
                <div class="word-count"><span>0</span> words</div>
            `;
            const ta = area.querySelector('textarea');
            const wc = area.querySelector('.word-count span');
            ta.addEventListener('input', () => {
                const n = ta.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                wc.textContent = ta.value.trim() ? n : 0;
            });
            const submit = el('button', 'btn-primary', 'Get AI Feedback');
            submit.addEventListener('click', () => {
                if (typeof o.onSubmitAnswer === 'function') o.onSubmitAnswer(item, ta.value.trim(), ta);
            });
            area.appendChild(submit);
            wrap.appendChild(area);
        }

        const toggle = el('button', done ? 'btn-secondary' : 'btn-primary', done ? '✓ Completed — Undo' : 'Mark Complete ✓');
        toggle.addEventListener('click', () => {
            const nowDone = toggleComplete(track, level, id);
            if (typeof o.onToggleComplete === 'function') o.onToggleComplete(item, nowDone);
        });
        actions.appendChild(toggle);
        pane.appendChild(wrap);
    }

    // ---------------- Single module page (level/topic/) ----------------
    function renderModuleSingle(container, opts) {
        if (!container) return;
        const o = opts || {};
        const track = o.track || 'grammar';
        const level = o.level || '';
        const item = o.item || {};
        const id = item.id || ('module-' + ((o.idx || 0) + 1));
        const total = o.total || 0;
        const done = isComplete(track, level, id);
        container.innerHTML = '';

        const page = el('div', 'module-single');
        page.innerHTML = `
            <button class="link-back" data-act="back-modules">← ${esc(level)} modules</button>
            <p class="caption">${esc(track.toUpperCase())} · ${esc(level)} · MODULE ${esc(String((o.idx || 0) + 1))}${total ? ' OF ' + esc(String(total)) : ''}</p>
            <h3>${esc(item.emoji || o.emoji || '📝')} ${esc(item.title || 'Module')}</h3>
            <p class="caption">${esc(item.desc || '')}</p>
            <div class="module-single-body">
                <p class="caption">${esc(item.content || 'Questions from lessons/ land here next.')}</p>
            </div>
            <div class="module-single-actions"></div>
        `;
        page.querySelector('[data-act="back-modules"]').addEventListener('click', () => {
            if (typeof o.onBackModules === 'function') o.onBackModules();
        });

        // Structured topic body lives in components/learning.js (fallback below)
        if (window.Learning && typeof window.Learning.renderTopicBody === 'function') {
            window.Learning.renderTopicBody(page, {
                item, track, level, idx: (o.idx || 0), total,
                emoji: o.emoji, game: o.game,
                onSubmitAnswer: o.onSubmitAnswer,
                onToggleComplete: o.onToggleComplete
            });
            container.appendChild(page);
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const actions = page.querySelector('.module-single-actions');
        const toggle = el('button', done ? 'btn-secondary' : 'btn-primary', done ? '✓ Completed — Undo' : 'Mark Complete ✓');
        toggle.addEventListener('click', () => {
            const nowDone = toggleComplete(track, level, id);
            if (typeof o.onToggleComplete === 'function') o.onToggleComplete(item, nowDone);
        });
        actions.appendChild(toggle);
        container.appendChild(page);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.ModulePractice = {
        renderLevelModules,
        renderModuleSingle,
        getProgress,
        toggleComplete,
        isComplete
    };
})();
