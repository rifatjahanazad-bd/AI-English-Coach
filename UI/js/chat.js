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

    function generateClientFallbackReply(text) {
        const lower = (text || '').toLowerCase().trim();
        const words = lower.split(/\s+/).filter(Boolean);

        if (lower.includes('speak naturally') || (lower.includes('natural') && words.length <= 4)) {
            return "To sound naturally fluent in IELTS Speaking, use **discourse markers** like *'To be honest'*, *'Actually'*, or *'If I remember correctly'*. These buy you thinking time without unnatural pauses!\n\n**Quick Drill:** Answer this: *What is your favorite room in your house?* Start your answer with one of those phrases!";
        }

        if (lower.includes('real-life conversation') || (lower.includes('conversation') && words.length <= 4)) {
            return "Hi there! Welcome to the student cafe! ☕\n\nI'm your barista today. We have espresso, iced lattes, herbal teas, and warm blueberry muffins.\n\n**What can I get started for you today?** (Try ordering in 1-2 friendly sentences!)";
        }

        if (lower.includes('quick band boost') || (lower.includes('boost') && words.length <= 4)) {
            return "Here is your 1-minute **Band Boost Challenge**! ⚡\n\nInstead of saying *'It was very interesting'*, try using a higher-band collocation:\n👉 **'It was utterly captivating'** or **'It was deeply rewarding'**.\n\n**Your turn:** Rewrite this sentence using a stronger collocation: *'The movie was very good.'* Give it a shot!";
        }

        if (lower.includes('power vocabulary') || (lower.includes('vocabulary') && words.length <= 4)) {
            return "Here are 3 **Band 7+ power collocations** you can use across multiple IELTS topics:\n\n1. **Play an integral role** (instead of *is very important*)\n2. **Have a profound impact on** (instead of *changes a lot*)\n3. **Cope with mounting pressure** (instead of *deal with stress*)\n\n**Your turn:** Use ONE of these in a sentence about your studies or career!";
        }

        if (lower.includes('ielts') || lower.includes('practice') || lower.includes('practise') || lower.includes('speaking')) {
            return "Great choice! Let's do a quick IELTS Speaking Part 1 warm-up.\n\n**Examiner question:** *\"Do you prefer spending your free time indoors or outdoors?\"*\n\nGive an answer in 2-3 sentences: state your preference, then explain **why** using a connector like *'primarily because'* or *'on the other hand'*.";
        }

        return "That's an interesting point! In IELTS Speaking, expanding your thoughts is key to achieving Band 7+.\n\n**Follow-up question:** Could you give a specific example or explain *why* that is important to you? Try answering in 2-3 sentences.";
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
            if (window.AIEC_API && typeof window.AIEC_API.sendChatMessage === 'function') {
                const res = await window.AIEC_API.sendChatMessage(text);
                typingIndicator.style.display = 'none';

                if (res && res.reply) {
                    addAIMessage(res.reply);
                } else {
                    addAIMessage(generateClientFallbackReply(text));
                }
            } else {
                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    addAIMessage(generateClientFallbackReply(text));
                }, 600);
            }
        } catch (err) {
            console.error('[Chat Error]:', err);
            typingIndicator.style.display = 'none';
            addAIMessage(generateClientFallbackReply(text));
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
}
