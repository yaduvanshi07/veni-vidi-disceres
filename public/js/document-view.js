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

// Send chat message
async function sendChatMessage(event, documentId) {
    event.preventDefault();
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) {
        return;
    }

    const chatContainer = document.getElementById('chatContainer');
    const chatSpinner = document.getElementById('chatSpinner');
    
    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'mb-3 text-end';
    userMessageDiv.innerHTML = `
        <div class="d-inline-block p-2 rounded bg-primary text-white" style="max-width: 85%;">
            <small class="d-block mb-1 fw-bold">You</small>
            <div>${message}</div>
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

        if (data.success) {
            // Add assistant message to chat
            const assistantMessageDiv = document.createElement('div');
            assistantMessageDiv.className = 'mb-3';
            assistantMessageDiv.innerHTML = `
                <div class="d-inline-block p-2 rounded bg-light" style="max-width: 85%;">
                    <small class="d-block mb-1 fw-bold">Assistant</small>
                    <div>${data.response}</div>
                </div>
            `;
            chatContainer.appendChild(assistantMessageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
            showAlert(data.message || 'Failed to send message', 'danger');
        }
    } catch (error) {
        console.error('Chat error:', error);
        chatSpinner.style.display = 'none';
        showAlert('Failed to send message. Please try again.', 'danger');
    }
}

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

