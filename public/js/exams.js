// Load exams on page load
document.addEventListener('DOMContentLoaded', function() {
    loadExams();
    
    // Set minimum date to today
    const examDateInput = document.getElementById('examDate');
    if (examDateInput) {
        examDateInput.min = new Date().toISOString().split('T')[0];
    }
});

// Load exams
async function loadExams() {
    try {
        const response = await fetch('/study/api/exams');
        const data = await response.json();
        
        if (data.success) {
            const exams = data.data;
            displayUpcomingExams(exams);
            displayAllExams(exams);
        }
    } catch (error) {
        console.error('Error loading exams:', error);
        document.getElementById('upcomingExams').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load exams
            </div>
        `;
    }
}

// Display upcoming exams with countdown
function displayUpcomingExams(exams) {
    const container = document.getElementById('upcomingExams');
    
    const upcoming = exams.filter(exam => {
        const examDate = new Date(exam.examDate);
        return examDate >= new Date() && exam.isActive;
    }).slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-calendar-x display-4 text-muted mb-3"></i>
                <h6 class="text-muted mb-2">No upcoming exams</h6>
                <p class="text-muted small mb-0">Add an exam to get started!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="row g-4">';
    
    upcoming.forEach(exam => {
        const examDate = new Date(exam.examDate);
        const now = new Date();
        const diff = examDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        const isUrgent = days <= 7;
        const isVeryUrgent = days <= 1;
        
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="countdown-card ${isVeryUrgent ? 'bg-danger' : isUrgent ? 'bg-warning' : ''}">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="fw-bold mb-1">${exam.title}</h5>
                            <p class="mb-0 opacity-75 small">${exam.description || ''}</p>
                        </div>
                        <button class="btn btn-sm btn-light" onclick="deleteExam('${exam._id}')">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="countdown-number">${days}</div>
                            <div class="countdown-label">Days</div>
                        </div>
                        <div class="col-4">
                            <div class="countdown-number">${hours}</div>
                            <div class="countdown-label">Hours</div>
                        </div>
                        <div class="col-4">
                            <div class="countdown-number">${minutes}</div>
                            <div class="countdown-label">Minutes</div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-top border-white border-opacity-25">
                        <div class="d-flex justify-content-between align-items-center">
                            <small>
                                <i class="bi bi-calendar me-1"></i>
                                ${examDate.toLocaleDateString()}
                            </small>
                            ${exam.examTime ? `
                                <small>
                                    <i class="bi bi-clock me-1"></i>
                                    ${exam.examTime}
                                </small>
                            ` : ''}
                        </div>
                        ${exam.location ? `
                            <div class="mt-2">
                                <small>
                                    <i class="bi bi-geo-alt me-1"></i>
                                    ${exam.location}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Update countdown every minute
    setTimeout(() => {
        displayUpcomingExams(exams);
    }, 60000);
}

// Display all exams
function displayAllExams(exams) {
    const container = document.getElementById('allExams');
    
    if (exams.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-calendar-x display-4 text-muted mb-3"></i>
                <h6 class="text-muted mb-2">No exams scheduled</h6>
                <p class="text-muted small mb-0">Add your first exam to get started!</p>
            </div>
        `;
        return;
    }
    
    // Sort exams by date
    const sorted = [...exams].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
    let html = '<div class="row g-3">';
    
    sorted.forEach(exam => {
        const examDate = new Date(exam.examDate);
        const now = new Date();
        const isPast = examDate < now;
        const daysUntil = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
        
        const statusClass = isPast ? 'future' : daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'upcoming' : 'future';
        
        html += `
            <div class="col-12">
                <div class="card border-0 shadow-sm exam-card ${statusClass}">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                    <h5 class="mb-0 me-3">${exam.title}</h5>
                                    ${exam.isActive ? '' : '<span class="badge bg-secondary">Completed</span>'}
                                    ${isPast ? '<span class="badge bg-secondary">Past</span>' : ''}
                                    ${daysUntil <= 7 && !isPast ? '<span class="badge bg-danger">Urgent</span>' : ''}
                                </div>
                                ${exam.description ? `<p class="text-muted mb-2">${exam.description}</p>` : ''}
                                <div class="d-flex flex-wrap gap-3 text-muted small">
                                    <span>
                                        <i class="bi bi-calendar me-1"></i>
                                        ${examDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    ${exam.examTime ? `
                                        <span>
                                            <i class="bi bi-clock me-1"></i>
                                            ${exam.examTime}
                                        </span>
                                    ` : ''}
                                    ${exam.location ? `
                                        <span>
                                            <i class="bi bi-geo-alt me-1"></i>
                                            ${exam.location}
                                        </span>
                                    ` : ''}
                                    ${!isPast ? `
                                        <span class="text-primary">
                                            <i class="bi bi-hourglass-split me-1"></i>
                                            ${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteExam('${exam._id}')">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Create exam
document.getElementById('examForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('examTitle').value,
        description: document.getElementById('examDescription').value,
        examDate: document.getElementById('examDate').value,
        examTime: document.getElementById('examTime').value,
        location: document.getElementById('examLocation').value
    };
    
    try {
        const response = await fetch('/study/api/exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('examModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('examForm').reset();
            
            showAlert('Exam added successfully!', 'success');
            loadExams();
        } else {
            showAlert(data.message || 'Failed to add exam', 'danger');
        }
    } catch (error) {
        console.error('Error creating exam:', error);
        showAlert('Failed to add exam', 'danger');
    }
});

// Delete exam
async function deleteExam(examId) {
    if (!confirm('Are you sure you want to delete this exam?')) {
        return;
    }
    
    try {
        const response = await fetch(`/study/api/exams/${examId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Exam deleted successfully', 'success');
            loadExams();
        } else {
            showAlert(data.message || 'Failed to delete exam', 'danger');
        }
    } catch (error) {
        console.error('Error deleting exam:', error);
        showAlert('Failed to delete exam', 'danger');
    }
}

