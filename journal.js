class TradeJournal {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('trades')) || [];
        this.folders = JSON.parse(localStorage.getItem('folders')) || [];
        this.screenshots = JSON.parse(localStorage.getItem('screenshots')) || {};
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
    getStats() {
        const total = this.trades.length;
        const wins = this.trades.filter(t => t.result === 'win').length;
        const losses = this.trades.filter(t => t.result === 'loss').length;
        const breakevens = this.trades.filter(t => t.result === 'breakeven').length;
        const totalPnL = this.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
        const grossProfit = this.trades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0);
        const grossLoss = Math.abs(this.trades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0));
        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';
        const avgTrade = total > 0 ? (totalPnL / total).toFixed(2) : 0;
        return { total, wins, losses, breakevens, winRate, totalPnL, profitFactor, avgTrade };
    }
}

const journal = new TradeJournal();
let currentEditId = null;

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return (num >= 0 ? '+' : '') + '$' + Math.abs(num).toFixed(2);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function updateMiniStats() {
    const stats = journal.getStats();
    document.getElementById('mini-total').textContent = stats.total;
    document.getElementById('mini-winrate').textContent = stats.winRate + '%';
    const miniPnl = document.getElementById('mini-pnl');
    miniPnl.textContent = formatCurrency(stats.totalPnL);
    miniPnl.className = 'mini-stat-value ' + (stats.totalPnL >= 0 ? 'positive' : 'negative');
}

document.getElementById('trade-date').valueAsDate = new Date();

document.getElementById('tradeForm').addEventListener('submit', (e) => {
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
    showToast('Trade saved successfully!');
    updateEntriesList();
    updateSymbolFilter();
    updateMiniStats();
});

function updateEntriesList() {
    const container = document.getElementById('entriesList');
    const symbolFilter = document.getElementById('filter-symbol').value;
    const resultFilter = document.getElementById('filter-result').value;

    let filtered = journal.trades;
    if (symbolFilter) filtered = filtered.filter(t => t.symbol?.toUpperCase() === symbolFilter);
    if (resultFilter) filtered = filtered.filter(t => t.result === resultFilter);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">No trades found. Start by adding your first trade!</div>';
        return;
    }

    container.innerHTML = filtered.map(trade => `
                <div class="entry-card ${trade.result}">
                    <div class="entry-header">
                        <div class="entry-title">
                            <span class="entry-symbol">${trade.symbol?.toUpperCase() || 'Unknown'}</span>
                            <span class="entry-direction">${trade.direction}</span>
                            <span class="badge badge-${trade.result}">${trade.result}</span>
                        </div>
                        <div style="font-weight: 700; color: ${parseFloat(trade.pnl) >= 0 ? 'var(--win)' : 'var(--loss)'};">
                            ${formatCurrency(trade.pnl)}
                        </div>
                    </div>
                    <div class="entry-details">
                        <div class="entry-detail">
                            <span class="entry-detail-label">Entry</span>
                            <span class="entry-detail-value">$${trade.entryPrice}</span>
                        </div>
                        <div class="entry-detail">
                            <span class="entry-detail-label">Exit</span>
                            <span class="entry-detail-value">$${trade.exitPrice}</span>
                        </div>
                        <div class="entry-detail">
                            <span class="entry-detail-label">Date</span>
                            <span class="entry-detail-value">${new Date(trade.date).toLocaleDateString()}</span>
                        </div>
                        ${trade.rr ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">R:R</span>
                            <span class="entry-detail-value">${trade.rr}</span>
                        </div>` : ''}
                        ${trade.strategy ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Strategy</span>
                            <span class="entry-detail-value">${trade.strategy}</span>
                        </div>` : ''}
                    </div>
                    ${trade.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${trade.notes}</div>` : ''}
                    ${trade.lessons ? `<div class="entry-notes"><strong>Lessons:</strong> ${trade.lessons}</div>` : ''}
                    <div class="entry-actions">
                        <button class="btn btn-secondary btn-icon" onclick="openEditModal('${trade.id}')" title="Edit">✏️</button>
                        <button class="btn btn-secondary btn-icon" onclick="deleteTrade('${trade.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            `).join('');
}

function updateSymbolFilter() {
    const select = document.getElementById('filter-symbol');
    const currentVal = select.value;
    const symbols = [...new Set(journal.trades.map(t => t.symbol?.toUpperCase()).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All Symbols</option>';
    symbols.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym;
        option.textContent = sym;
        select.appendChild(option);
    });
    select.value = currentVal;
}

function deleteTrade(id) {
    if (!confirm('Delete this trade permanently?')) return;
    if (journal.deleteTrade(id)) {
        showToast('Trade deleted');
        updateEntriesList();
        updateMiniStats();
    }
}

function openEditModal(id) {
    const trade = journal.trades.find(t => t.id === id);
    if (!trade) return;
    currentEditId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-symbol').value = trade.symbol || '';
    document.getElementById('edit-result').value = trade.result || 'win';
    document.getElementById('edit-pnl').value = trade.pnl || '';
    document.getElementById('edit-strategy').value = trade.strategy || '';
    document.getElementById('edit-notes').value = trade.notes || '';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditId = null;
}

function deleteCurrentTrade() {
    if (currentEditId && journal.deleteTrade(currentEditId)) {
        showToast('Trade deleted');
        closeEditModal();
        updateEntriesList();
        updateMiniStats();
    }
}

document.getElementById('editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const updates = {
        symbol: document.getElementById('edit-symbol').value.trim(),
        result: document.getElementById('edit-result').value,
        pnl: document.getElementById('edit-pnl').value,
        strategy: document.getElementById('edit-strategy').value.trim(),
        notes: document.getElementById('edit-notes').value.trim()
    };
    if (journal.updateTrade(currentEditId, updates)) {
        showToast('Trade updated');
        closeEditModal();
        updateEntriesList();
        updateMiniStats();
    }
});

document.getElementById('filter-symbol').addEventListener('change', updateEntriesList);
document.getElementById('filter-result').addEventListener('change', updateEntriesList);

document.addEventListener('DOMContentLoaded', () => {
    updateEntriesList();
    updateSymbolFilter();
    updateMiniStats();
});