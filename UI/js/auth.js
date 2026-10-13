/**
 * ==========================================================================
 * AUTH & PROGRESSION CONTROLLER (auth.js)
 * Manages user authentication state (Guest vs Logged In Member),
 * unlock logic for level modules, and user-facing unlock modals.
 *
 * Rules:
 * - Logged in members: ALL modules across all levels are unlocked!
 * - Guest / Logged out:
 *     - Module 1 of each level is always free & unlocked.
 *     - Next module unlocks when previous module is completed (or submitted).
 *     - Or by creating an account / logging in.
 * ==========================================================================
 */
(function () {
    var AUTH_KEY = 'aiec_auth_user_v1';

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function isLoggedIn() {
        var u = getUser();
        return !!(u && u.isLoggedIn);
    }

    function login(name) {
        var u = {
            name: name || 'Alex',
            isLoggedIn: true,
            loggedAt: Date.now()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(u));
        updateHeaderUI();
        window.dispatchEvent(new CustomEvent('aiec-auth-changed', { detail: u }));
        return u;
    }

    function logout() {
        localStorage.removeItem(AUTH_KEY);
        updateHeaderUI();
        window.dispatchEvent(new CustomEvent('aiec-auth-changed', { detail: { isLoggedIn: false } }));
    }

    function updateHeaderUI() {
        var userBtn = document.getElementById('userAuthBtn');
        var avatar = document.getElementById('userAvatar');
        var statusText = document.getElementById('userStatusText');
        if (!userBtn || !avatar || !statusText) return;

        if (isLoggedIn()) {
            var u = getUser();
            avatar.textContent = (u.name ? u.name.charAt(0).toUpperCase() : 'A');
            statusText.textContent = 'Hi, ' + (u.name || 'Alex') + ' 👋';
            userBtn.title = 'Logged in as ' + (u.name || 'Alex') + ' (All modules unlocked). Tap to switch.';
            userBtn.classList.add('member-active');
            userBtn.classList.remove('guest-active');
        } else {
            avatar.textContent = '👤';
            statusText.textContent = 'Guest (Sign in)';
            userBtn.title = 'Guest mode: Module 1 free. Tap to sign in and unlock all modules.';
            userBtn.classList.add('guest-active');
            userBtn.classList.remove('member-active');
        }
    }

    // Modal builder helper
    function closeActiveModal() {
        var existing = document.getElementById('aiecAuthModal');
        if (existing) existing.remove();
    }

    function showAuthModal() {
        closeActiveModal();
        var logged = isLoggedIn();
        var u = getUser();
        var modal = document.createElement('div');
        modal.id = 'aiecAuthModal';
        modal.className = 'aiec-modal-overlay';
        modal.innerHTML = `
            <div class="aiec-modal-card">
                <button class="aiec-modal-close" data-act="close">&times;</button>
                <div class="aiec-modal-icon">${logged ? '🎓' : '✨'}</div>
                <h3>${logged ? 'Member Account' : 'Sign In or Continue as Guest'}</h3>
                <p class="caption">
                    ${logged
                        ? 'You are signed in as <strong>' + (u.name || 'Alex') + '</strong>. All CEFR level modules and speed exercises are fully unlocked!'
                        : 'Guest users can practice <strong>Module 1 free</strong> in every level. To unlock subsequent modules, practice sequentially or sign in to unlock everything instantly!'}
                </p>
                <div class="aiec-modal-actions">
                    ${logged
                        ? '<button class="btn-secondary" data-act="logout">Switch to Guest Mode</button>'
                        : '<button class="btn-primary" data-act="login">Sign In as Alex (Unlock All) →</button>'}
                    <button class="btn-secondary" data-act="close">${logged ? 'Close' : 'Continue as Guest'}</button>
                </div>
            </div>
        `;

        modal.querySelectorAll('[data-act="close"]').forEach(function(b) {
            b.addEventListener('click', closeActiveModal);
        });

        var loginBtn = modal.querySelector('[data-act="login"]');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                login('Alex');
                closeActiveModal();
            });
        }

        var logoutBtn = modal.querySelector('[data-act="logout"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                logout();
                closeActiveModal();
            });
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeActiveModal();
        });

        document.body.appendChild(modal);
    }

    function showLockedModal(targetModuleTitle, prevModuleTitle, onGoPrev) {
        closeActiveModal();
        var modal = document.createElement('div');
        modal.id = 'aiecAuthModal';
        modal.className = 'aiec-modal-overlay';
        modal.innerHTML = `
            <div class="aiec-modal-card">
                <button class="aiec-modal-close" data-act="close">&times;</button>
                <div class="aiec-modal-icon">🔒</div>
                <h3>${targetModuleTitle || 'This Module'} is Locked</h3>
                <p class="caption" style="line-height: 1.55; margin-bottom: 12px;">
                    Guest users unlock modules one by one. To access this topic:
                </p>
                <div class="aiec-unlock-options">
                    <div class="aiec-unlock-option">
                        <span class="option-num">1</span>
                        <span>Complete <strong>${prevModuleTitle || 'the previous module'}</strong> answers to unlock this step.</span>
                    </div>
                    <div class="aiec-unlock-option">
                        <span class="option-num">2</span>
                        <span>Or sign in to unlock <strong>all 20+ modules</strong> right now!</span>
                    </div>
                </div>
                <div class="aiec-modal-actions" style="margin-top: 18px;">
                    <button class="btn-primary" data-act="login">Sign In & Unlock All →</button>
                    <button class="btn-secondary" data-act="prev">Practice ${prevModuleTitle || 'Previous Module'}</button>
                </div>
            </div>
        `;

        modal.querySelectorAll('[data-act="close"]').forEach(function(b) {
            b.addEventListener('click', closeActiveModal);
        });

        var loginBtn = modal.querySelector('[data-act="login"]');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                login('Alex');
                closeActiveModal();
            });
        }

        var prevBtn = modal.querySelector('[data-act="prev"]');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                closeActiveModal();
                if (typeof onGoPrev === 'function') onGoPrev();
            });
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeActiveModal();
        });

        document.body.appendChild(modal);
    }

    document.addEventListener('DOMContentLoaded', function () {
        updateHeaderUI();
        var userBtn = document.getElementById('userAuthBtn');
        if (userBtn) {
            userBtn.addEventListener('click', showAuthModal);
        }
    });

    window.AIEC_Auth = {
        getUser: getUser,
        isLoggedIn: isLoggedIn,
        login: login,
        logout: logout,
        updateHeaderUI: updateHeaderUI,
        showAuthModal: showAuthModal,
        showLockedModal: showLockedModal
    };
})();
