// Data Store
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let journals = JSON.parse(localStorage.getItem('journals')) || [];
let screenshots = JSON.parse(localStorage.getItem('screenshots')) || {};
let currentTags = [];
let currentJournalTags = [];
let currentLightboxIndex = 0;
let currentLightboxImages = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    updateFolderCounts();

    // Set default datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.querySelector('input[name="tradeDate"]').value = now.toISOString().slice(0, 16);
    document.querySelector('input[name="entryDate"]').value = now.toISOString().slice(0, 10);

    // Drag and drop
    const uploadZone = document.getElementById('uploadZone');

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('screenshotInput').files = files;
            handleFileSelect({ target: { files: files } });
        }
    });
});

// Navigation
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(section + '-section').style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');

    if (section === 'dashboard') updateDashboard();
    if (section === 'trades') renderTradeList();
    if (section === 'journal') renderJournalList();
    if (section === 'screenshots') updateFolderCounts();
    if (section === 'analytics') renderAnalytics();
}

// Modal Functions
function openTradeModal() {
    document.getElementById('tradeModal').classList.add('active');
    currentTags = [];
    renderTags();
}

function openJournalModal() {
    document.getElementById('journalModal').classList.add('active');
    currentJournalTags = [];
    renderJournalTags();
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById(modalId).querySelector('form').reset();
    document.getElementById('imagePreview').style.display = 'none';
    currentTags = [];
    currentJournalTags = [];
}

// Tag Handling
function handleTagInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = e.target.value.trim();
        if (value && !currentTags.includes(value)) {
            currentTags.push(value);
            renderTags();
            e.target.value = '';
        }
    } else if (e.key === 'Backspace' && !e.target.value && currentTags.length > 0) {
        currentTags.pop();
        renderTags();
    }
}

function handleJournalTagInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = e.target.value.trim();
        if (value && !currentJournalTags.includes(value)) {
            currentJournalTags.push(value);
            renderJournalTags();
            e.target.value = '';
        }
    }
}

function renderTags() {
    const container = document.getElementById('tradeTags');
    container.innerHTML = currentTags.map(tag =>
        `<span class="input-tag">${tag}<span class="remove-tag" onclick="removeTag('${tag}')">×</span></span>`
    ).join('');
}

function renderJournalTags() {
    const container = document.getElementById('journalTags');
    container.innerHTML = currentJournalTags.map(tag =>
        `<span class="input-tag">${tag}<span class="remove-tag" onclick="removeJournalTag('${tag}')">×</span></span>`
    ).join('');
}

function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

function removeJournalTag(tag) {
    currentJournalTags = currentJournalTags.filter(t => t !== tag);
    renderJournalTags();
}

// Trade Functions
function saveTrade(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const pips = formData.get('direction') === 'long'
        ? parseFloat(formData.get('exitPrice')) - parseFloat(formData.get('entryPrice'))
        : parseFloat(formData.get('entryPrice')) - parseFloat(formData.get('exitPrice'));

    const trade = {
        id: Date.now(),
        instrument: formData.get('instrument'),
        direction: formData.get('direction'),
        entryPrice: parseFloat(formData.get('entryPrice')),
        exitPrice: parseFloat(formData.get('exitPrice')),
        positionSize: parseFloat(formData.get('positionSize')),
        date: formData.get('tradeDate'),
        setup: formData.get('setup'),
        tags: currentTags,
        notes: formData.get('notes'),
        mistake: formData.get('mistake') === 'on',
        pips: pips,
        pnl: pips * formData.get('positionSize') * 10, // Simplified P&L calc
        result: pips > 0 ? 'win' : 'loss'
    };

    trades.unshift(trade);
    localStorage.setItem('trades', JSON.stringify(trades));

    closeModal('tradeModal');
    updateDashboard();

    // Show success feedback
    showNotification('Trade saved successfully!');
}

function renderTradeList(filter = 'all') {
    const container = document.getElementById('fullTradeList');

    let filteredTrades = trades;
    if (filter === 'win') filteredTrades = trades.filter(t => t.result === 'win');
    if (filter === 'loss') filteredTrades = trades.filter(t => t.result === 'loss');
    if (filter === 'long') filteredTrades = trades.filter(t => t.direction === 'long');
    if (filter === 'short') filteredTrades = trades.filter(t => t.direction === 'short');

    if (filteredTrades.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">💹</div>
                        <p>No trades found for this filter</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = filteredTrades.map(trade => `
                <div class="trade-item animate-in">
                    <div class="trade-info">
                        <div class="trade-icon ${trade.direction}">
                            ${trade.direction === 'long' ? 'L' : 'S'}
                        </div>
                        <div class="trade-details">
                            <h4>${trade.instrument} @ ${trade.entryPrice}</h4>
                            <div class="trade-meta">
                                ${new Date(trade.date).toLocaleDateString()} • ${trade.setup} 
                                ${trade.mistake ? '• <span style="color: var(--accent-danger)">Mistake</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="trade-pnl ${trade.result}">
                        <div class="pnl-value">${trade.pips > 0 ? '+' : ''}${trade.pips.toFixed(1)} pips</div>
                        <div style="font-size: 0.875rem;">${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}</div>
                    </div>
                </div>
            `).join('');
}

function filterTrades(type) {
    document.querySelectorAll('#tradeFilters .filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderTradeList(type);
}

// Journal Functions
function saveJournal(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const entry = {
        id: Date.now(),
        type: formData.get('entryType'),
        title: formData.get('title'),
        emotion: formData.get('emotion'),
        date: formData.get('entryDate'),
        content: formData.get('content'),
        tags: currentJournalTags
    };

    journals.unshift(entry);
    localStorage.setItem('journals', JSON.stringify(journals));

    closeModal('journalModal');
    if (document.getElementById('journal-section').style.display !== 'none') {
        renderJournalList();
    }
    showNotification('Journal entry saved!');
}

function renderJournalList(filter = 'all') {
    const container = document.getElementById('journalList');

    let filteredJournals = journals;
    if (filter !== 'all') {
        filteredJournals = journals.filter(j => j.type === filter);
    }

    if (filteredJournals.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📓</div>
                        <h3>No journal entries found</h3>
                        <p>Start documenting your trading journey</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = filteredJournals.map(entry => `
                <div class="journal-entry animate-in">
                    <div class="journal-header">
                        <div>
                            <div class="journal-title">${entry.title}</div>
                            <div class="journal-date">${new Date(entry.date).toLocaleDateString()} • ${entry.type}</div>
                        </div>
                        <span style="font-size: 1.5rem;">${getEmotionEmoji(entry.emotion)}</span>
                    </div>
                    <div class="journal-preview">${entry.content}</div>
                    <div class="journal-tags">
                        ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        <span class="tag emotion">${entry.emotion}</span>
                    </div>
                </div>
            `).join('');
}

function getEmotionEmoji(emotion) {
    const emojis = {
        'confident': '💪',
        'neutral': '😐',
        'anxious': '😰',
        'frustrated': '😤',
        'excited': '🤩',
        'tired': '😴'
    };
    return emojis[emotion] || '📝';
}

function filterJournal(type) {
    document.querySelectorAll('#journalFilters .filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderJournalList(type);
}

// Screenshot Functions
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function saveScreenshot(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const folder = formData.get('folder');
    const fileInput = document.getElementById('screenshotInput');

    if (!fileInput.files[0]) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (!screenshots[folder]) screenshots[folder] = [];

        screenshots[folder].unshift({
            id: Date.now(),
            data: event.target.result,
            date: new Date().toISOString(),
            notes: formData.get('screenshotNotes') || ''
        });

        localStorage.setItem('screenshots', JSON.stringify(screenshots));
        closeModal('uploadModal');
        updateFolderCounts();
        showNotification('Screenshot uploaded to ' + folder);
    };
    reader.readAsDataURL(fileInput.files[0]);
}

function updateFolderCounts() {
    const folders = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NASDAQ', 'Other'];
    folders.forEach(folder => {
        const count = screenshots[folder] ? screenshots[folder].length : 0;
        const el = document.getElementById(`count-${folder}`);
        if (el) el.textContent = `${count} screenshot${count !== 1 ? 's' : ''}`;
    });

    // Update recent screenshots on dashboard
    const recentContainer = document.getElementById('recentScreenshots');
    let allScreenshots = [];
    Object.keys(screenshots).forEach(folder => {
        screenshots[folder].forEach(s => {
            allScreenshots.push({ ...s, folder });
        });
    });
    allScreenshots.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allScreenshots.length === 0) {
        recentContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-icon">🖼️</div>
                        <p>No screenshots yet. Upload charts to organize them!</p>
                    </div>
                `;
    } else {
        recentContainer.innerHTML = allScreenshots.slice(0, 4).map(s => `
                    <div class="screenshot-item" onclick="openLightbox('${s.data}', 0, ['${s.data}'])">
                        <img src="${s.data}" alt="Chart">
                        <div class="screenshot-overlay">
                            <div style="font-weight: 600;">${s.folder}</div>
                            <div class="screenshot-date">${new Date(s.date).toLocaleDateString()}</div>
                        </div>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteScreenshot('${s.folder}', ${s.id})">×</button>
                    </div>
                `).join('');
    }
}

function openFolder(folder) {
    document.getElementById('folderView').style.display = 'none';
    document.getElementById('screenshotView').style.display = 'block';
    document.getElementById('currentFolder').textContent = folder;

    const container = document.getElementById('screenshotGrid');
    const folderScreens = screenshots[folder] || [];

    if (folderScreens.length === 0) {
        container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-icon">📁</div>
                        <p>No screenshots in this folder yet</p>
                    </div>
                `;
        return;
    }

    currentLightboxImages = folderScreens.map(s => s.data);

    container.innerHTML = folderScreens.map((s, idx) => `
                <div class="screenshot-item" onclick="openLightbox('${s.data}', ${idx}, currentLightboxImages)">
                    <img src="${s.data}" alt="Chart">
                    <div class="screenshot-overlay">
                        <div class="screenshot-date">${new Date(s.date).toLocaleDateString()}</div>
                        ${s.notes ? `<div style="margin-top: 0.25rem; font-size: 0.875rem;">${s.notes}</div>` : ''}
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteScreenshot('${folder}', ${s.id})">×</button>
                </div>
            `).join('');
}

function backToFolders() {
    document.getElementById('folderView').style.display = 'block';
    document.getElementById('screenshotView').style.display = 'none';
}

function deleteScreenshot(folder, id) {
    if (confirm('Delete this screenshot?')) {
        screenshots[folder] = screenshots[folder].filter(s => s.id !== id);
        if (screenshots[folder].length === 0) delete screenshots[folder];
        localStorage.setItem('screenshots', JSON.stringify(screenshots));

        if (document.getElementById('screenshotView').style.display !== 'none') {
            openFolder(folder);
        }
        updateFolderCounts();
    }
}

// Lightbox
function openLightbox(src, index, images) {
    currentLightboxIndex = index;
    currentLightboxImages = images;
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('active');
}

function closeLightbox(e) {
    if (!e || e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        document.getElementById('lightbox').classList.remove('active');
    }
}

function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentLightboxImages.length - 1;
    if (currentLightboxIndex >= currentLightboxImages.length) currentLightboxIndex = 0;
    document.getElementById('lightboxImg').src = currentLightboxImages[currentLightboxIndex];
}

// Dashboard & Analytics
function updateDashboard() {
    // Stats
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
    const netPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.0';

    document.getElementById('winRate').textContent = winRate + '%';
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('netPnL').textContent = (netPnL >= 0 ? '+' : '') + '$' + netPnL.toFixed(2);
    document.getElementById('profitFactor').textContent = profitFactor;

    document.getElementById('netPnL').style.color = netPnL >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

    // Recent trades
    const recentContainer = document.getElementById('recentTrades');
    if (trades.length === 0) {
        recentContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <p>No trades yet. Add your first trade!</p>
                    </div>
                `;
    } else {
        recentContainer.innerHTML = trades.slice(0, 5).map(trade => `
                    <div class="trade-item">
                        <div class="trade-info">
                            <div class="trade-icon ${trade.direction}">
                                ${trade.direction === 'long' ? 'L' : 'S'}
                            </div>
                            <div class="trade-details">
                                <h4>${trade.instrument}</h4>
                                <div class="trade-meta">${new Date(trade.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div class="trade-pnl ${trade.result}">
                            <div class="pnl-value">${trade.pips > 0 ? '+' : ''}${trade.pips.toFixed(1)}</div>
                        </div>
                    </div>
                `).join('');
    }

    // Win Rate Chart
    renderWinRateChart();
}

function renderWinRateChart() {
    const ctx = document.getElementById('winRateChart').getContext('2d');

    // Calculate win rate by instrument
    const instrumentStats = {};
    trades.forEach(trade => {
        if (!instrumentStats[trade.instrument]) {
            instrumentStats[trade.instrument] = { wins: 0, total: 0 };
        }
        instrumentStats[trade.instrument].total++;
        if (trade.result === 'win') instrumentStats[trade.instrument].wins++;
    });

    const labels = Object.keys(instrumentStats);
    const winRates = labels.map(inst =>
        (instrumentStats[inst].wins / instrumentStats[inst].total * 100).toFixed(1)
    );

    if (window.winRateChartInstance) window.winRateChartInstance.destroy();

    window.winRateChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Rate %',
                data: winRates,
                backgroundColor: winRates.map(rate =>
                    parseFloat(rate) >= 50 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                ),
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

function renderAnalytics() {
    // Monthly P&L Chart
    const monthlyCtx = document.getElementById('monthlyPnLChart').getContext('2d');
    const monthlyData = {};

    trades.forEach(trade => {
        const month = new Date(trade.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += trade.pnl;
    });

    if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();

    window.monthlyChartInstance = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: Object.keys(monthlyData),
            datasets: [{
                label: 'P&L ($)',
                data: Object.values(monthlyData),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });

    // Setup Performance
    const setupCtx = document.getElementById('setupChart').getContext('2d');
    const setupStats = {};
    trades.forEach(trade => {
        if (!setupStats[trade.setup]) setupStats[trade.setup] = { wins: 0, total: 0 };
        setupStats[trade.setup].total++;
        if (trade.result === 'win') setupStats[trade.setup].wins++;
    });

    if (window.setupChartInstance) window.setupChartInstance.destroy();

    window.setupChartInstance = new Chart(setupCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(setupStats),
            datasets: [{
                data: Object.values(setupStats).map(s => s.total),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#9ca3af' }
                }
            }
        }
    });

    // Time of Day Chart
    const timeCtx = document.getElementById('timeChart').getContext('2d');
    const hourStats = {};
    for (let i = 0; i < 24; i++) hourStats[i] = { pnl: 0, count: 0 };

    trades.forEach(trade => {
        const hour = new Date(trade.date).getHours();
        hourStats[hour].pnl += trade.pnl;
        hourStats[hour].count++;
    });

    if (window.timeChartInstance) window.timeChartInstance.destroy();

    window.timeChartInstance = new Chart(timeCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(hourStats).map(h => `${h}:00`),
            datasets: [{
                label: 'Avg P&L ($)',
                data: Object.values(hourStats).map(h => h.count > 0 ? h.pnl / h.count : 0),
                backgroundColor: Object.values(hourStats).map(h =>
                    h.pnl >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                ),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9ca3af',
                        maxTicksLimit: 12
                    }
                }
            }
        }
    });
}

// Data Export/Import
function exportData() {
    const data = {
        trades,
        journals,
        screenshots,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.trades) trades = data.trades;
            if (data.journals) journals = data.journals;
            if (data.screenshots) screenshots = data.screenshots;

            localStorage.setItem('trades', JSON.stringify(trades));
            localStorage.setItem('journals', JSON.stringify(journals));
            localStorage.setItem('screenshots', JSON.stringify(screenshots));

            updateDashboard();
            updateFolderCounts();
            showNotification('Data imported successfully!');
        } catch (err) {
            alert('Error importing data: Invalid file format');
        }
    };
    reader.readAsText(file);
}

// Notification
function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: var(--accent-success);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 3000;
                animation: slideIn 0.3s ease;
                font-weight: 500;
            `;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        closeLightbox();
    }
});
