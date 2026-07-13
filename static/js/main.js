// ============================================================================
// ChatNex - Premium Main JS Client Script
// Handles theme, drawer overlays, local persistent states, and message streams.
// ============================================================================

// ==== DOM Elements ====
const input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatbox = document.getElementById('chatbox');
const header = document.getElementById('pageHeader');
const greeting = document.getElementById('greeting');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistory = document.getElementById('chatHistory');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');

// ==== Configuration ====
// Relative path routes chat calls directly to serverless Vercel function
const BACKEND_URL = "/api/chat";
const STORAGE_KEY = 'chatnex_chats_v2';
const CURRENT_CHAT_KEY = 'chatnex_current_chat_v2';

let chats = [];
let currentChatId = null;
let backdropOverlay = null;

// ==== Initialization ====
function init() {
    initTheme();
    loadChats();
    loadCurrentChat();
    setupMobileBackdrop();
    renderChatHistory();
    setupEventListeners();
    
    // If current chat has messages, display them; else show greeting
    if (currentChatId) {
        loadChat(currentChatId);
    } else {
        createNewChat();
    }
    
    // Animate and hide the spinner loading screen
    const screen = document.getElementById('loadingScreen');
    if (screen) {
        setTimeout(() => {
            screen.classList.add('fade-out');
        }, 600);
    }
}

// ==== Dark/Light Mode ====
function initTheme() {
    const activeTheme = localStorage.getItem('theme') || 'light';
    if (activeTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ==== Mobile Sidebar Setup ====
function setupMobileBackdrop() {
    backdropOverlay = document.createElement('div');
    backdropOverlay.className = 'sidebar-backdrop';
    document.querySelector('.app-container').appendChild(backdropOverlay);
    
    backdropOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdropOverlay.classList.remove('active');
    });
}

// ==== Chat Persistence Functions ====
function loadChats() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            chats = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading chats:', e);
            chats = [];
        }
    } else {
        chats = [];
    }
}

function saveChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function loadCurrentChat() {
    const stored = localStorage.getItem(CURRENT_CHAT_KEY);
    if (stored) {
        currentChatId = stored;
    }
}

function saveCurrentChat() {
    if (currentChatId) {
        localStorage.setItem(CURRENT_CHAT_KEY, currentChatId);
    } else {
        localStorage.removeItem(CURRENT_CHAT_KEY);
    }
}

function createNewChat() {
    const chatId = 'chat_' + Date.now();
    const newChat = {
        id: chatId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    currentChatId = chatId;
    saveChats();
    saveCurrentChat();
    renderChatHistory();
    
    // Clear UI layout
    chatbox.innerHTML = '';
    chatbox.classList.remove('active');
    greeting.classList.remove('hidden');
    
    // Focus typing box
    setTimeout(() => input.focus(), 50);
    return chatId;
}

function getCurrentChat() {
    if (!currentChatId) return null;
    return chats.find(c => c.id === currentChatId);
}

function updateChatTitle(firstMessage) {
    const chat = getCurrentChat();
    if (chat && (chat.title === 'New Chat' || chat.messages.length <= 2)) {
        chat.title = firstMessage.substring(0, 36) + (firstMessage.length > 36 ? '...' : '');
        chat.updatedAt = new Date().toISOString();
        saveChats();
        renderChatHistory();
    }
}

function saveMessage(sender, text) {
    const chat = getCurrentChat();
    if (!chat) return;
    
    chat.messages.push({
        sender: sender,
        text: text,
        timestamp: new Date().toISOString()
    });
    
    chat.updatedAt = new Date().toISOString();
    saveChats();
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    saveCurrentChat();
    
    // Clear chatbox screen
    chatbox.innerHTML = '';
    
    if (chat.messages && chat.messages.length > 0) {
        revealChatbox();
        chat.messages.forEach(msg => {
            addMessage(msg.sender, msg.text, false, false);
        });
    } else {
        chatbox.classList.remove('active');
        greeting.classList.remove('hidden');
    }
    
    renderChatHistory();
}

function deleteChat(chatId) {
    chats = chats.filter(c => c.id !== chatId);
    saveChats();
    
    if (currentChatId === chatId) {
        if (chats.length > 0) {
            loadChat(chats[0].id);
        } else {
            createNewChat();
        }
    } else {
        renderChatHistory();
    }
}

// ==== Rendering Chat List ====
function renderChatHistory() {
    if (chats.length === 0) {
        chatHistory.innerHTML = '<div class="chat-history-empty">No chats yet</div>';
        return;
    }
    
    chatHistory.innerHTML = chats.map(chat => {
        const isActive = chat.id === currentChatId;
        const date = new Date(chat.updatedAt);
        const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        return `
            <div class="chat-history-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
              <div class="chat-history-item-icon">💬</div>
              <div class="chat-history-item-text" title="${chat.title}">
                <div>${chat.title}</div>
                <div>${timeStr}</div>
              </div>
              <button class="chat-history-item-delete" data-chat-id="${chat.id}" aria-label="Delete talk">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
        `;
    }).join('');
    
    // Add Click listeners
    chatHistory.querySelectorAll('.chat-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.chat-history-item-delete')) {
                e.stopPropagation();
                const trgId = item.getAttribute('data-chat-id');
                if (confirm('Delete this conversation history?')) {
                    deleteChat(trgId);
                }
            } else {
                const trgId = item.getAttribute('data-chat-id');
                loadChat(trgId);
                // On mobile, close drawer after selection
                sidebar.classList.remove('mobile-open');
                backdropOverlay.classList.remove('active');
            }
        });
    });
}

// ==== HTML Formatter (Lightweight Markdown Parser) ====
function formatMessage(text) {
    if (!text) return '';
    
    // Safety escape
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code Blocks: ```code```
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, codeText) => {
        const codeTrimmed = codeText.trim();
        return `
            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span>code</span>
                <button class="copy-code-btn" onclick="copyCode(this)">Copy</button>
              </div>
              <pre><code>${codeTrimmed}</code></pre>
            </div>
        `;
    });

    
    // Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: var(--border-color-dim); padding: 0.15rem 0.3rem; border-radius: 4px; font-family: monospace; font-size: 0.875rem; border: 1px solid var(--border-color);">$1</code>');
    
    // Bold: **text**
    formatted = formatted.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    formatted = formatted.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');

    
    // Simple bullet list conversion
    const lines = formatted.split('\n');
    let inList = false;
    const listFormatted = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const inner = trimmed.substring(2);
            if (!inList) {
                inList = true;
                return '<ul style="margin-left: 1.25rem; margin-top: 0.35rem; list-style-type: disc;"><li>' + inner + '</li>';
            }
            return '<li>' + inner + '</li>';
        } else {
            if (inList) {
                inList = false;
                return '</ul>' + line;
            }
            return line;
        }
    });
    
    if (inList) {
        listFormatted.push('</ul>');
    }
    
    return listFormatted.join('<br>').replace(/<\/ul><br>/g, '</ul>').replace(/<br><ul>/g, '<ul>').replace(/<br><\/ul>/g, '</ul>');

}

// ==== Add bubble element to UI ====
function addMessage(sender, text, isTyping = false, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    
    const content = sender === 'bot' ? formatMessage(text) : text;
    msgDiv.innerHTML = `<div class="bubble">${content}</div>`;
    
    if (isTyping && sender === 'bot') {
        msgDiv.classList.add('typing');
    }
    
    chatbox.appendChild(msgDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
    
    if (save) {
        saveMessage(sender, text);
    }
    return msgDiv;
}

// ==== UI Visual Transitions ====
function revealChatbox() {
    greeting.classList.add('hidden');
    chatbox.classList.add('active');
    setTimeout(() => {
        chatbox.scrollTop = chatbox.scrollHeight;
    }, 50);
}

// ==== POST/Call Message to API ====
async function sendMessage() {
    const textVal = input.value.trim();
    if (!textVal) return;
    
    // Fallback: Create chat if absent
    if (!currentChatId || !getCurrentChat()) {
        createNewChat();
    }
    
    // Visual reveal
    if (!chatbox.classList.contains('active')) {
        revealChatbox();
    }
    
    // Render and store User message
    addMessage('user', textVal);
    updateChatTitle(textVal);
    
    // Prepare input resets
    input.value = '';
    sendBtn.disabled = true;
    input.disabled = true;
    
    // Create assistant typing spinner
    const typingIndicator = addMessage('bot', '', true, false);
    
    // Extract recent context list for stateless server processing
    const currentChatObj = getCurrentChat();
    const historyPayload = [];
    if (currentChatObj && currentChatObj.messages) {
        // Exclude user's latest message (already added to storage/sent in 'message')
        // Send max 8 previous history roles to save Vercel/Grok context token limits
        const histMsgs = currentChatObj.messages.slice(0, -1).slice(-8);
        histMsgs.forEach(m => {
            historyPayload.push({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            });
        });
    }
    
    try {
        const controller = new AbortController();
        const apiTimeout = setTimeout(() => controller.abort(), 20000); // 20s timeout limit
        
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: textVal,
                history: historyPayload,
                session_id: currentChatId
            }),
            signal: controller.signal
        });
        
        clearTimeout(apiTimeout);
        typingIndicator.remove();
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.reply) {
            addMessage('bot', data.reply);
        } else {
            addMessage('bot', '⚠️ Error: No reply from AI service.');
        }
        
    } catch (err) {
        try { typingIndicator.remove(); } catch(e){}
        console.error('Error fetching replies:', err);
        
        if (err.name === 'AbortError') {
            addMessage('bot', '⏱️ Request timed out. The server or API took too long to respond. Please try again.');
        } else {
            addMessage('bot', '🚨 Connection error. Failed to reach the assistant server. Make sure API key is configured.');
        }
    } finally {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
    }
}

// ==== Event Trigger Wiring ====
function setupEventListeners() {
    // Send Message Buttons
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // New Chat Button configuration
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        // On mobile view toggle, clear drawer values
        sidebar.classList.remove('mobile-open');
        backdropOverlay.classList.remove('active');
    });
    
    // Desktop View collapse triggers
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    // Mobile Drawer Open trigger
    mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        backdropOverlay.classList.add('active');
    });
    
    // Clear All history trigger
    clearAllHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear ALL conversations and stored chat logs permanently?')) {
            chats = [];
            currentChatId = null;
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CURRENT_CHAT_KEY);
            createNewChat();
        }
    });
    
    // Home Dashboard suggestion selections
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const promptVal = card.getAttribute('data-prompt');
            if (promptVal) {
                input.value = promptVal;
                sendMessage();
            }
        });
    });
    
    // Light/Dark Theme Switcher trigger
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const darkActive = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', darkActive ? 'dark' : 'light');
    });
}

// ==== Copy Code Utility ====
window.copyCode = function(button) {
    const pre = button.parentElement.nextElementSibling;
    if (pre && pre.tagName === 'PRE') {
        const codeText = pre.innerText;
        navigator.clipboard.writeText(codeText).then(() => {
            button.innerText = 'Copied!';
            button.style.color = 'var(--color-primary)';
            button.style.borderColor = 'var(--color-primary)';
            setTimeout(() => {
                button.innerText = 'Copy';
                button.style.color = '';
                button.style.borderColor = '';
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }
};

// Start Client
init();

