/**
 * ==========================================================================
 * AIEC CLIENT ROUTER (router.js)
 * Manages client-side URL routing and path parameters for all sections:
 * - /home, /personalmentor
 * - /goal, /test, /test/:topicId
 * - /practice, /practice/:track, /practice/:track/:level, /practice/:track/:level/:classId
 *
 * Integrates directly with browser History API (pushState/popstate),
 * hash fallback, and backend API endpoints.
 * ==========================================================================
 */
(function () {
    const routes = [];
    let currentRoute = null;
    let isHashMode = window.location.protocol === 'file:';

    function compilePattern(pattern) {
        const paramNames = [];
        const regexStr = '^' + pattern
            .replace(/\/:([a-zA-Z0-9_]+)/g, (_, name) => {
                paramNames.push(name);
                return '/([^/]+)';
            })
            .replace(/\//g, '\\/') + '\\/?$';
        return {
            regex: new RegExp(regexStr, 'i'),
            paramNames
        };
    }

    function addRoute(pattern, name, handler) {
        const compiled = compilePattern(pattern);
        routes.push({
            pattern,
            name,
            regex: compiled.regex,
            paramNames: compiled.paramNames,
            handler
        });
    }

    function getCurrentPath() {
        if (window.location.hash && window.location.hash.startsWith('#/')) {
            return window.location.hash.slice(1);
        }
        let p = window.location.pathname || '/';
        // Normalize if served under /UI/
        if (p.startsWith('/UI/index.html')) p = '/';
        else if (p.startsWith('/UI/')) p = p.slice(3);
        if (!p.startsWith('/')) p = '/' + p;
        return p || '/';
    }

    function matchRoute(path) {
        const cleanPath = path.split('?')[0].split('#')[0] || '/';
        for (const r of routes) {
            const m = cleanPath.match(r.regex);
            if (m) {
                const params = {};
                r.paramNames.forEach((name, i) => {
                    params[name] = decodeURIComponent(m[i + 1]);
                });
                return { route: r, params, path: cleanPath };
            }
        }
        return null;
    }

    function navigate(path, options = {}) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        const current = getCurrentPath();
        if (cleanPath === current && !options.force) return;

        if (isHashMode) {
            window.location.hash = '#' + cleanPath;
        } else {
            if (options.replace) {
                window.history.replaceState({ path: cleanPath }, '', cleanPath);
            } else {
                window.history.pushState({ path: cleanPath }, '', cleanPath);
            }
            dispatch(cleanPath);
        }
    }

    function dispatch(path) {
        const p = path || getCurrentPath();
        const matched = matchRoute(p);

        if (matched) {
            currentRoute = matched;
            try {
                matched.route.handler(matched.params, matched);
            } catch (err) {
                console.error('[Router] Handler error for', p, err);
            }
        } else {
            // Default fallback route: /dashboard
            if (p !== '/dashboard' && p !== '/personalmentor') {
                console.warn('[Router] No matching route for', p, '-> fallback to /dashboard');
                navigate('/dashboard', { replace: true });
                return;
            }
        }

        window.dispatchEvent(new CustomEvent('aiec-route-changed', {
            detail: {
                path: p,
                route: matched ? matched.route.name : 'unknown',
                params: matched ? matched.params : {}
            }
        }));
    }

    // -------------------------------------------------------------------------
    // Route Definitions
    // -------------------------------------------------------------------------

    // 0. Dashboard (Overview)
    addRoute('/', 'dashboard', (params) => {
        switchPage('dashboard');
        if (window.renderDashboard && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }
    });
    addRoute('/dashboard', 'dashboard', (params) => {
        switchPage('dashboard');
        if (window.renderDashboard && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }
    });
    addRoute('/home', 'home_redirect', (params) => {
        navigate('/dashboard', { replace: true });
    });

    // 1. Personal Mentor (AI Chat Coach)
    addRoute('/personalmentor', 'personalmentor', (params) => {
        switchPage('chat');
    });

    // 3. Goal & Speaking Targets
    addRoute('/goal', 'goal', (params) => {
        switchPage('test');
        if (typeof window.showGoalView === 'function') {
            window.showGoalView();
        }
    });
    addRoute('/speaking', 'speaking', (params) => {
        switchPage('test');
        if (typeof window.showGoalView === 'function') {
            window.showGoalView();
        }
    });

    // 4. Speaking Test Topic Arena
    addRoute('/test', 'test-topics', (params) => {
        switchPage('test');
        const s1 = document.getElementById('testStep1');
        const s2 = document.getElementById('testStep2');
        const s3 = document.getElementById('testStep3');
        if (s1) s1.classList.remove('hidden');
        if (s2) s2.classList.add('hidden');
        if (s3) s3.classList.add('hidden');
    });

    // 5. Speaking Test Topic Simulation: /test/:topicId
    addRoute('/test/:topicId', 'test-recording', (params) => {
        switchPage('test');
        if (typeof window.selectTopicById === 'function') {
            window.selectTopicById(params.topicId);
        }
    });

    // 6. Practice Tracks Arena Overview: /practice
    addRoute('/practice', 'practice-tracks', (params) => {
        switchPage('practice');
        const p1 = document.getElementById('practiceStep1');
        const p2 = document.getElementById('practiceStep2');
        if (p1) p1.classList.remove('hidden');
        if (p2) p2.classList.add('hidden');
    });

    // 7. Practice Track Levels: /practice/:track (e.g. /practice/grammar)
    addRoute('/practice/:track', 'practice-levels', (params) => {
        switchPage('practice');
        if (typeof window.openTrackFromRoute === 'function') {
            window.openTrackFromRoute(params.track);
        }
    });

    // 8. Practice Level Syllabus: /practice/:track/:level (e.g. /practice/grammar/a1)
    addRoute('/practice/:track/:level', 'practice-syllabus', (params) => {
        switchPage('practice');
        if (typeof window.openLevelFromRoute === 'function') {
            window.openLevelFromRoute(params.track, params.level);
        }
    });

    // 9. Practice Single Class Quiz: /practice/:track/:level/:classId
    // e.g. /practice/grammar/a1/class02
    addRoute('/practice/:track/:level/:classId', 'practice-class', (params) => {
        switchPage('practice');
        if (typeof window.openClassFromRoute === 'function') {
            window.openClassFromRoute(params.track, params.level, params.classId);
        }
    });

    // -------------------------------------------------------------------------
    // Helper: switchPage handles tab active states
    // -------------------------------------------------------------------------
    function switchPage(pageName) {
        const pages = {
            dashboard: document.getElementById('pageDashboard'),
            chat: document.getElementById('pageChat'),
            practice: document.getElementById('pagePractice'),
            test: document.getElementById('pageTest')
        };
        if (!pages[pageName]) return;

        // Hide all pages completely and remove active class
        document.querySelectorAll('.main-content > .page').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });

        // Activate and display only the selected page
        pages[pageName].classList.add('active');
        pages[pageName].style.display = 'flex';

        // Update active tab buttons (sidebar & bottom nav)
        document.querySelectorAll('.side-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.page === pageName);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.page === pageName);
        });

        // If dashboard selected, trigger dynamic render
        if (pageName === 'dashboard' && window.renderDashboard && typeof window.renderDashboard === 'function') {
            window.renderDashboard();
        }

        // Notify active components (such as MemeScreen) of page change
        window.dispatchEvent(new CustomEvent('aiec-route-changed', { detail: { page: pageName } }));
    }

    // -------------------------------------------------------------------------
    // Event Listeners for History & Hash navigation
    // -------------------------------------------------------------------------
    window.addEventListener('popstate', () => {
        dispatch();
    });

    window.addEventListener('hashchange', () => {
        dispatch();
    });

    function init() {
        // Initial dispatch on document load
        dispatch();
    }

    window.AIEC_Router = {
        addRoute,
        navigate,
        dispatch,
        getCurrentPath,
        getCurrentRoute: () => currentRoute,
        init
    };
})();
