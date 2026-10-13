/**
 * ==========================================================================
 * PRACTICE UI COMPONENTS — Card views (cards.js)
 * Reusable card builders for the Practice Arena. Markup lives here;
 * practiceUI.js only wires data + events. Styles: UI/css/practice.css.
 *
 * - createGrammarLevelCard : CEFR level card (thumbnail + desc + game teaser)
 * - createSubtopicButton   : generic subtopic button (other tracks)
 * Both fall back gracefully when escapeHtml is unavailable.
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

    /**
     * CEFR level card for the Grammar track.
     * @param {Object} opts { lv, sec, game, selected, onSelect }
     * lv: { level, title, desc, emoji, count, status }
     * sec: section override from practice/<track>/<LEVEL>.js (same shape)
     * game: { type } teaser shown on the card
     */
    function createGrammarLevelCard(opts) {
        const lv = (opts && opts.lv) || {};
        const sec = (opts && opts.sec) || {};
        const game = (opts && opts.game) || { type: 'quiz' };
        const desc = sec.desc || lv.desc || '';
        const count = (sec.count != null ? sec.count : lv.count) || 0;
        const status = sec.status || lv.status || 'ready';
        const soon = status === 'soon';

        const card = document.createElement('button');
        card.className = 'grammar-level-card'
            + (soon ? ' is-soon' : '')
            + (opts && opts.selected ? ' selected' : '');
        card.dataset.level = lv.level || '';
        card.disabled = !!soon;
        card.innerHTML = `
            <span class="grammar-level-thumb">
                <span class="grammar-level-code">${esc(lv.level)}</span>
                <span class="grammar-level-emoji">${esc(sec.emoji || lv.emoji || '📐')}</span>
            </span>
            <h4>${esc(lv.level)} · ${esc(sec.title || lv.title || '')}</h4>
            <span class="caption">${esc(desc)}</span>
            <span class="grammar-level-meta">
                <span class="grammar-level-count${soon ? ' soon' : ''}">${soon ? 'Coming soon' : count + ' topics'}</span>
                <span class="caption">🎮 ${esc(game.type || 'quiz')}</span>
            </span>
        `;
        if (!soon && opts && typeof opts.onSelect === 'function') {
            card.addEventListener('click', opts.onSelect);
        }
        return card;
    }

    /**
     * Generic subtopic button used by non-grammar tracks.
     * @param {Object} opts { sub, trackId, selected, onSelect }
     */
    function createSubtopicButton(opts) {
        const sub = (opts && opts.sub) || {};
        const trackId = (opts && opts.trackId) || 'grammar';
        const btn = document.createElement('button');
        btn.className = 'subtopic-btn track-' + trackId + ((opts && opts.selected) ? ' selected' : '');
        btn.innerHTML = `
            <span class="title">${esc(sub.title)}</span>
            <span class="desc">${esc(sub.desc)}</span>
        `;
        if (opts && typeof opts.onSelect === 'function') {
            btn.addEventListener('click', opts.onSelect);
        }
        return btn;
    }

    window.PracticeCards = {
        createGrammarLevelCard,
        createSubtopicButton
    };
})();
