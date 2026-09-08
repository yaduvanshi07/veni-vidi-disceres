// Parse document
async function parseDocument(documentId) {
    const parseSpinner = document.getElementById('parseSpinner');
    const extractedTextDiv = document.getElementById('extractedText');
    
    parseSpinner.style.display = 'inline-block';
    extractedTextDiv.innerHTML = '<p class="text-muted text-center py-5"><i class="bi bi-hourglass-split me-2"></i>Parsing document... This may take a moment.</p>';

    try {
        const response = await fetch(`/documents/${documentId}/parse`, {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            showAlert('Document parsing started. This may take a moment...', 'info');
            
            // Poll for parse status
            const checkStatus = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/api/parse-status/${documentId}`);
                    const statusData = await statusResponse.json();
                    
                    if (statusData.success && statusData.isParsed) {
                        clearInterval(checkStatus);
                        parseSpinner.style.display = 'none';
                        extractedTextDiv.innerHTML = `<pre class="mb-0" style="white-space: pre-wrap; font-family: inherit;">${statusData.extractedText}</pre>`;
                        showAlert('Document parsed successfully!', 'success');
                        
                        // Reload page to update UI
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }, 2000);

            // Stop polling after 5 minutes
            setTimeout(() => {
                clearInterval(checkStatus);
            }, 300000);
        } else {
            parseSpinner.style.display = 'none';
            showAlert(data.message || 'Failed to parse document', 'danger');
        }
    } catch (error) {
        console.error('Parse error:', error);
        parseSpinner.style.display = 'none';
        showAlert('Failed to parse document', 'danger');
    }
}

// Modal handling for demo limit
function showDemoLimitPopup() {
    const popup = document.getElementById('demoLimitPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

function hideDemoLimitPopup() {
    const popup = document.getElementById('demoLimitPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function lockChatForDemoLimit() {
    const chatInput = document.getElementById('chatInput');
    const chatSubmitBtn = document.getElementById('chatSubmitBtn');
    if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = `Free demo limit reached (${typeof demoTokenLimit !== 'undefined' ? demoTokenLimit : 1024}/${typeof demoTokenLimit !== 'undefined' ? demoTokenLimit : 1024} tokens)`;
    }
    if (chatSubmitBtn) {
        chatSubmitBtn.disabled = true;
    }
}

// Send chat message
async function sendChatMessage(event, documentId) {
    event.preventDefault();
    
    // Check if guest has reached demo limit before sending
    if (typeof isGuestDemo !== 'undefined' && isGuestDemo && typeof demoTokenLimit !== 'undefined') {
        if (demoTokenUsage >= demoTokenLimit) {
            lockChatForDemoLimit();
            showDemoLimitPopup();
            return;
        }
    }

    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) {
        return;
    }

    const chatContainer = document.getElementById('chatContainer');
    const chatSpinner = document.getElementById('chatSpinner');
    const emptyState = document.getElementById('chatEmptyState');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Add user message to chat with saffron styling consistent with theme
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'mb-3 text-end';
    userMessageDiv.innerHTML = `
        <div class="d-inline-block p-3 rounded-3 shadow-sm bg-saffron text-white" style="max-width: 85%;">
            <div class="d-flex align-items-center mb-2">
                <i class="bi bi-person-fill me-2"></i>
                <small class="fw-bold opacity-75">You</small>
                <small class="ms-auto opacity-50">${new Date().toLocaleTimeString()}</small>
            </div>
            <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
    `;
    chatContainer.appendChild(userMessageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    chatInput.value = '';
    chatSpinner.style.display = 'block';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const response = await fetch(`/api/chat/${documentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        chatSpinner.style.display = 'none';

        // Update token badge if usage data returned
        if (data.demoUsage && typeof isGuestDemo !== 'undefined' && isGuestDemo) {
            demoTokenUsage = data.demoUsage.used;
            const badgeUsed = document.getElementById('demoTokensUsed');
            if (badgeUsed) {
                badgeUsed.textContent = demoTokenUsage;
            }
        }

        if (data.success) {
            // Add assistant message to chat
            const assistantMessageDiv = document.createElement('div');
            assistantMessageDiv.className = 'mb-3';
            assistantMessageDiv.innerHTML = `
                <div class="d-inline-block p-3 rounded-3 shadow-sm bg-white border" style="max-width: 85%;">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-robot me-2"></i>
                        <small class="fw-bold opacity-75">Assistant</small>
                        <small class="ms-auto opacity-50">${new Date().toLocaleTimeString()}</small>
                    </div>
                    <div style="white-space: pre-wrap;">${escapeHtml(data.response)}</div>
                </div>
            `;
            chatContainer.appendChild(assistantMessageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // If this response reached the demo limit
            if (data.limitReached) {
                lockChatForDemoLimit();
                setTimeout(() => {
                    showDemoLimitPopup();
                }, 500);
            }
        } else {
            // Check if server rejected due to limit reached
            if (data.limitReached || response.status === 403) {
                lockChatForDemoLimit();
                showDemoLimitPopup();
            } else {
                showAlert(data.message || 'Failed to send message', 'danger');
            }
        }
    } catch (error) {
        console.error('Chat error:', error);
        chatSpinner.style.display = 'none';
        showAlert('Failed to send message. Please try again.', 'danger');
    }
}

// Utility to escape HTML in user/assistant messages to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Wire up event listeners for demo modal on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    const closeBtn = document.getElementById('closeDemoPopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideDemoLimitPopup);
    }
    const popup = document.getElementById('demoLimitPopup');
    if (popup) {
        popup.addEventListener('click', function (e) {
            if (e.target === popup) {
                hideDemoLimitPopup();
            }
        });
    }

    // If initial page load already at or past limit
    if (typeof isGuestDemo !== 'undefined' && isGuestDemo && typeof demoTokenLimit !== 'undefined') {
        if (demoTokenUsage >= demoTokenLimit) {
            lockChatForDemoLimit();
        }
    }
});

// Update document category
async function updateCategory(documentId, category) {
    try {
        const response = await fetch(`/documents/${documentId}/category`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ category })
        });

        const data = await response.json();
        if (data.success) {
            showAlert('Category updated', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('Failed to update category', 'danger');
        }
    } catch (error) {
        console.error('Category update error:', error);
        showAlert('Failed to update category', 'danger');
    }
}

// Delete document
async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        const response = await fetch(`/documents/${documentId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            showAlert('Document deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = '/documents/all';
            }, 1000);
        } else {
            showAlert(data.message || 'Failed to delete document', 'danger');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Failed to delete document', 'danger');
    }
}

