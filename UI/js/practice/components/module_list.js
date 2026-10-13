/**
 * ==========================================================================
 * PRACTICE UI COMPONENTS — Module list (module_list.js)
 * Left-pane list for the module view: thumbnail + title + done/locked state.
 *
 * Progression Rules:
 * - Completed modules: marked green with ✓ Done badge (.is-done).
 * - Logged-in members: ALL modules are unlocked.
 * - Logged-out / Guest:
 *     - Module 1 (index 0) is unlocked for everyone.
 *     - Module N is locked (🔒 Locked) until Module N-1 is completed.
 *     - Clicking a locked module shows the unlock modal.
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

    function doneOf(track, level, id) {
        if (window.ModulePractice && typeof window.ModulePractice.isComplete === 'function') {
            return window.ModulePractice.isComplete(track, level, id);
        }
        return false;
    }

    function isModuleUnlocked(track, level, idx, items) {
        if (window.AIEC_Auth && window.AIEC_Auth.isLoggedIn()) return true;
        if (idx === 0) return true; // First module of every level is always unlocked
        const prevItem = items[idx - 1];
        if (!prevItem) return false;
        const prevId = prevItem.id || ('module-' + idx);
        return doneOf(track, level, prevId);
    }

    function renderList(container, opts) {
        if (!container) return null;
        const o = opts || {};
        const track = o.track || 'grammar';
        const level = o.level || '';
        const items = Array.isArray(o.items) ? o.items : [];
        container.innerHTML = '';

        let selectedEl = null;

        items.forEach((item, idx) => {
            const id = item.id || ('module-' + (idx + 1));
            const done = doneOf(track, level, id);
            const unlocked = isModuleUnlocked(track, level, idx, items);

            const card = document.createElement('div');
            card.className = 'class-collage-card'
                + (done ? ' is-done' : '')
                + (!unlocked ? ' is-locked' : ' is-unlocked')
                + (o.selectedId === id ? ' selected' : '');
            card.dataset.module = id;
            card.dataset.index = idx;

            let badgeHtml = '';
            if (done) {
                badgeHtml = '<span class="class-card-badge done">✓ Done</span>';
            } else if (!unlocked) {
                badgeHtml = '<span class="class-card-badge locked">🔒 Locked</span>';
            } else {
                badgeHtml = '<span class="class-card-badge ready">Ready</span>';
            }

            // Extract or format Class N number
            let classNumText = `Class ${idx + 1}`;
            let displayTitle = item.title || classNumText;
            if (displayTitle.toLowerCase().startsWith('class ')) {
                // Keep clean title part if formatted as "Class X: Title"
                const parts = displayTitle.split(':');
                if (parts.length > 1) {
                    classNumText = parts[0].trim();
                    displayTitle = parts.slice(1).join(':').trim();
                }
            }

            // Button label logic based on state
            let actionBtnText = 'Start';
            let actionBtnClass = 'btn-start';
            if (done) {
                actionBtnText = 'Review';
                actionBtnClass = 'btn-done';
            } else if (!unlocked) {
                actionBtnText = '🔒 Locked';
                actionBtnClass = 'btn-locked';
            } else if (o.selectedId === id) {
                actionBtnText = 'Continue';
                actionBtnClass = 'btn-continue';
            }

            card.innerHTML = `
                <div class="class-card-top">
                    <span class="class-card-thumb">${esc(item.emoji || o.fallbackEmoji || '🌱')}</span>
                    <span class="class-card-num">${esc(classNumText)}</span>
                    <div class="class-card-badge-wrap">${badgeHtml}</div>
                </div>
                <div class="class-card-body">
                    <h4 class="class-card-title">${esc(displayTitle)}</h4>
                    <p class="class-card-desc">${esc(item.desc || '')}</p>
                </div>
                <div class="class-card-footer">
                    <button type="button" class="class-card-action-btn ${actionBtnClass}">
                        ${actionBtnText}
                    </button>
                </div>
            `;

            // Card click behavior
            card.addEventListener('click', (e) => {
                if (!unlocked) {
                    const prevItem = items[idx - 1];
                    const prevTitle = prevItem ? (prevItem.title || ('Class ' + idx)) : ('Class ' + idx);
                    if (window.AIEC_Auth && typeof window.AIEC_Auth.showLockedModal === 'function') {
                        window.AIEC_Auth.showLockedModal(
                            item.title || ('Class ' + (idx + 1)),
                            prevTitle,
                            () => {
                                // Jump back to previous module to finish it
                                container.querySelectorAll('.class-collage-card').forEach(b => b.classList.remove('selected'));
                                const prevEl = container.querySelector(`[data-module="${prevItem.id || ('module-' + idx)}"]`);
                                if (prevEl) prevEl.classList.add('selected');
                                if (typeof o.onSelect === 'function') o.onSelect(prevItem, idx - 1);
                            }
                        );
                    }
                    return;
                }

                container.querySelectorAll('.class-collage-card').forEach(b => b.classList.remove('selected'));
                card.classList.add('selected');
                if (typeof o.onSelect === 'function') o.onSelect(item, idx);
            });

            if (o.selectedId === id) selectedEl = card;
            container.appendChild(card);
        });

        return selectedEl;
    }

    window.ModuleList = {
        renderList,
        isModuleUnlocked
    };
})();
