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
}

const journal = new TradeJournal();

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

function renderFolders() {
    const container = document.getElementById('foldersGrid');

    if (journal.folders.length === 0) {
        container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">📁</div>
                        <h3>No folders yet</h3>
                        <p>Create a folder to start organizing your screenshots</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = journal.folders.map(folder => {
        const images = journal.screenshots[folder] || [];
        return `
                    <div class="folder-card">
                        <div class="folder-header">
                            <div class="folder-title">
                                <span>📁</span>
                                <span>${folder}</span>
                                <span style="color: var(--text-muted); font-size: 0.85rem;">(${images.length})</span>
                            </div>
                            <button class="btn" onclick="deleteFolder('${folder}')" style="color: var(--loss); padding: 8px 12px;">🗑️</button>
                        </div>
                        <label class="upload-area">
                            <input type="file" accept="image/*" multiple onchange="uploadImages('${folder}', this)">
                            <div>📷 Click or drop images here</div>
                        </label>
                        <div class="folder-images">
                            ${images.length === 0 ? '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">No images yet</div>' : ''}
                            ${images.map(img => `
                                <div class="folder-image" onclick="viewImage('${img.data}')">
                                    <img src="${img.data}" alt="Screenshot" loading="lazy">
                                    <button class="image-delete" onclick="event.stopPropagation(); deleteImage('${folder}', '${img.id}')">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    }).join('');
}

function createFolder() {
    const input = document.getElementById('folderName');
    const name = input.value.trim();

    if (!name) {
        showToast('Enter a folder name', 'error');
        return;
    }

    if (journal.folders.includes(name)) {
        showToast('Folder already exists', 'error');
        return;
    }

    journal.folders.push(name);
    journal.screenshots[name] = [];
    journal.save();

    input.value = '';
    showToast('Folder created');
    renderFolders();
}

function deleteFolder(name) {
    if (!confirm(`Delete "${name}" and all its images?`)) return;

    journal.folders = journal.folders.filter(f => f !== name);
    delete journal.screenshots[name];
    journal.save();

    showToast('Folder deleted');
    renderFolders();
}

function uploadImages(folder, input) {
    const files = Array.from(input.files);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            journal.screenshots[folder].push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                data: e.target.result,
                date: new Date().toISOString()
            });
            journal.save();
            renderFolders();
        };
        reader.readAsDataURL(file);
    });

    showToast(`${files.length} image(s) uploaded`);
}

function deleteImage(folder, id) {
    if (!confirm('Delete this image?')) return;

    journal.screenshots[folder] = journal.screenshots[folder].filter(img => img.id !== id);
    journal.save();
    renderFolders();
}

function viewImage(data) {
    document.getElementById('modalImage').src = data;
    document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    renderFolders();
    updateMiniStats();
});