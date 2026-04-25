let currentFlashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

// Load flashcards on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDocuments();
    loadFlashcards();
});

// Load documents for generation
async function loadDocuments() {
    try {
        const response = await fetch('/documents/all');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract document data from the page or use API
        const response2 = await fetch('/api/parse-status/');
        // For now, we'll fetch from a different endpoint
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

// Load flashcards
async function loadFlashcards() {
    try {
        const topic = document.getElementById('filterTopic').value;
        const difficulty = document.getElementById('filterDifficulty').value;
        const due = document.getElementById('filterDue').value;
        
        let url = '/study/api/flashcards?';
        if (topic) url += `topic=${topic}&`;
        if (difficulty) url += `difficulty=${difficulty}&`;
        if (due === 'due') url += 'due=true&';
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentFlashcards = data.data;
            displayStats(currentFlashcards);
            
            if (currentFlashcards.length === 0) {
                displayEmptyState();
            } else {
                displayFlashcards(currentFlashcards);
            }
        }
    } catch (error) {
        console.error('Error loading flashcards:', error);
        document.getElementById('flashcardArea').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load flashcards
            </div>
        `;
    }
}

// Display statistics
function displayStats(cards) {
    const total = cards.length;
    const due = cards.filter(c => new Date(c.nextReview) <= new Date()).length;
    const mastered = cards.filter(c => c.mastery >= 80).length;
    const avgMastery = cards.length > 0 
        ? Math.round(cards.reduce((sum, c) => sum + c.mastery, 0) / cards.length)
        : 0;
    
    document.getElementById('totalCards').textContent = total;
    document.getElementById('dueCards').textContent = due;
    document.getElementById('masteredCards').textContent = mastered;
    document.getElementById('avgMastery').textContent = avgMastery + '%';
    document.getElementById('statsCards').style.display = 'block';
}

// Display empty state
function displayEmptyState() {
    document.getElementById('flashcardArea').innerHTML = `
        <div class="text-center py-5">
            <i class="bi bi-card-text display-1 text-muted mb-3"></i>
            <h5 class="text-muted mb-3">No flashcards found</h5>
            <p class="text-muted mb-4">Generate flashcards from your documents to get started!</p>
            <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#generateModal">
                <i class="bi bi-magic me-2"></i>Generate Flashcards
            </button>
        </div>
    `;
    document.getElementById('flashcardGrid').style.display = 'none';
}

// Display flashcards
function displayFlashcards(cards) {
    const area = document.getElementById('flashcardArea');
    const grid = document.getElementById('flashcardGrid');
    const list = document.getElementById('flashcardList');
    
    area.style.display = 'none';
    grid.style.display = 'block';
    list.innerHTML = '';
    
    // Sort: due cards first
    const sortedCards = [...cards].sort((a, b) => {
        const aDue = new Date(a.nextReview) <= new Date();
        const bDue = new Date(b.nextReview) <= new Date();
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        return new Date(a.nextReview) - new Date(b.nextReview);
    });
    
    sortedCards.forEach((card, index) => {
        const isDue = new Date(card.nextReview) <= new Date();
        const masteryColor = card.mastery >= 80 ? 'success' : card.mastery >= 50 ? 'warning' : 'danger';
        
        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 ${isDue ? 'border-warning' : ''}">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <span class="badge bg-${getDifficultyColor(card.difficulty)} me-2">${card.difficulty}</span>
                                ${card.topic ? `<span class="badge bg-secondary">${card.topic}</span>` : ''}
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="reviewCard(${index})">
                                        <i class="bi bi-check-circle me-2"></i>Review Now
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteFlashcard('${card._id}')">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="mb-3">
                            <h6 class="fw-bold mb-2">Front:</h6>
                            <p class="text-muted small">${card.front.substring(0, 100)}${card.front.length > 100 ? '...' : ''}</p>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Mastery</small>
                                <small class="fw-bold text-${masteryColor}">${card.mastery}%</small>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-${masteryColor}" role="progressbar" style="width: ${card.mastery}%"></div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>
                                ${isDue ? '<span class="text-warning">Due now</span>' : `Review in ${getDaysUntil(card.nextReview)} days`}
                            </small>
                            <button class="btn btn-sm btn-primary" onclick="reviewCard(${index})">
                                <i class="bi bi-eye me-1"></i>Review
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        list.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function getDifficultyColor(difficulty) {
    switch(difficulty) {
        case 'Easy': return 'success';
        case 'Medium': return 'warning';
        case 'Hard': return 'danger';
        default: return 'secondary';
    }
}

function getDaysUntil(date) {
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
}

// Review card
function reviewCard(index) {
    currentCardIndex = index;
    isFlipped = false;
    const card = currentFlashcards[index];
    
    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    const content = document.getElementById('flashcardContent');
    const buttons = document.getElementById('reviewButtons');
    
    content.innerHTML = `
        <div class="flashcard" id="flashcard">
            <div class="flashcard-face flashcard-front">
                <div class="flashcard-text">
                    ${card.front}
                </div>
                <span class="flashcard-badge badge bg-light text-dark">${card.difficulty}</span>
            </div>
            <div class="flashcard-face flashcard-back">
                <div class="flashcard-text">
                    ${card.back}
                </div>
                <span class="flashcard-badge badge bg-light text-dark">Mastery: ${card.mastery}%</span>
            </div>
        </div>
        <div class="text-center mt-3">
            <small class="text-muted">Click card to flip</small>
        </div>
    `;
    
    buttons.style.display = 'block';
    modal.show();
    
    // Add click to flip
    document.getElementById('flashcard').addEventListener('click', function() {
        this.classList.toggle('flipped');
        isFlipped = !isFlipped;
    });
}

// Review flashcard (correct/incorrect)
async function reviewFlashcard(isCorrect) {
    try {
        const card = currentFlashcards[currentCardIndex];
        
        const response = await fetch(`/study/api/flashcards/${card._id}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isCorrect })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local card
            currentFlashcards[currentCardIndex] = data.data;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
            modal.hide();
            
            // Reload flashcards
            loadFlashcards();
            
            // Show success message
            showAlert(`Flashcard ${isCorrect ? 'marked as correct' : 'marked as incorrect'}!`, 'success');
        }
    } catch (error) {
        console.error('Error reviewing flashcard:', error);
        showAlert('Failed to update flashcard', 'danger');
    }
}

// Generate flashcards
document.getElementById('generateForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const documentId = document.getElementById('generateDocument').value;
    
    if (!documentId) {
        showAlert('Please select a document', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/study/flashcards/generate/${documentId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateModal'));
            modal.hide();
            
            showAlert('Flashcard generation started! This may take a moment...', 'info');
            
            // Reload after a delay
            setTimeout(() => {
                loadFlashcards();
            }, 3000);
        }
    } catch (error) {
        console.error('Error generating flashcards:', error);
        showAlert('Failed to generate flashcards', 'danger');
    }
});

// Load documents for generation dropdown
async function loadDocumentsForGeneration() {
    try {
        const response = await fetch('/documents/api/all');
        const data = await response.json();
        
        const select = document.getElementById('generateDocument');
        if (select && data.success) {
            select.innerHTML = '<option value="">Choose a document...</option>';
            data.data.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc._id;
                option.textContent = doc.originalName;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        const select = document.getElementById('generateDocument');
        if (select) {
            select.innerHTML = '<option value="">Error loading documents</option>';
        }
    }
}

// Delete flashcard
async function deleteFlashcard(flashcardId) {
    if (!confirm('Are you sure you want to delete this flashcard?')) {
        return;
    }
    
    try {
        // This would need a DELETE endpoint
        showAlert('Delete functionality coming soon', 'info');
    } catch (error) {
        console.error('Error deleting flashcard:', error);
        showAlert('Failed to delete flashcard', 'danger');
    }
}

// Load documents when modal opens
document.getElementById('generateModal')?.addEventListener('show.bs.modal', function() {
    loadDocumentsForGeneration();
});

