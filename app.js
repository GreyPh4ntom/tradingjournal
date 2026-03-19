// Data Management Class
class TradeJournal {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('trades')) || [];
        this.folders = JSON.parse(localStorage.getItem('folders')) || [];
        this.screenshots = JSON.parse(localStorage.getItem('screenshots')) || {};
        this.currentDate = new Date();
        this.currentEditId = null;
    }

    save() {
        localStorage.setItem('trades', JSON.stringify(this.trades));
        localStorage.setItem('folders', JSON.stringify(this.folders));
        localStorage.setItem('screenshots', JSON.stringify(this.screenshots));
    }

    addTrade(trade) {
        trade.id = Date.now().toString();
        trade.createdAt = new Date().toISOString();
        this.trades.unshift(trade);
        this.save();
        return trade;
    }

    updateTrade(id, updates) {
        const index = this.trades.findIndex(t => t.id === id);
        if (index !== -1) {
            this.trades[index] = { ...this.trades[index], ...updates, updatedAt: new Date().toISOString() };
            this.save();
            return true;
        }
        return false;
    }

    deleteTrade(id) {
        const initialLength = this.trades.length;
        this.trades = this.trades.filter(t => t.id !== id);
        if (this.trades.length < initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    createFolder(name) {
        const cleanName = name.trim();
        if (!cleanName || this.folders.includes(cleanName)) return false;
        this.folders.push(cleanName);
        this.screenshots[cleanName] = [];
        this.save();
        return true;
    }

    deleteFolder(name) {
        this.folders = this.folders.filter(f => f !== name);
        delete this.screenshots[name];
        this.save();
    }

    addScreenshot(folder, imageData) {
        if (!this.screenshots[folder]) return false;
        this.screenshots[folder].push({
            id: Date.now().toString(),
            data: imageData,
            date: new Date().toISOString()
        });
        this.save();
        return true;
    }

    deleteScreenshot(folder, id) {
        if (!this.screenshots[folder]) return;
        this.screenshots[folder] = this.screenshots[folder].filter(s => s.id !== id);
        this.save();
    }

    getStats() {
        const total = this.trades.length;
        const wins = this.trades.filter(t => t.result === 'win').length;
        const losses = this.trades.filter(t => t.result === 'loss').length;
        const breakevens = this.trades.filter(t => t.result === 'breakeven').length;
        
        const totalPnL = this.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
        
        const grossProfit = this.trades
            .filter(t => parseFloat(t.pnl) > 0)
            .reduce((sum, t) => sum + parseFloat(t.pnl), 0);
        const grossLoss = Math.abs(this.trades
            .filter(t => parseFloat(t.pnl) < 0)
            .reduce((sum, t) => sum + parseFloat(t.pnl), 0));
        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';
        
        const avgTrade = total > 0 ? (totalPnL / total).toFixed(2) : 0;

        return { total, wins, losses, breakevens, winRate, totalPnL, profitFactor, avgTrade };
    }

    getTradesByDate(dateStr) {
        return this.trades.filter(t => t.date === dateStr);
    }

    getTradesByMonth() {
        const months = {};
        this.trades.forEach(trade => {
            const date = new Date(trade.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) {
                months[key] = { wins: 0, losses: 0, breakevens: 0, pnl: 0, count: 0 };
            }
            months[key][trade.result === 'win' ? 'wins' : trade.result === 'loss' ? 'losses' : 'breakevens']++;
            months[key].pnl += parseFloat(trade.pnl) || 0;
            months[key].count++;
        });
        return months;
    }

    getTradesBySymbol() {
        const symbols = {};
        this.trades.forEach(trade => {
            const sym = (trade.symbol || '').toUpperCase();
            if (!sym) return;
            if (!symbols[sym]) {
                symbols[sym] = { total: 0, wins: 0, pnl: 0 };
            }
            symbols[sym].total++;
            symbols[sym].pnl += parseFloat(trade.pnl) || 0;
            if (trade.result === 'win') symbols[sym].wins++;
        });
        return symbols;
    }

    getTradesByStrategy() {
        const strategies = {};
        this.trades.forEach(trade => {
            const strat = trade.strategy || 'Unspecified';
            if (!strategies[strat]) {
                strategies[strat] = { total: 0, wins: 0, pnl: 0 };
            }
            strategies[strat].total++;
            if (trade.result === 'win') strategies[strat].wins++;
            strategies[strat].pnl += parseFloat(trade.pnl) || 0;
        });
        return strategies;
    }

    getEquityCurve() {
        let equity = 0;
        return this.trades
            .slice()
            .reverse()
            .map((trade, index) => {
                equity += parseFloat(trade.pnl) || 0;
                return { trade: index + 1, equity: equity };
            });
    }

    getUniqueSymbols() {
        return [...new Set(this.trades.map(t => t.symbol?.toUpperCase()).filter(Boolean))].sort();
    }
}

const journal = new TradeJournal();
let charts = {};

// Utility Functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return (num >= 0 ? '+' : '') + '$' + num.toFixed(2);
}

// Mobile Navigation
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

menuToggle?.addEventListener('click', toggleSidebar);
closeSidebar?.addEventListener('click', toggleSidebar);
sidebarOverlay?.addEventListener('click', toggleSidebar);

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        const viewId = btn.dataset.view + '-view';
        document.getElementById(viewId).classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
        
        // Update view content
        switch(btn.dataset.view) {
            case 'dashboard': updateDashboard(); break;
            case 'journal': updateJournalView(); break;
            case 'calendar': renderCalendar(); break;
            case 'screenshots': updateScreenshotsView(); break;
            case 'analytics': updateAnalytics(); break;
        }
    });
});

// Dashboard
function updateDashboard() {
    const stats = journal.getStats();
    
    // Update stats cards
    document.getElementById('total-pnl').textContent = formatCurrency(stats.totalPnL);
    document.getElementById('total-pnl').className = 'stat-value ' + (stats.totalPnL >= 0 ? 'positive' : 'negative');
    document.getElementById('win-rate-stat').textContent = stats.winRate + '%';
    document.getElementById('profit-factor').textContent = stats.profitFactor;
    document.getElementById('avg-trade').textContent = formatCurrency(stats.avgTrade);
    document.getElementById('avg-trade').className = 'stat-value ' + (parseFloat(stats.avgTrade) >= 0 ? 'positive' : 'negative');
    
    // Update sidebar mini stats
    document.getElementById('total-trades').textContent = stats.total;
    document.getElementById('win-rate-display').textContent = stats.winRate + '%';
    document.getElementById('total-pnl-mini').textContent = formatCurrency(stats.totalPnL);
    document.getElementById('mobile-winrate').textContent = stats.winRate + '%';
    
    // Win Rate Chart
    const ctx = document.getElementById('winRateChart');
    if (!ctx) return;
    
    if (charts.winRate) charts.winRate.destroy();
    
    charts.winRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses', 'Breakeven'],
            datasets: [{
                data: [stats.wins, stats.losses, stats.breakevens],
                backgroundColor: [
                    'var(--accent-green)',
                    'var(--accent-red)',
                    'var(--accent-yellow)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f9fafb', padding: 20 }
                }
            }
        }
    });
    
    // Recent trades
    const recentList = document.getElementById('recent-trades-list');
    if (!recentList) return;
    
    const recent = journal.trades.slice(0, 5);
    if (recent.length === 0) {
        recentList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No trades yet</p>';
        return;
    }
    
    recentList.innerHTML = recent.map(trade => `
        <div class="entry-card ${trade.result}">
            <div class="entry-header">
                <span class="entry-symbol">
                    ${trade.symbol.toUpperCase()}
                    <span class="entry-direction">${trade.direction}</span>
                </span>
                <span class="entry-result ${trade.result}">${trade.result}</span>
            </div>
            <div class="entry-details">
                <div class="entry-detail">
                    <span>P&L</span>
                    <span class="entry-pnl ${parseFloat(trade.pnl) >= 0 ? 'positive' : 'negative'}">
                        ${formatCurrency(trade.pnl)}
                    </span>
                </div>
                <div class="entry-detail">
                    <span>Date</span>
                    <span>${new Date(trade.date).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Journal View
const toggleFormBtn = document.getElementById('toggleFormBtn');
const tradeForm = document.getElementById('trade-form');
const closeForm = document.getElementById('closeForm');

toggleFormBtn?.addEventListener('click', () => {
    tradeForm.classList.add('active');
    toggleFormBtn.style.display = 'none';
});

closeForm?.addEventListener('click', () => {
    tradeForm.classList.remove('active');
    toggleFormBtn.style.display = 'flex';
});

// Set default date
document.getElementById('trade-date').valueAsDate = new Date();

// Trade Form Submit
document.getElementById('trade-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const trade = {
        date: document.getElementById('trade-date').value,
        symbol: document.getElementById('trade-symbol').value.trim(),
        direction: document.getElementById('trade-direction').value,
        result: document.getElementById('trade-result').value,
        entryPrice: document.getElementById('entry-price').value,
        exitPrice: document.getElementById('exit-price').value,
        pnl: document.getElementById('trade-pnl').value,
        rr: document.getElementById('trade-rr').value,
        strategy: document.getElementById('trade-strategy').value.trim(),
        notes: document.getElementById('trade-notes').value.trim(),
        lessons: document.getElementById('trade-lessons').value.trim()
    };
    
    journal.addTrade(trade);
    e.target.reset();
    document.getElementById('trade-date').valueAsDate = new Date();
    
    tradeForm.classList.remove('active');
    toggleFormBtn.style.display = 'flex';
    
    showToast('Trade saved successfully!');
    updateEntriesList();
    updateDashboard();
});

function updateJournalView() {
    updateSymbolFilter();
    updateEntriesList();
}

function updateSymbolFilter() {
    const select = document.getElementById('filter-symbol');
    if (!select) return;
    
    const currentVal = select.value;
    const symbols = journal.getUniqueSymbols();
    
    select.innerHTML = '<option value="">All Symbols</option>';
    symbols.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym;
        option.textContent = sym;
        select.appendChild(option);
    });
    
    select.value = currentVal;
}

function updateEntriesList() {
    const container = document.getElementById('entries-container');
    if (!container) return;
    
    const symbolFilter = document.getElementById('filter-symbol')?.value || '';
    const resultFilter = document.getElementById('filter-result')?.value || '';
    
    let filtered = journal.trades;
    if (symbolFilter) filtered = filtered.filter(t => t.symbol?.toUpperCase() === symbolFilter);
    if (resultFilter) filtered = filtered.filter(t => t.result === resultFilter);
    
    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No trades found</div>';
        return;
    }
    
    container.innerHTML = filtered.map(trade => `
        <div class="entry-card ${trade.result}">
            <div class="entry-header">
                <span class="entry-symbol">
                    ${trade.symbol?.toUpperCase() || 'Unknown'}
                    <span class="entry-direction">${trade.direction}</span>
                </span>
                <span class="entry-result ${trade.result}">${trade.result}</span>
            </div>
            <div class="entry-details">
                <div class="entry-detail">
                    <span>Entry</span>
                    <span>$${trade.entryPrice}</span>
                </div>
                <div class="entry-detail">
                    <span>Exit</span>
                    <span>$${trade.exitPrice}</span>
                </div>
                <div class="entry-detail">
                    <span>P&L</span>
                    <span class="entry-pnl ${parseFloat(trade.pnl) >= 0 ? 'positive' : 'negative'}">
                        ${formatCurrency(trade.pnl)}
                    </span>
                </div>
                ${trade.rr ? `
                <div class="entry-detail">
                    <span>R:R</span>
                    <span>${trade.rr}</span>
                </div>
                ` : ''}
            </div>
            <div class="entry-meta">
                ${new Date(trade.date).toLocaleDateString()} • ${trade.strategy || 'No strategy'}
            </div>
            ${trade.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${trade.notes}</div>` : ''}
            ${trade.lessons ? `<div class="entry-notes"><strong>Lessons:</strong> ${trade.lessons}</div>` : ''}
            <div class="entry-actions">
                <button class="btn-icon" onclick="openEditModal('${trade.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteTrade('${trade.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Filter listeners
document.getElementById('filter-symbol')?.addEventListener('change', updateEntriesList);
document.getElementById('filter-result')?.addEventListener('change', updateEntriesList);

function deleteTrade(id) {
    if (!confirm('Delete this trade permanently?')) return;
    if (journal.deleteTrade(id)) {
        showToast('Trade deleted');
        updateEntriesList();
        updateDashboard();
    }
}

function openEditModal(id) {
    const trade = journal.trades.find(t => t.id === id);
    if (!trade) return;
    
    journal.currentEditId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-symbol').value = trade.symbol || '';
    document.getElementById('edit-result').value = trade.result || 'win';
    document.getElementById('edit-pnl').value = trade.pnl || '';
    document.getElementById('edit-strategy').value = trade.strategy || '';
    document.getElementById('edit-notes').value = trade.notes || '';
    
    document.getElementById('edit-modal').classList.add('active');
}

// Edit Form
document.getElementById('edit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const updates = {
        symbol: document.getElementById('edit-symbol').value.trim(),
        result: document.getElementById('edit-result').value,
        pnl: document.getElementById('edit-pnl').value,
        strategy: document.getElementById('edit-strategy').value.trim(),
        notes: document.getElementById('edit-notes').value.trim()
    };
    
    if (journal.updateTrade(journal.currentEditId, updates)) {
        showToast('Trade updated');
        document.getElementById('edit-modal').classList.remove('active');
        updateEntriesList();
        updateDashboard();
    }
});

document.getElementById('delete-trade-btn')?.addEventListener('click', () => {
    if (journal.deleteTrade(journal.currentEditId)) {
        showToast('Trade deleted');
        document.getElementById('edit-modal').classList.remove('active');
        updateEntriesList();
        updateDashboard();
    }
});

document.querySelector('.close-modal')?.addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('active');
});

// Calendar
function renderCalendar() {
    const year = journal.currentDate.getFullYear();
    const month = journal.currentDate.getMonth();
    
    document.getElementById('current-month-year').textContent = 
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        grid.appendChild(createDayElement(daysInPrevMonth - i, true));
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrades = journal.getTradesByDate(dateStr);
        grid.appendChild(createDayElement(day, false, dayTrades, dateStr));
    }
    
    // Next month days
    const totalCells = grid.children.length;
    const remaining = 42 - totalCells;
    for (let day = 1; day <= remaining; day++) {
        grid.appendChild(createDayElement(day, true));
    }
}

function createDayElement(day, isOtherMonth, trades = [], dateStr = '') {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOtherMonth ? ' other-month' : '');
    
    div.innerHTML = `<span class="calendar-day-number">${day}</span>`;
    
    if (trades.length > 0) {
        const tradesDiv = document.createElement('div');
        tradesDiv.className = 'calendar-trades';
        
        trades.forEach(trade => {
            const dot = document.createElement('div');
            dot.className = `trade-dot ${trade.result}`;
            tradesDiv.appendChild(dot);
        });
        
        div.appendChild(tradesDiv);
        div.addEventListener('click', () => showDayTrades(dateStr, trades));
    }
    
    return div;
}

function showDayTrades(dateStr, trades) {
    const modal = document.getElementById('day-modal');
    const title = document.getElementById('day-modal-title');
    const list = document.getElementById('day-trades-list');
    
    title.textContent = `Trades - ${new Date(dateStr).toLocaleDateString()}`;
    
    list.innerHTML = trades.map(trade => `
        <div class="entry-card ${trade.result}">
            <div class="entry-header">
                <span class="entry-symbol">${trade.symbol?.toUpperCase()}</span>
                <span class="entry-result ${trade.result}">${trade.result}</span>
            </div>
            <div class="entry-pnl ${parseFloat(trade.pnl) >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(trade.pnl)}
            </div>
            ${trade.notes ? `<div class="entry-notes">${trade.notes}</div>` : ''}
        </div>
    `).join('');
    
    modal.classList.add('active');
}

document.getElementById('prev-month')?.addEventListener('click', () => {
    journal.currentDate.setMonth(journal.currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
    journal.currentDate.setMonth(journal.currentDate.getMonth() + 1);
    renderCalendar();
});

document.querySelector('.close-day-modal')?.addEventListener('click', () => {
    document.getElementById('day-modal').classList.remove('active');
});

// Screenshots
function updateScreenshotsView() {
    const folderSelect = document.getElementById('folder-select');
    const uploadControls = document.getElementById('uploadControls');
    const container = document.getElementById('folders-container');
    
    // Update folder select
    folderSelect.innerHTML = '<option value="">Select folder...</option>';
    journal.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        folderSelect.appendChild(option);
    });
    
    // Show upload controls if folders exist
    uploadControls.style.display = journal.folders.length > 0 ? 'flex' : 'none';
    
    // Render folders
    if (journal.folders.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">Create a folder to start uploading screenshots</div>';
        return;
    }
    
    container.innerHTML = journal.folders.map(folder => {
        const images = journal.screenshots[folder] || [];
        return `
            <div class="folder">
                <div class="folder-header">
                    <span class="folder-name">📁 ${folder}</span>
                    <button class="btn-icon" onclick="deleteFolder('${folder}')" title="Delete folder">🗑️</button>
                </div>
                <div class="folder-images">
                    ${images.length === 0 ? '<div class="empty-folder">No screenshots yet</div>' : ''}
                    ${images.map(img => `
                        <div class="folder-image" onclick="viewImage('${img.data}')">
                            <img src="${img.data}" alt="Screenshot" loading="lazy">
                            <button class="image-delete" onclick="event.stopPropagation(); deleteScreenshot('${folder}', '${img.id}')">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('create-folder')?.addEventListener('click', () => {
    const input = document.getElementById('new-folder-name');
    const name = input.value.trim();
    
    if (!name) {
        showToast('Enter a folder name', 'error');
        return;
    }
    
    if (journal.createFolder(name)) {
        input.value = '';
        showToast('Folder created');
        updateScreenshotsView();
    } else {
        showToast('Folder already exists', 'error');
    }
});

document.getElementById('screenshot-upload')?.addEventListener('change', (e) => {
    const folder = document.getElementById('folder-select').value;
    if (!folder) {
        showToast('Select a folder first', 'error');
        e.target.value = '';
        return;
    }
    
    const files = Array.from(e.target.files);
    let uploaded = 0;
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (journal.addScreenshot(folder, event.target.result)) {
                uploaded++;
                if (uploaded === files.length) {
                    showToast(`${uploaded} screenshot(s) uploaded`);
                    updateScreenshotsView();
                }
            }
        };
        reader.readAsDataURL(file);
    });
    
    e.target.value = '';
});

function deleteFolder(name) {
    if (!confirm(`Delete "${name}" and all its screenshots?`)) return;
    journal.deleteFolder(name);
    showToast('Folder deleted');
    updateScreenshotsView();
}

function deleteScreenshot(folder, id) {
    if (!confirm('Delete this screenshot?')) return;
    journal.deleteScreenshot(folder, id);
    showToast('Screenshot deleted');
    updateScreenshotsView();
}

function viewImage(data) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-image');
    img.src = data;
    modal.classList.add('active');
}

document.querySelector('.image-modal-close')?.addEventListener('click', () => {
    document.getElementById('image-modal').classList.remove('active');
});

// Analytics
function updateAnalytics() {
    // Monthly Performance
    const monthlyData = journal.getTradesByMonth();
    const months = Object.keys(monthlyData).sort();
    
    if (charts.monthly) charts.monthly.destroy();
    charts.monthly = new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data: {
            labels: months.map(m => {
                const [y, month] = m.split('-');
                return `${month}/${y.slice(2)}`;
            }),
            datasets: [{
                label: 'P&L ($)',
                data: months.map(m => monthlyData[m].pnl),
                backgroundColor: months.map(m => monthlyData[m].pnl >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
            }
        }
    });

    // Symbol Performance
    const symbolData = journal.getTradesBySymbol();
    const symbols = Object.keys(symbolData);
    
    if (charts.symbol) charts.symbol.destroy();
    charts.symbol = new Chart(document.getElementById('symbolChart'), {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [{
                label: 'Win Rate %',
                data: symbols.map(s => ((symbolData[s].wins / symbolData[s].total) * 100).toFixed(1)),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
            }
        }
    });

    // Strategy Performance
    const strategyData = journal.getTradesByStrategy();
    const strategies = Object.keys(strategyData);
    
    if (charts.strategy) charts.strategy.destroy();
    charts.strategy = new Chart(document.getElementById('strategyChart'), {
        type: 'doughnut',
        data: {
            labels: strategies,
            datasets: [{
                data: strategies.map(s => strategyData[s].total),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f9fafb', padding: 20 } }
            }
        }
    });

    // Equity Curve
    const equityData = journal.getEquityCurve();
    
    if (charts.equity) charts.equity.destroy();
    charts.equity = new Chart(document.getElementById('equityChart'), {
        type: 'line',
        data: {
            labels: equityData.map(d => d.trade),
            datasets: [{
                label: 'Equity',
                data: equityData.map(d => d.equity),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                x: { display: false }
            }
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
});
