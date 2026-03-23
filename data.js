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
    getStats() {
        const total = this.trades.length;
        const wins = this.trades.filter(t => t.result === 'win').length;
        const losses = this.trades.filter(t => t.result === 'loss').length;
        const totalPnL = this.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
        return { total, wins, losses, winRate, totalPnL };
    }
    getScreenshotCount() {
        return Object.values(this.screenshots).reduce((sum, arr) => sum + arr.length, 0);
    }
}

const journal = new TradeJournal();
let importDataTemp = null;

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

function updateExportStats() {
    document.getElementById('export-trades').textContent = journal.trades.length;
    document.getElementById('export-folders').textContent = journal.folders.length;
    document.getElementById('export-screenshots').textContent = journal.getScreenshotCount();
}

function exportData() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        trades: journal.trades,
        folders: journal.folders,
        screenshots: journal.screenshots
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Data exported successfully!');
}

function previewImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            importDataTemp = data;

            // Validate data structure
            if (!data.trades || !Array.isArray(data.trades)) {
                throw new Error('Invalid backup file: trades array missing');
            }

            const preview = {
                trades: data.trades.length,
                folders: (data.folders || []).length,
                screenshots: Object.values(data.screenshots || {}).reduce((sum, arr) => sum + arr.length, 0),
                exportDate: data.exportDate ? new Date(data.exportDate).toLocaleString() : 'Unknown'
            };

            document.getElementById('previewContent').innerHTML = `
                        <strong>Backup Preview:</strong><br>
                        Export Date: ${preview.exportDate}<br>
                        Trades: ${preview.trades}<br>
                        Folders: ${preview.folders}<br>
                        Screenshots: ${preview.screenshots}<br><br>
                        <em>Click "Import Data" to restore this backup.</em>
                    `;

            document.getElementById('importPreview').style.display = 'block';
            document.querySelector('.file-input-label').innerHTML = `<span>📁</span> ${file.name}`;

        } catch (err) {
            showToast('Invalid backup file: ' + err.message, 'error');
            input.value = '';
        }
    };
    reader.readAsText(file);
}

function importData() {
    if (!importDataTemp) return;

    if (!confirm('This will REPLACE all current data. Are you sure?')) return;

    try {
        journal.trades = importDataTemp.trades || [];
        journal.folders = importDataTemp.folders || [];
        journal.screenshots = importDataTemp.screenshots || {};
        journal.save();

        showToast('Data imported successfully!');
        updateMiniStats();
        updateExportStats();
        cancelImport();

    } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
    }
}

function cancelImport() {
    importDataTemp = null;
    document.getElementById('importFile').value = '';
    document.getElementById('importPreview').style.display = 'none';
    document.querySelector('.file-input-label').innerHTML = '<span>📁</span> Choose backup file...';
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your data!\n\nAre you absolutely sure?')) return;

    if (!confirm('Final confirmation: Delete all trades, screenshots, and folders forever?')) return;

    journal.trades = [];
    journal.folders = [];
    journal.screenshots = {};
    journal.save();

    showToast('All data cleared');
    updateMiniStats();
    updateExportStats();
}

document.addEventListener('DOMContentLoaded', () => {
    updateMiniStats();
    updateExportStats();
});