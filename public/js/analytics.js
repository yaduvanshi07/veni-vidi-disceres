// Load analytics data
document.addEventListener('DOMContentLoaded', function() {
    loadAnalytics();
});

async function loadAnalytics() {
    try {
        const response = await fetch('/analytics');
        const data = await response.json();
        
        if (data.success) {
            displayPerformance(data.data.performance);
            displayStudyPatterns(data.data.patterns);
            displayWeakTopics(data.data.weakTopics);
            displayFAQTrends(data.data.faqTrends);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function displayPerformance(performance) {
    const container = document.getElementById('performanceData');
    
    const score = performance.score;
    const scoreColor = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger';
    
    container.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-4 text-center">
                <div class="display-1 fw-bold text-${scoreColor}">${score}</div>
                <p class="text-muted mb-0">Performance Score</p>
            </div>
            <div class="col-md-8">
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Consistency</span>
                        <span class="fw-bold">${performance.factors.consistency}%</span>
                    </div>
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${performance.factors.consistency}%"></div>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Total Study Time</span>
                        <span class="fw-bold">${Math.round(performance.factors.totalStudyTime)} min</span>
                    </div>
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar bg-info" role="progressbar" style="width: ${Math.min(100, performance.factors.totalStudyTime / 10)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Weak Topics</span>
                        <span class="fw-bold">${performance.factors.weakTopicsCount}</span>
                    </div>
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar bg-warning" role="progressbar" style="width: ${Math.min(100, performance.factors.weakTopicsCount * 10)}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayStudyPatterns(patterns) {
    const container = document.getElementById('studyPatterns');
    
    if (patterns.dailyPattern.length === 0) {
        container.innerHTML = '<p class="text-muted">No study data available yet.</p>';
        return;
    }
    
    // Create chart
    const canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: patterns.dailyPattern.slice(-7).map(p => new Date(p.date).toLocaleDateString()),
            datasets: [{
                label: 'Study Time (minutes)',
                data: patterns.dailyPattern.slice(-7).map(p => p.duration),
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function displayWeakTopics(topics) {
    const container = document.getElementById('weakTopics');
    
    if (topics.length === 0) {
        container.innerHTML = '<p class="text-muted">No weak topics identified. Keep up the good work!</p>';
        return;
    }
    
    let html = '<div class="list-group">';
    topics.forEach((topic, index) => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${topic.topic}</h6>
                    <small class="text-muted">Average: ${Math.round(topic.averageTime)} min | Difficulty: ${topic.difficulty}</small>
                </div>
                <span class="badge bg-warning">#${index + 1}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayFAQTrends(trends) {
    const container = document.getElementById('faqTrends');
    
    if (trends.length === 0) {
        container.innerHTML = '<p class="text-muted">No frequently asked questions yet.</p>';
        return;
    }
    
    let html = '<div class="list-group">';
    trends.forEach((trend, index) => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${trend.question}</h6>
                        <small class="text-muted">Asked ${trend.frequency} time${trend.frequency > 1 ? 's' : ''}</small>
                    </div>
                    <span class="badge bg-info">${trend.frequency}</span>
                </div>
                ${trend.topic ? `<small class="badge bg-secondary">${trend.topic}</small>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

