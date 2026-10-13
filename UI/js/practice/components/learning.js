/**
 * ==========================================================================
 * PRACTICE UI COMPONENTS — Learning topic view (learning.js)
 * Structured loader for each module's topics. Every topic renders as:
 *   1. Learn section   ("Today you will learn" points)
 *   2. Question set    (stars + tap-to-reveal answers, or Q&A answer box)
 *   3. Outcome         ("Can you do it?" line)
 *   4. Actions         (Mark Complete toggle, AI feedback submit)
 * Used by modulepractice.js (side detail + single page).
 * Styles: UI/css/practice.css (section 8. MODULE VIEW).
 *
 * API: window.Learning.renderTopicBody(parent, ctx)
 * ctx: { item, track, level, idx, total, emoji, game,
 *        onSubmitAnswer(item, text), onToggleComplete(item, done) }
 * item: { id, title, desc, learn[], questions[{q, stars, answer}],
 *         question, hint, outcome, content }
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

    function flipDone(track, level, id) {
        if (window.ModulePractice && typeof window.ModulePractice.toggleComplete === 'function') {
            return window.ModulePractice.toggleComplete(track, level, id);
        }
        return false;
    }

    // 1. Learn section
    function learnSection(item) {
        if (!Array.isArray(item.learn) || !item.learn.length) return null;
        const box = el('div', 'topic-section');
        box.innerHTML = `<p class="topic-section-title">Today you will learn</p>`;
        const list = el('div', 'module-learn');
        item.learn.forEach((l) => list.appendChild(el('span', 'caption', `• ${esc(l)}`)));
        box.appendChild(list);
        return box;
    }

    // 2a. Smart question set (stars + tap-to-reveal)
    function questionSet(item) {
        if (!Array.isArray(item.questions) || !item.questions.length) return null;
        const box = el('div', 'topic-section');
        box.innerHTML = `<p class="topic-section-title">Questions (${esc(String(item.questions.length))}) — tap one to reveal its answer</p>`;
        const list = el('ol', 'module-questions');
        item.questions.forEach((qq) => {
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
        box.appendChild(list);
        return box;
    }

    // 2b. Single open question + answer box (tracks without a set yet)
    function openQuestion(item, ctx) {
        const hasQuestion = !!(item.question && String(item.question).trim());
        if (hasQuestion && Array.isArray(item.questions) && item.questions.length) return null;
        const box = el('div', 'topic-section');
        box.innerHTML = `
            <p class="topic-section-title">Your turn</p>
            <div class="module-qa">
                <p class="module-question">${hasQuestion ? esc(item.question) : 'Questions from lessons/ land here next.'}</p>
                ${item.hint ? `<p class="caption">💡 ${esc(item.hint)}</p>` : ''}
            </div>
        `;
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
                if (ctx && typeof ctx.onSubmitAnswer === 'function') ctx.onSubmitAnswer(item, ta.value.trim(), ta);
            });
            area.appendChild(submit);
            box.appendChild(area);
        }
        return box;
    }

    // 3. Outcome + 4. Actions
    function outcomeLine(item) {
        if (!item.outcome) return null;
        return el('p', 'caption', `✅ ${esc(item.outcome)}`);
    }

    function actionsRow(ctx, item, id) {
        const row = el('div', 'module-single-actions');
        const done = doneOf(ctx.track, ctx.level, id);
        const toggle = el('button', done ? 'btn-secondary' : 'btn-primary', done ? '✓ Completed — Undo' : 'Mark Complete ✓');
        toggle.addEventListener('click', () => {
            const nowDone = flipDone(ctx.track, ctx.level, id);
            if (typeof ctx.onToggleComplete === 'function') ctx.onToggleComplete(item, nowDone);
        });
        row.appendChild(toggle);

        // If completed and there is a next module, offer instant progression
        if (done && (ctx.idx + 1) < ctx.total) {
            const nextBtn = el('button', 'btn-primary next-module-btn', `Continue to Module ${ctx.idx + 2} →`);
            nextBtn.addEventListener('click', () => {
                if (typeof ctx.onGoNextModule === 'function') {
                    ctx.onGoNextModule(ctx.idx + 1);
                }
            });
            row.appendChild(nextBtn);
        }

        return row;
    }

    // Full structured topic body — sections 1-4 in order
    function renderTopicBody(parent, ctx) {
        const c = ctx || {};
        const item = c.item || {};
        const idx = c.idx || 0;
        const id = item.id || ('module-' + (idx + 1));
        const done = doneOf(c.track, c.level, id);

        const learn = learnSection(item);
        if (learn) parent.appendChild(learn);

        const set = questionSet(item);
        if (set) parent.appendChild(set);
        else {
            const open = openQuestion(item, c);
            if (open) parent.appendChild(open);
        }

        const outcome = outcomeLine(item);
        if (outcome) parent.appendChild(outcome);

        if (done && (idx + 1) < c.total) {
            const banner = el('div', 'module-unlocked-banner');
            banner.innerHTML = `
                <span class="unlock-icon">🎉</span>
                <span class="caption"><strong>Module ${idx + 1} Complete!</strong> Module ${idx + 2} is now unlocked.</span>
            `;
            parent.appendChild(banner);
        }

        parent.appendChild(actionsRow(c, item, id));
    }

    window.Learning = { renderTopicBody };
})();
