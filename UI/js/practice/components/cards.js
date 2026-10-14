/**
 * ==========================================================================
 * PRACTICE UI COMPONENTS — Card views (cards.js)
 * Reusable card builders for the Practice Arena. Markup lives here;
 * practiceUI.js only wires data + events. Styles: UI/css/practice.css.
 *
 * - createGrammarLevelCard : CEFR level card (rich playful thumbnail + desc + game teaser)
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
     * Returns rich, playful SVG vector art for each CEFR level
     * inspired by modern educational mobile apps.
     */
    function getLevelSvg(level) {
        const key = String(level || '').trim().toUpperCase();

        if (key === 'A1') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <!-- Smiling Sun -->
                <circle cx="28" cy="24" r="14" fill="#FDE047"/>
                <circle cx="24" cy="22" r="1.8" fill="#78350F"/>
                <circle cx="32" cy="22" r="1.8" fill="#78350F"/>
                <path d="M26 27 Q28 29 30 27" stroke="#78350F" stroke-width="1.2" stroke-linecap="round" fill="none"/>
                <!-- Cloud -->
                <path d="M125 24 Q132 16 142 20 Q150 18 152 26 Q156 30 150 34 L122 34 Q118 30 120 26 Q120 22 125 24 Z" fill="#FFFFFF" opacity="0.85"/>
                <!-- Sprout -->
                <path d="M115 65 Q115 50 110 42 Q105 38 98 42 Q106 48 111 50 Q112 58 113 65 Z" fill="#22C55E"/>
                <path d="M115 52 Q122 46 128 48 Q125 56 116 57 Z" fill="#16A34A"/>
                <!-- 3D ABC Blocks -->
                <rect x="36" y="42" width="26" height="26" rx="5" fill="#EF4444"/>
                <rect x="36" y="42" width="26" height="5" rx="2" fill="#F87171"/>
                <text x="49" y="61" font-family="'Fredoka', 'Nunito', sans-serif" font-weight="700" font-size="16" fill="#FFFFFF" text-anchor="middle">A</text>
                <rect x="66" y="36" width="28" height="28" rx="5" fill="#3B82F6"/>
                <rect x="66" y="36" width="28" height="5" rx="2" fill="#60A5FA"/>
                <text x="80" y="56" font-family="'Fredoka', 'Nunito', sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">B</text>
                <rect x="52" y="54" width="24" height="24" rx="5" fill="#10B981"/>
                <rect x="52" y="54" width="24" height="4" rx="2" fill="#34D399"/>
                <text x="64" y="71" font-family="'Fredoka', 'Nunito', sans-serif" font-weight="700" font-size="15" fill="#FFFFFF" text-anchor="middle">C</text>
            </svg>`;
        }

        if (key === 'A2') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <!-- Background Leaves -->
                <path d="M15 65 C15 45, 35 40, 45 60 C35 65, 20 70, 15 65 Z" fill="#059669" opacity="0.6"/>
                <path d="M145 65 C145 45, 125 40, 115 60 C125 65, 140 70, 145 65 Z" fill="#059669" opacity="0.6"/>
                <!-- Chat Bubble -->
                <rect x="25" y="16" width="40" height="24" rx="10" fill="#FFFFFF"/>
                <polygon points="40,40 46,40 40,46" fill="#FFFFFF"/>
                <text x="45" y="32" font-family="'Fredoka', 'Nunito', sans-serif" font-weight="700" font-size="11" fill="#059669" text-anchor="middle">Hi! ✨</text>
                <!-- Cute Bumblebee Mascot -->
                <ellipse cx="78" cy="36" rx="10" ry="15" fill="#E0F2FE" opacity="0.9" transform="rotate(-25 78 36)"/>
                <ellipse cx="94" cy="36" rx="10" ry="15" fill="#E0F2FE" opacity="0.9" transform="rotate(25 94 36)"/>
                <ellipse cx="86" cy="48" rx="18" ry="14" fill="#FBBF24"/>
                <path d="M80 36 Q83 48 80 60 L85 60 Q88 48 85 36 Z" fill="#1F2937"/>
                <path d="M90 36 Q93 48 90 60 L94 59 Q97 48 94 37 Z" fill="#1F2937"/>
                <circle cx="75" cy="46" r="2.2" fill="#1F2937"/>
                <circle cx="72" cy="50" r="2.5" fill="#F472B6" opacity="0.6"/>
                <path d="M73 52 Q76 55 78 52" stroke="#1F2937" stroke-width="1.2" stroke-linecap="round" fill="none"/>
                <path d="M76 38 Q74 30 70 32" stroke="#1F2937" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                <circle cx="70" cy="32" r="1.5" fill="#1F2937"/>
            </svg>`;
        }

        if (key === 'B1') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <!-- Clouds -->
                <path d="M10 50 Q18 42 28 46 Q36 44 38 52 L8 52 Z" fill="#FFFFFF" opacity="0.8"/>
                <path d="M120 40 Q130 30 142 35 Q150 33 154 42 L115 42 Z" fill="#FFFFFF" opacity="0.8"/>
                <!-- Green hill -->
                <circle cx="25" cy="85" r="28" fill="#15803D"/>
                <circle cx="135" cy="85" r="30" fill="#166534"/>
                <polygon points="25,56 19,68 31,68" fill="#14532D"/>
                <!-- Hot Air Balloon -->
                <ellipse cx="80" cy="32" rx="20" ry="24" fill="#EF4444"/>
                <path d="M70 12 C75 22 75 42 70 52 C76 54 84 54 90 52 C85 42 85 22 90 12 Z" fill="#FBBF24"/>
                <ellipse cx="80" cy="32" rx="7" ry="24" fill="#3B82F6"/>
                <line x1="74" y1="56" x2="76" y2="63" stroke="#78350F" stroke-width="1.2"/>
                <line x1="86" y1="56" x2="84" y2="63" stroke="#78350F" stroke-width="1.2"/>
                <rect x="74" y="63" width="12" height="9" rx="2" fill="#D97706"/>
                <polygon points="108,18 110,23 115,23 111,26 113,31 108,28 103,31 105,26 101,23 106,23" fill="#FEF08A"/>
            </svg>`;
        }

        if (key === 'B1+' || key === 'B1PLUS') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <!-- Smoke puffs -->
                <circle cx="68" cy="68" r="14" fill="#FFFFFF" opacity="0.85"/>
                <circle cx="82" cy="70" r="16" fill="#FFFFFF" opacity="0.9"/>
                <circle cx="96" cy="68" r="12" fill="#FFFFFF" opacity="0.85"/>
                <!-- Stars -->
                <circle cx="30" cy="22" r="2" fill="#FEF08A"/>
                <polygon points="135,16 137,20 141,20 138,23 139,27 135,24 131,27 132,23 129,20 133,20" fill="#FEF08A"/>
                <!-- Rocket -->
                <g transform="translate(62, 8)">
                    <polygon points="14,48 22,48 18,58" fill="#F97316"/>
                    <polygon points="15,48 21,48 18,54" fill="#FEF08A"/>
                    <polygon points="4,46 14,34 14,46" fill="#0284C7"/>
                    <polygon points="32,46 22,34 22,46" fill="#0284C7"/>
                    <path d="M18 4 C28 12 28 44 28 46 L8 46 C8 44 8 12 18 4 Z" fill="#FFFFFF"/>
                    <path d="M18 4 C24 9 26 18 26 18 L10 18 C10 18 12 9 18 4 Z" fill="#EF4444"/>
                    <circle cx="18" cy="28" r="5.5" fill="#0284C7"/>
                    <circle cx="18" cy="28" r="3.5" fill="#38BDF8"/>
                </g>
            </svg>`;
        }

        if (key === 'B2') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <path d="M25 18 A6 6 0 0 0 31 24 A8 8 0 0 1 25 18 Z" fill="#FEF08A"/>
                <circle cx="130" cy="20" r="2" fill="#FEF08A"/>
                <!-- Mountain Peaks -->
                <polygon points="45,72 15,72 30,42" fill="#6D28D9"/>
                <polygon points="30,42 25,52 30,50 35,52" fill="#EDE9FE"/>
                <polygon points="145,72 95,72 120,38" fill="#5B21B6"/>
                <polygon points="120,38 112,49 120,46 128,49" fill="#EDE9FE"/>
                <!-- Center Glowing Lightbulb -->
                <circle cx="80" cy="36" r="22" fill="#FEF08A" opacity="0.3"/>
                <line x1="80" y1="10" x2="80" y2="15" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
                <line x1="62" y1="18" x2="66" y2="22" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
                <line x1="98" y1="18" x2="94" y2="22" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
                <path d="M72 36 C72 31 75 27 80 27 C85 27 88 31 88 36 C88 40 85 43 85 46 L75 46 C75 43 72 40 72 36 Z" fill="#FBBF24"/>
                <rect x="76" y="46" width="8" height="5" rx="1.5" fill="#94A3B8"/>
                <circle cx="80" cy="35" r="2" fill="#FFFFFF"/>
            </svg>`;
        }

        if (key === 'C1') {
            return `
            <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
                <circle cx="80" cy="38" r="30" fill="#FFE4E6" opacity="0.35"/>
                <polygon points="135,16 137,20 141,20 138,23 139,27 135,24 131,27 132,23 129,20 133,20" fill="#FFFFFF"/>
                <polygon points="25,24 27,27 30,27 28,29 29,32 25,30 22,32 23,29 20,27 24,27" fill="#FFFFFF"/>
                <!-- Center Diamond -->
                <g transform="translate(64, 18)">
                    <polygon points="16,6 26,6 32,15 0,15" fill="#38BDF8"/>
                    <polygon points="10,6 22,6 16,15" fill="#7DD3FC"/>
                    <polygon points="0,15 32,15 16,34" fill="#0284C7"/>
                    <polygon points="8,15 24,15 16,34" fill="#0369A1"/>
                    <polygon points="16,6 20,10 16,15" fill="#E0F2FE"/>
                </g>
                <!-- Soaring Wings -->
                <path d="M60 36 C45 28 32 30 22 42 C32 44 48 42 58 40 Z" fill="#FBBF24"/>
                <path d="M58 40 C44 38 34 44 26 52 C36 50 48 47 56 43 Z" fill="#D97706"/>
                <path d="M100 36 C115 28 128 30 138 42 C128 44 112 42 102 40 Z" fill="#FBBF24"/>
                <path d="M102 40 C116 38 126 44 134 52 C124 50 112 47 104 43 Z" fill="#D97706"/>
            </svg>`;
        }

        // C2 default / fallback
        return `
        <svg viewBox="0 0 160 85" fill="none" xmlns="http://www.w3.org/2000/svg" class="level-thumb-svg">
            <circle cx="80" cy="38" r="32" fill="#FEF08A" opacity="0.4"/>
            <polygon points="35,16 37,20 41,20 38,23 39,27 35,24 31,27 32,23 29,20 33,20" fill="#FEF08A"/>
            <polygon points="125,18 127,22 131,22 128,25 129,29 125,26 121,29 122,25 119,22 123,22" fill="#FEF08A"/>
            <!-- Crown -->
            <g transform="translate(56, 12)">
                <rect x="6" y="38" width="36" height="6" rx="2" fill="#991B1B"/>
                <rect x="4" y="34" width="40" height="6" rx="2" fill="#F59E0B"/>
                <circle cx="12" cy="37" r="1.8" fill="#EF4444"/>
                <circle cx="24" cy="37" r="1.8" fill="#3B82F6"/>
                <circle cx="36" cy="37" r="1.8" fill="#10B981"/>
                <polygon points="4,34 6,18 16,28 24,12 32,28 42,18 44,34" fill="#FBBF24"/>
                <polygon points="10,34 16,28 24,12 32,28 38,34" fill="#F59E0B"/>
                <circle cx="6" cy="18" r="3" fill="#EF4444"/>
                <circle cx="24" cy="12" r="3.5" fill="#3B82F6"/>
                <circle cx="42" cy="18" r="3" fill="#10B981"/>
            </g>
            <path d="M42 48 Q40 60 54 66" stroke="#15803D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M118 48 Q120 60 106 66" stroke="#15803D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        </svg>`;
    }

    /**
     * Helper to get CSS theme class name for a level
     */
    function getThemeClass(level) {
        const key = String(level || '').trim().toLowerCase();
        if (key === 'b1+' || key === 'b1plus') return 'card-theme-b1plus';
        return 'card-theme-' + key;
    }

    /**
     * CEFR level card for the Grammar track with modern mobile-inspired thumbnail.
     * @param {Object} opts { lv, sec, game, selected, onSelect }
     */
    function createGrammarLevelCard(opts) {
        const lv = (opts && opts.lv) || {};
        const sec = (opts && opts.sec) || {};
        const game = (opts && opts.game) || { type: 'quiz' };
        const desc = sec.desc || lv.desc || '';
        const count = (sec.count != null ? sec.count : lv.count) || 0;
        const status = sec.status || lv.status || 'ready';
        const soon = status === 'soon';
        const levelCode = lv.level || 'A1';
        const levelTitle = sec.title || lv.title || '';
        const themeClass = getThemeClass(levelCode);

        const card = document.createElement('button');
        card.className = 'grammar-level-card ' + themeClass
            + (soon ? ' is-soon' : '')
            + (opts && opts.selected ? ' selected' : '');
        card.dataset.level = levelCode;
        card.disabled = !!soon;

        card.innerHTML = `
            <div class="grammar-level-thumb">
                <div class="thumb-art-container">
                    ${getLevelSvg(levelCode)}
                </div>
                <div class="thumb-pill-banner">
                    <span class="thumb-pill-code">${esc(levelCode)}</span>
                    <span class="thumb-pill-title">${esc(levelTitle)}</span>
                </div>
            </div>
            <div class="grammar-card-body">
                <h4>${esc(levelCode)} · ${esc(levelTitle)}</h4>
                <p class="caption">${esc(desc)}</p>
                <div class="grammar-level-meta">
                    <span class="grammar-level-count${soon ? ' soon' : ''}">${soon ? 'Coming soon' : count + ' topics'}</span>
                    <span class="grammar-level-game-tag">🎮 ${esc(game.type || 'quiz')}</span>
                </div>
            </div>
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
        createSubtopicButton,
        getLevelSvg,
        getThemeClass
    };
})();
