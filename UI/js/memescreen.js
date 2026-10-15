/**
 * memescreen.js - AI Learning Meme Generator Component for Practice Arena & Speaking Arena
 * Provides:
 * - 1-meme-per-click generation via /api/meme/generate
 * - Live daily quota tracking (15 memes/day)
 * - 30-minute study break cooldown enforcement after 3 consecutive memes
 * - Interactive modal with full-size preview and educational jokes
 */

(function () {
    'use strict';

    const MEME_CATALOG = [
        {
            template: "woman-cat",
            top: "Teacher: You cannot just invent your own irregular verbs!",
            bottom: "Me: I eated, I sleeped, and I catched the bus",
            topic: "Irregular Verbs",
            caption: "Why conjugate when you can just add -ed to everything and hope for the best?"
        },
        {
            template: "gb",
            top: "Very good -> Exceptional -> Quintessentially sublime",
            bottom: "Me substituting every single basic word in IELTS Task 2",
            topic: "IELTS Lexical Resource",
            caption: "The examiner having to look up your 5-syllable synonyms in the Oxford Dictionary."
        },
        {
            template: "right",
            top: "I finished my 250-word IELTS essay in 12 minutes!",
            bottom: "You checked for subject-verb agreement, right? ... Right?",
            topic: "Essay Proofreading",
            caption: "When you finish with 20 minutes left and 35 missing plural 's' endings."
        },
        {
            template: "panik-kalm-panik",
            top: "Exam tomorrow: PANIK! Practiced with AI English Coach: KALM!",
            bottom: "Section 4 is an Australian lecture about marsupials: PANIK!",
            topic: "IELTS Listening Section 4",
            caption: "The audio has rain, rustling papers, and a cricket match in the background."
        },
        {
            template: "leo",
            top: "Successfully using 'Notwithstanding the aforementioned' casually",
            bottom: "Cheers to Band 9 fluency",
            topic: "Over-formal English",
            caption: "When you order coffee like you are addressing the United Nations General Assembly."
        },
        {
            template: "cheems",
            top: "English when typing online: Sophisticated & profound",
            bottom: "English when IELTS examiner stares at me: me no speak good",
            topic: "Speaking Test Pressure",
            caption: "Brain has temporarily left the chat."
        },
        {
            template: "facepalm",
            top: "Examiner: How long have you lived in your hometown?",
            bottom: "Me: Yes, I am live here since 20 years ago",
            topic: "Present Perfect Traps",
            caption: "The examiner's pen twitching slightly as they mark your grammatical range."
        },
        {
            template: "ams",
            top: "When the examiner asks 'What is your full name?'",
            bottom: "And you accidentally say 'I completely agree with this statement'",
            topic: "Speaking Test Anxiety",
            caption: "The rehearsed Task 2 essay template taking over your speech in Part 1."
        },
        {
            template: "db",
            top: "Me trying to master past perfect",
            bottom: "Phrasal verbs with 14 different meanings",
            topic: "Grammar Distractions",
            caption: "'Turn up', 'turn down', 'turn off', 'turn on'... please make it stop!"
        },
        {
            template: "drake",
            top: "Using simple everyday words",
            bottom: "Forcing Band 9 collocations into every single sentence",
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
            bottom: "If you only speak in one-word answers",
            topic: "Speaking Strategy",
            caption: "Examiner: Describe your hometown. Me: Yes."
        },
        {
            template: "buzz",
            top: "Linking words",
            bottom: "Linking words everywhere",
            topic: "Coherence & Cohesion",
            caption: "Furthermore, moreover, consequently, nevertheless, in a nutshell..."
        },
        {
            template: "doge",
            top: "much grammar very band 9",
            bottom: "such inversion wow conditional",
            topic: "Grammatical Accuracy",
            caption: "Rarely had such sophisticated inversion been witnessed by mortal ears."
        },
        {
            template: "disastergirl",
            top: "Me using 'plethora' correctly",
            bottom: "Examiner giving me a Band 8.5",
            topic: "Vocabulary Boost",
            caption: "A plethora of profound points impeccably presented."
        },
        {
            template: "spongebob",
            top: "Examiner: Tell me about yourself",
            bottom: "Me: Since the dawn of civilization humans have existed",
            topic: "Speaking Part 1",
            caption: "When you over-philosophize a simple question about your breakfast."
        },
        {
            template: "gru",
            top: "Study 50 grammar rules",
            bottom: "Forget every single one when examiner says hello",
            topic: "Exam Panic",
            caption: "Wait... what was my name in the present perfect tense again?"
        },
        {
            template: "wonka",
            top: "Please tell me more",
            bottom: "About how watching movies without subtitles made you fluent",
            topic: "Learning Myths",
            caption: "Passive watching isn't quite the same as active grammar drills."
        },
        {
            template: "fine",
            top: "Examiner: Describe a book that influenced you",
            bottom: "Me who has not read a book since 2018: This is fine",
            topic: "Speaking Part 2",
            caption: "Time to invent an award-winning novel in 60 seconds."
        }
    ];

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

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    let globalCountdownInterval = null;

    async function getStatus() {
        if (window.AIEC_API && typeof window.AIEC_API.getMemeStatus === 'function') {
            return await window.AIEC_API.getMemeStatus();
        }
        return {
            today_count: 0,
            daily_limit: 15,
            remaining_today: 15,
            in_cooldown: false,
            cooldown_remaining_seconds: 0
        };
    }

    async function syncAllBanners() {
        const st = await getStatus();
        if (!st) return;

        const banners = document.querySelectorAll('.aiec-meme-section-card');
        banners.forEach(b => {
            const usedEl = b.querySelector('.meme-used-count');
            if (usedEl) usedEl.textContent = st.today_count || 0;

            const btn = b.querySelector('.meme-generate-btn');
            const btnText = btn ? btn.querySelector('.meme-btn-text') : null;
            const cooldownBadge = b.querySelector('.meme-cooldown-badge');
            const countdownEl = b.querySelector('.meme-countdown-time');

            if (st.in_cooldown && st.cooldown_remaining_seconds > 0) {
                if (btn) btn.disabled = true;
                if (btnText) btnText.textContent = 'In 30m Break';
                if (cooldownBadge) cooldownBadge.style.display = 'inline-flex';
            } else if (st.remaining_today <= 0) {
                if (btn) btn.disabled = true;
                if (btnText) btnText.textContent = 'Daily Limit Reached (15/15)';
                if (cooldownBadge) cooldownBadge.style.display = 'none';
            } else {
                if (btn) btn.disabled = false;
                if (btnText) btnText.textContent = b.dataset.btnText || 'Generate Meme';
                if (cooldownBadge) cooldownBadge.style.display = 'none';
            }
        });

        if (st.in_cooldown && st.cooldown_remaining_seconds > 0) {
            startCountdown(st.cooldown_remaining_seconds);
        } else if (globalCountdownInterval) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
        }
    }

    function startCountdown(seconds) {
        if (globalCountdownInterval) clearInterval(globalCountdownInterval);
        let rem = seconds;

        const tick = () => {
            if (rem <= 0) {
                clearInterval(globalCountdownInterval);
                globalCountdownInterval = null;
                syncAllBanners();
                return;
            }
            const m = Math.floor(rem / 60);
            const s = rem % 60;
            const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            document.querySelectorAll('.meme-countdown-time').forEach(el => {
                el.textContent = str;
            });
            rem--;
        };

        tick();
        globalCountdownInterval = setInterval(tick, 1000);
    }

    async function triggerMemeGeneration(topic, originBtn) {
        const btnText = originBtn ? originBtn.querySelector('.meme-btn-text') : null;
        const oldText = btnText ? btnText.textContent : 'Generate Meme';

        if (originBtn) originBtn.disabled = true;
        if (btnText) btnText.textContent = '⚡ Cooking up meme...';

        let memesList = [];
        let statsData = null;

        if (window.AIEC_API && typeof window.AIEC_API.generateMeme === 'function') {
            try {
                const res = await window.AIEC_API.generateMeme(topic || 'English Learning', 1);
                if (res && res.rate_limited) {
                    const err = res.detail || {};
                    const msg = err.message || 'Meme limit or 30-min break reached. Please take a quick study break!';
                    alert(msg);
                    await syncAllBanners();
                    if (originBtn) originBtn.disabled = false;
                    if (btnText) btnText.textContent = oldText;
                    return;
                }
                if (res && res.memes && Array.isArray(res.memes) && res.memes.length > 0) {
                    memesList = res.memes;
                    statsData = res.stats;
                }
            } catch (e) {
                console.warn('[MemeScreen] API error, falling back to offline catalog', e);
            }
        }

        // Offline fallback
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

        if (btnText) btnText.textContent = oldText;
        if (originBtn) originBtn.disabled = false;

        openModal(memesList, statsData);
        await syncAllBanners();
    }

    function openModal(memesList, statsData) {
        const old = document.getElementById('aiecMemeModal');
        if (old) old.remove();

        const usedCount = (statsData && statsData.today_count) || 1;
        const dailyLimit = (statsData && statsData.daily_limit) || 15;
        const inCooldown = statsData && statsData.in_cooldown;

        const modal = document.createElement('div');
        modal.className = 'meme-modal-overlay';
        modal.id = 'aiecMemeModal';

        modal.innerHTML = `
            <div class="meme-modal-dialog">
                <div class="meme-modal-header">
                    <div class="meme-modal-title-wrap">
                        <span class="meme-tag">🎭 Learning Meme</span>
                        <h4>Your IELTS Study Break Meme</h4>
                    </div>
                    <button type="button" class="meme-modal-close" aria-label="Close">✕</button>
                </div>

                <div class="meme-gallery-grid" style="grid-template-columns: 1fr; width: 100%; margin: 0 auto;">
                    ${memesList.map(m => `
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

                <div class="meme-modal-cooldown-notice">
                    <span>🎯 <strong>Quota:</strong> ${usedCount}/${dailyLimit} used today ${inCooldown ? '• ⏳ <strong>30-Minute Break Active</strong>' : ''}</span>
                </div>

                <div class="meme-modal-footer">
                    <span class="caption">1 meme per click • Laugh, refresh & get back to practice!</span>
                    <button type="button" class="meme-back-btn">Back to Practice</button>
                </div>
            </div>
        `;

        modal.querySelector('.meme-modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.meme-back-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    function createBannerHtml(cfg) {
        return `
            <div class="meme-fun-banner aiec-meme-section-card ${cfg.themeClass || ''}" data-btn-text="${esc(cfg.btnText || 'Generate Meme')}">
                <div class="meme-banner-left">
                    <span class="meme-banner-badge">${esc(cfg.badgeText || '✨ Take a break')}</span>
                    <h3 class="meme-banner-title">${esc(cfg.title || 'Tired? Want some fun?')}</h3>
                    <p class="meme-banner-subtitle">${esc(cfg.subtitle || 'Generate hilarious AI learning memes! (1 meme per click • 15 memes/day • 30-min break after 3 memes)')}</p>
                    <div class="meme-status-pills">
                        <span class="meme-quota-badge">🎯 <strong class="meme-used-count">0</strong>/15 memes used today</span>
                        <span class="meme-cooldown-badge" style="display: none;">⏳ Cooldown: <strong class="meme-countdown-time">30:00</strong></span>
                    </div>
                </div>
                <div class="meme-banner-right">
                    <button type="button" class="meme-generate-btn aiec-gen-meme-btn">
                        <span class="meme-btn-icon">⚡</span>
                        <span class="meme-btn-text">${esc(cfg.btnText || 'Generate Meme')}</span>
                    </button>
                </div>
            </div>
        `;
    }

    function mountBanners() {
        // 1. Practice Arena Meme Section
        const practiceContainer = document.getElementById('practiceMemeContainer');
        if (practiceContainer && !practiceContainer.hasChildNodes()) {
            practiceContainer.innerHTML = createBannerHtml({
                badgeText: '✨ Study Break • AI Meme Generator',
                title: 'Tired of drills? Generate a Learning Meme! 🎭',
                subtitle: 'Laugh off grammar mistakes and vocabulary traps with instant funny English memes! (1 meme per click • 15/day)',
                btnText: 'Generate Meme',
                themeClass: 'practice-meme-theme'
            });

            const btn = practiceContainer.querySelector('.aiec-gen-meme-btn');
            if (btn) {
                btn.addEventListener('click', () => triggerMemeGeneration('English Grammar & IELTS Drills', btn));
            }
        }

        // 2. Speaking Arena Meme Section
        const speakingContainer = document.getElementById('speakingMemeContainer');
        if (speakingContainer && !speakingContainer.hasChildNodes()) {
            speakingContainer.innerHTML = createBannerHtml({
                badgeText: '🎙️ Pre-Exam Chill • AI Meme Generator',
                title: 'Nervous before speaking? Take a 2-minute meme break! 🎭',
                subtitle: 'Laugh off pronunciation jitters and speaking test pressure with funny AI English memes! (1 meme per click • 15/day)',
                btnText: 'Generate Meme',
                themeClass: 'speaking-meme-theme'
            });

            const btn = speakingContainer.querySelector('.aiec-gen-meme-btn');
            if (btn) {
                btn.addEventListener('click', () => triggerMemeGeneration('IELTS Speaking Test Anxiety', btn));
            }
        }

        syncAllBanners();
    }

    window.AIEC_MemeScreen = {
        init: mountBanners,
        sync: syncAllBanners,
        generate: triggerMemeGeneration
    };

    window.addEventListener('aiec-route-changed', mountBanners);
    window.addEventListener('popstate', mountBanners);
    window.addEventListener('hashchange', mountBanners);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountBanners);
    } else {
        mountBanners();
    }
})();
