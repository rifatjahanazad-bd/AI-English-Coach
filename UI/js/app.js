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
});

function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Navigation between Chat, Practice, and Speaking Test
function initNavigation() {
    const pages = {
        chat: document.getElementById('pageChat'),
        practice: document.getElementById('pagePractice'),
        test: document.getElementById('pageTest')
    };

    const sideTabs = document.querySelectorAll('.side-tab');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');

    function switchPage(pageName) {
        if (!pages[pageName]) return;

        // Switch visible page
        Object.values(pages).forEach(p => p.classList.remove('active'));
        pages[pageName].classList.add('active');

        // Update active tab styles
        sideTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.page === pageName));
        bottomNavItems.forEach(tab => tab.classList.toggle('active', tab.dataset.page === pageName));

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

    sideTabs.forEach(tab => {
        tab.addEventListener('click', () => switchPage(tab.dataset.page));
    });

    bottomNavItems.forEach(tab => {
        tab.addEventListener('click', () => switchPage(tab.dataset.page));
    });
}
