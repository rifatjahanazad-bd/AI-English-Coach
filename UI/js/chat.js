/**
 * ==========================================================================
 * CHAT COACH LOGIC (UI/js/chat.js)
 * Connects the web UI to the backend AI IELTS Coach & Mentor:
 * - Real API integration (/api/chat) with streaming-like responsiveness
 * - SQLite chat history loading and synchronization
 * - Type-safe message bubbles and markdown formatting
 * - Animated typing indicator and quick suggestion chips
 * ==========================================================================
 */

function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');

    if (!chatInput || !sendBtn || !chatMessages || !typingIndicator) return;

    let isWaitingForResponse = false;

    // Helper: Safely format AI coach markdown text (bold, italics, line breaks, bullet points)
    function formatAIText(raw) {
        if (!raw) return '';
        // 1. Escape HTML to prevent injection
        let escaped = escapeHtml(raw);

        // 2. Bold: **text** -> <strong>text</strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 3. Italics: *text* -> <em>$1</em>
        escaped = escaped.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

        // 4. Bullet points: lines starting with - or *
        const lines = escaped.split('\n');
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                return `<div style="margin-left: 8px; margin-top: 2px;">• ${trimmed.substring(2)}</div>`;
            }
            return line;
        });

        // 5. Replace newlines with <br> (avoiding duplicate breaks around block divs)
        return formattedLines.join('<br>').replace(/<br><div/g, '<div').replace(/<\/div><br>/g, '</div>');
    }

    function addUserMessage(text) {
        const row = document.createElement('div');
        row.className = 'message-row user';
        row.innerHTML = `<div class="bubble user">${escapeHtml(text)}</div>`;
        chatMessages.insertBefore(row, typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addAIMessage(text, showCorrection = false) {
        const row = document.createElement('div');
        row.className = 'message-row ai';
        const formatted = formatAIText(text);

        row.innerHTML = `
            <div class="ai-avatar">🌿</div>
            <div class="bubble ai">
                <div class="ai-message-content">
                    <span>${formatted}</span>
                </div>
            </div>
        `;
        chatMessages.insertBefore(row, typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Load persistent history from SQLite database
    async function loadChatHistory() {
        if (!window.AIEC_API || typeof window.AIEC_API.getChatHistory !== 'function') {
            typingIndicator.style.display = 'none';
            return;
        }

        try {
            const history = await window.AIEC_API.getChatHistory();
            if (Array.isArray(history) && history.length > 0) {
                // Clear initial static mockup messages except the typing indicator
                const rows = chatMessages.querySelectorAll('.message-row:not(#typingIndicator)');
                rows.forEach(r => r.remove());

                history.forEach(item => {
                    if (item.sender === 'user') {
                        addUserMessage(item.message);
                    } else {
                        addAIMessage(item.message);
                    }
                });
            }
        } catch (e) {
            console.warn('[Chat UI] History sync failed, keeping initial prompt:', e);
        } finally {
            typingIndicator.style.display = 'none';
        }
    }


    // Send user message to Backend Chatbot
    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text || isWaitingForResponse) return;

        isWaitingForResponse = true;
        addUserMessage(text);
        chatInput.value = '';
        sendBtn.disabled = true;

        typingIndicator.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            let res = null;
            if (window.AIEC_API && typeof window.AIEC_API.sendChatMessage === 'function') {
                res = await window.AIEC_API.sendChatMessage(text);
            } else {
                const uid = (window.AIEC_Auth && typeof window.AIEC_Auth.getUser === 'function' && window.AIEC_Auth.getUser()?.id) || 'guest';
                const fetchRes = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: uid, message: text })
                });
                if (fetchRes.ok) res = await fetchRes.json();
            }

            typingIndicator.style.display = 'none';

            if (res && res.reply) {
                addAIMessage(res.reply);
            } else {
                addAIMessage("I'm having a brief connection delay reaching the AI tutor service. Please send your message again or try again in a moment! 😊");
            }
        } catch (err) {
            console.error('[Chat Error]:', err);
            typingIndicator.style.display = 'none';
            addAIMessage("I had a brief connection glitch. Please send your message again, I'm ready! 😊");
        } finally {
            isWaitingForResponse = false;
            sendBtn.disabled = false;
            chatInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendBtn.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Quick suggestion chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt || chip.textContent.trim();
            chatInput.value = prompt;
            handleSendMessage();
        });
    });

    // Initialize chat history on load
    loadChatHistory();

    // Reload chat history whenever user signs in or signs out
    window.addEventListener('aiec-auth-changed', () => {
        loadChatHistory();
    });
}
