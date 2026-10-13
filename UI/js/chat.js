/**
 * ==========================================================================
 * CHAT COACH LOGIC
 * Edit this file when changing:
 * - How chat messages are sent & received
 * - Bot responses & grammar corrections
 * - Typing indicators & quick suggestion chips
 * ==========================================================================
 */

function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');

    if (!chatInput || !sendBtn || !chatMessages || !typingIndicator) return;

    // Initial simulated delay for welcome typing indicator
    setTimeout(() => {
        typingIndicator.style.display = 'none';
    }, 2000);

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
        const correctionHtml = showCorrection ? `
            <div class="inline-feedback">
                <div>✏️ <span class="wrong">I want to practice</span> → <span class="correction">I'd like to practise</span></div>
                <div style="margin-top: 4px;">💡 <span class="suggestion">Try: "I'm keen to practise..."</span></div>
            </div>
        ` : '';

        row.innerHTML = `
            <div class="ai-avatar">🌿</div>
            <div class="bubble ai">
                <div class="ai-message-content">
                    <span>${escapeHtml(text)}</span>
                    ${correctionHtml}
                </div>
            </div>
        `;
        chatMessages.insertBefore(row, typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendBtn.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (!text) return;

        addUserMessage(text);
        chatInput.value = '';

        typingIndicator.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        setTimeout(() => {
            typingIndicator.style.display = 'none';
            if (text.toLowerCase().includes('grammar') || text.toLowerCase().includes('correct')) {
                addAIMessage("You wrote: 'I want to practice'. Here's a more natural version 👇", true);
            } else {
                addAIMessage("That's a good start! Try expanding with a reason or example. I'll help you improve. 😊");
            }
        }, 1200);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // Quick chips click-to-input
    document.querySelectorAll('.quick-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.textContent;
            chatInput.focus();
        });
    });
}
