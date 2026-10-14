/**
 * ==========================================================================
 * APP CONTROLLER & NAVIGATION
 * This file boots up the application and coordinates:
 * - Lucide icon rendering
 * - Desktop sidebar tabs & Mobile bottom nav switching
 * - Page state management (Chat, Practice, Speaking Test)
 * 
 * Specialized logic is located in:
 * - data.js     : Lesson questions, subtopics & test prompts
 * - chat.js     : AI conversational coach & feedback logic
 * - practice.js : 4 Practice cards, lessons & exercises
 * - test.js     : Speaking test, voice recording & score reports
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    initNavigation();
    initChat();
    initPractice();
    initSpeakingTest();
    initFastPhrasesModal();

    // Boot router after components have initialized
    if (window.AIEC_Router) {
        window.AIEC_Router.init();
    }
});

function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Navigation between Dashboard, Chat, Practice, and Speaking Test
function initNavigation() {
    const pages = {
        dashboard: document.getElementById('pageDashboard'),
        chat: document.getElementById('pageChat'),
        practice: document.getElementById('pagePractice'),
        test: document.getElementById('pageTest')
    };

    const sideTabs = document.querySelectorAll('.side-tab');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const logoHomeBtn = document.getElementById('logoHomeBtn');

    function switchPage(pageName) {
        if (!pages[pageName]) return;

        // Switch visible page - hide all pages completely
        document.querySelectorAll('.main-content > .page').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        pages[pageName].classList.add('active');
        pages[pageName].style.display = 'flex';

        // Update active tab styles
        sideTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.page === pageName));
        bottomNavItems.forEach(tab => tab.classList.toggle('active', tab.dataset.page === pageName));

        // Trigger dashboard render if switching to dashboard
        if (pageName === 'dashboard' && window.renderDashboard && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }

        // Reset test to step 1 when navigating away
        if (pageName !== 'test') {
            const step1 = document.getElementById('testStep1');
            const step2 = document.getElementById('testStep2');
            const step3 = document.getElementById('testStep3');
            if (step1) step1.classList.remove('hidden');
            if (step2) step2.classList.add('hidden');
            if (step3) step3.classList.add('hidden');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleTabClick(tab) {
        const route = tab.dataset.route || (tab.dataset.page === 'dashboard' ? '/dashboard' : (tab.dataset.page === 'chat' ? '/personalmentor' : (tab.dataset.page === 'practice' ? '/practice' : '/goal')));
        if (window.AIEC_Router) {
            window.AIEC_Router.navigate(route);
        } else {
            switchPage(tab.dataset.page);
        }
    }

    sideTabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabClick(tab));
    });

    bottomNavItems.forEach(tab => {
        tab.addEventListener('click', () => handleTabClick(tab));
    });

    if (logoHomeBtn) {
        logoHomeBtn.addEventListener('click', () => {
            if (window.AIEC_Router) {
                window.AIEC_Router.navigate('/dashboard');
            } else {
                switchPage('dashboard');
            }
        });
    }

    window.switchAppPage = switchPage;
}

// Controller for In-App Fast Phrases Speed Game Modal
function initFastPhrasesModal() {
    const modal = document.getElementById('fastPhrasesModal');
    const iframe = document.getElementById('fastPhrasesFrame');
    const closeBtn = document.getElementById('closeFastPhrasesBtn');
    const launchBtns = document.querySelectorAll('.game-launch-btn, [data-action="play-fast-phrases"]');

    function openGame(e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (!modal || !iframe) return;
        const targetUrl = '/game/?v=' + Date.now();
        if (!iframe.src || iframe.src === 'about:blank' || !iframe.src.includes('/game/')) {
            iframe.src = targetUrl;
        }
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (window.lucide) lucide.createIcons();
    }

    function closeGame() {
        if (!modal || !iframe) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        iframe.src = 'about:blank';
    }

    launchBtns.forEach(btn => {
        btn.addEventListener('click', openGame);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeGame);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeGame();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closeGame();
        }
    });

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'fast-phrases-quit') {
            closeGame();
        }
    });

    window.openFastPhrasesGame = openGame;
    window.closeFastPhrasesGame = closeGame;
}

