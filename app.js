// Data Store
let data = {
    entries: [],
    screenshots: [],
    folders: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'],
    currentFolder: 'all'
};

let currentEntryId = null;
let currentScreenshotId = null;
let currentDate = new Date();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderCalendar();
    updateStats();
    renderEntriesList();
    renderFolders();
    renderScreenshots();
    updateStorageInfo();

    // Set today's date in entry form
    document.getElementById('entry-date').valueAsDate = new Date();
});

// Data Persistence
function saveData() {
    localStorage.setItem('tradeJournalData', JSON.stringify(data));
    updateStorageInfo();
}

function loadData() {
    const saved = localStorage.getItem('tradeJournalData');
    if (saved) {
        data = JSON.parse(saved);
        if (!data.folders) data.folders = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];
    }
}

// Navigation
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(section + '-section').classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (section === 'analytics') {
        setTimeout(renderCharts, 100);
    }
}

// Calendar Functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById('current-month-year').textContent =
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayEl = createDayElement(day, true);
        grid.appendChild(dayEl);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = createDayElement(day, false, dateStr);
        grid.appendChild(dayEl);
    }

    // Next month days
    const remainingCells = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createDayElement(day, true);
        grid.appendChild(dayEl);
    }
}

function createDayElement(day, isOtherMonth, dateStr = null) {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOtherMonth ? ' other-month' : '');

    const dayNum = document.createElement('div');
    dayNum.className = 'day-number';
    dayNum.textContent = day;
    div.appendChild(dayNum);

    if (dateStr && !isOtherMonth) {
        const dayData = getDayData(dateStr);
        if (dayData.pnl !== 0) {
            const pnlEl = document.createElement('div');
            pnlEl.className = 'day-pnl ' + (dayData.pnl >= 0 ? 'profit' : 'loss');
            pnlEl.textContent = (dayData.pnl >= 0 ? '+' : '') + dayData.pnl.toFixed(0);
            div.appendChild(pnlEl);
        }

        if (dayData.screenshots > 0) {
            const ssEl = document.createElement('div');
            ssEl.className = 'day-screenshots';
            ssEl.innerHTML = `<i class="fas fa-image"></i> ${dayData.screenshots}`;
            div.appendChild(ssEl);
        }

        if (dayData.entries > 0) {
            div.style.border = '1px solid var(--primary)';
        }

        div.onclick = () => showDayEntries(dateStr);
    }

    return div;
}

function getDayData(dateStr) {
    const entries = data.entries.filter(e => e.date === dateStr);
    const screenshots = data.screenshots.filter(s => s.date === dateStr);

    const pnl = entries.reduce((sum, e) => sum + (parseFloat(e.pnl) || 0), 0);

    return {
        pnl: pnl,
        entries: entries.length,
        screenshots: screenshots.length
    };
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function showDayEntries(dateStr) {
    const entries = data.entries.filter(e => e.date === dateStr);
    const list = document.getElementById('day-entries-list');
    list.innerHTML = '';

    if (entries.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted);">No entries for this day.</p>';
    } else {
        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'journal-entry-item animate-in';
            div.innerHTML = `
                        <div class="entry-date">${entry.date}</div>
                        <div class="entry-title">${entry.title}</div>
                        <div class="entry-pnl ${entry.pnl >= 0 ? 'profit' : 'loss'}">
                            ${entry.pnl >= 0 ? '+' : ''}$${entry.pnl}
                        </div>
                        <div style="margin-top: 0.5rem;">
                            <button class="btn btn-primary" onclick="editEntry('${entry.id}'); closeModal('entry-modal'); showSection('journal');" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                                Edit
                            </button>
                        </div>
                    `;
            list.appendChild(div);
        });
    }

    document.getElementById('entry-modal').classList.add('active');
}

// Journal Functions
function createNewEntry() {
    clearForm();
    document.getElementById('entry-date').valueAsDate = new Date();
}

function saveEntry() {
    const entry = {
        id: currentEntryId || Date.now().toString(),
        date: document.getElementById('entry-date').value,
        title: document.getElementById('entry-title').value,
        instrument: document.getElementById('entry-instrument').value.toUpperCase(),
        direction: document.getElementById('entry-direction').value,
        pnl: parseFloat(document.getElementById('entry-pnl').value) || 0,
        content: document.getElementById('entry-content').value,
        tags: document.getElementById('entry-tags').value.split(',').map(t => t.trim()).filter(t => t),
        createdAt: currentEntryId ? data.entries.find(e => e.id === currentEntryId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (!entry.title || !entry.date) {
        alert('Please fill in at least the title and date');
        return;
    }

    if (currentEntryId) {
        const index = data.entries.findIndex(e => e.id === currentEntryId);
        data.entries[index] = entry;
    } else {
        data.entries.push(entry);
    }

    saveData();
    renderEntriesList();
    renderCalendar();
    updateStats();
    clearForm();

    // Auto-create folder for instrument if new
    if (entry.instrument && !data.folders.includes(entry.instrument)) {
        data.folders.push(entry.instrument);
        renderFolders();
    }
}

function editEntry(id) {
    const entry = data.entries.find(e => e.id === id);
    if (!entry) return;

    currentEntryId = id;
    document.getElementById('entry-date').value = entry.date;
    document.getElementById('entry-title').value = entry.title;
    document.getElementById('entry-instrument').value = entry.instrument;
    document.getElementById('entry-direction').value = entry.direction;
    document.getElementById('entry-pnl').value = entry.pnl;
    document.getElementById('entry-content').value = entry.content;
    document.getElementById('entry-tags').value = entry.tags.join(', ');
    document.getElementById('delete-entry-btn').style.display = 'inline-flex';

    updateLinkedScreenshots(entry.instrument);
}

function deleteCurrentEntry() {
    if (!currentEntryId) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;

    data.entries = data.entries.filter(e => e.id !== currentEntryId);
    saveData();
    renderEntriesList();
    renderCalendar();
    updateStats();
    clearForm();
}

function clearForm() {
    currentEntryId = null;
    document.getElementById('entry-form').reset();
    document.getElementById('entry-date').valueAsDate = new Date();
    document.getElementById('delete-entry-btn').style.display = 'none';
    document.getElementById('linked-screenshots').innerHTML = '';
}

function renderEntriesList() {
    const list = document.getElementById('entries-list');
    list.innerHTML = '';

    const sorted = [...data.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'journal-entry-item' + (entry.id === currentEntryId ? ' active' : '');
        div.onclick = () => editEntry(entry.id);
        div.innerHTML = `
                    <div class="entry-date">${entry.date} ${entry.instrument ? '• ' + entry.instrument : ''}</div>
                    <div class="entry-title">${entry.title}</div>
                    <div class="entry-pnl ${entry.pnl >= 0 ? 'profit' : 'loss'}">
                        ${entry.pnl >= 0 ? '+' : ''}$${entry.pnl}
                    </div>
                    ${entry.tags.length ? `<div class="tags-container">${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
                `;
        list.appendChild(div);
    });
}

function searchEntries(query) {
    const items = document.querySelectorAll('.journal-entry-item');
    const lower = query.toLowerCase();

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(lower) ? 'block' : 'none';
    });
}

function updateLinkedScreenshots(instrument) {
    const container = document.getElementById('linked-screenshots');
    container.innerHTML = '';

    if (!instrument) return;

    const linked = data.screenshots.filter(s => s.folder === instrument || s.name.includes(instrument));
    linked.forEach(ss => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `<i class="fas fa-image"></i> ${ss.name}`;
        container.appendChild(tag);
    });
}

// Screenshots Functions
function renderFolders() {
    const container = document.getElementById('folder-tabs');
    // Keep All tab and New Folder button
    const staticTabs = Array.from(container.children).slice(0, 2);
    container.innerHTML = '';
    staticTabs.forEach(t => container.appendChild(t));

    data.folders.forEach(folder => {
        const tab = document.createElement('div');
        tab.className = 'folder-tab' + (data.currentFolder === folder ? ' active' : '');
        tab.innerHTML = `<span onclick="selectFolder('${folder}')">${folder}</span>`;
        container.insertBefore(tab, container.lastElementChild);
    });
}

function selectFolder(folder) {
    data.currentFolder = folder;
    renderFolders();
    renderScreenshots();
}

function createNewFolder() {
    const name = prompt('Enter folder name (e.g., XAUUSD):');
    if (name && !data.folders.includes(name)) {
        data.folders.push(name.toUpperCase());
        saveData();
        renderFolders();
    }
}

function handleScreenshotUpload(event) {
    const files = Array.from(event.target.files);
    const folder = data.currentFolder === 'all' ? 'Uncategorized' : data.currentFolder;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const screenshot = {
                id: Date.now().toString() + Math.random(),
                name: file.name,
                data: e.target.result,
                folder: folder,
                date: new Date().toISOString().split('T')[0],
                uploadedAt: new Date().toISOString()
            };
            data.screenshots.push(screenshot);
            saveData();
            renderScreenshots();
        };
        reader.readAsDataURL(file);
    });
}

function renderScreenshots() {
    const grid = document.getElementById('screenshots-grid');
    const uploadArea = grid.firstElementChild;
    grid.innerHTML = '';
    grid.appendChild(uploadArea);

    const filtered = data.currentFolder === 'all'
        ? data.screenshots
        : data.screenshots.filter(s => s.folder === data.currentFolder);

    filtered.forEach(ss => {
        const div = document.createElement('div');
        div.className = 'screenshot-item animate-in';
        div.innerHTML = `
                    <img src="${ss.data}" alt="${ss.name}">
                    <div class="screenshot-overlay">
                        <button class="btn btn-primary" onclick="viewScreenshot('${ss.id}')"><i class="fas fa-eye"></i></button>
                    </div>
                    ${ss.folder ? '<div class="linked-badge"><i class="fas fa-link"></i></div>' : ''}
                `;
        grid.appendChild(div);
    });
}

function viewScreenshot(id) {
    const ss = data.screenshots.find(s => s.id === id);
    if (!ss) return;

    currentScreenshotId = id;
    document.getElementById('preview-image').src = ss.data;
    document.getElementById('image-modal-title').textContent = ss.name + ' (' + ss.folder + ')';
    document.getElementById('image-modal').classList.add('active');
}

function deleteScreenshot() {
    if (!currentScreenshotId) return;
    if (!confirm('Delete this screenshot?')) return;

    data.screenshots = data.screenshots.filter(s => s.id !== currentScreenshotId);
    saveData();
    renderScreenshots();
    closeModal('image-modal');
}

// Analytics
function updateStats() {
    const entries = data.entries;
    const total = entries.length;
    const wins = entries.filter(e => e.pnl > 0).length;
    const totalPnl = entries.reduce((sum, e) => sum + e.pnl, 0);
    const avgTrade = total > 0 ? totalPnl / total : 0;
    const best = entries.length > 0 ? Math.max(...entries.map(e => e.pnl)) : 0;
    const worst = entries.length > 0 ? Math.min(...entries.map(e => e.pnl)) : 0;

    document.getElementById('total-trades').textContent = total;
    document.getElementById('win-rate').textContent = total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('total-pnl').textContent = (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2);
    document.getElementById('total-pnl').className = 'stat-value ' + (totalPnl >= 0 ? 'profit' : 'loss');
    document.getElementById('avg-trade').textContent = (avgTrade >= 0 ? '+' : '') + '$' + avgTrade.toFixed(2);
    document.getElementById('best-trade').textContent = '+$' + best.toFixed(2);
    document.getElementById('worst-trade').textContent = '$' + worst.toFixed(2);
}

function renderCharts() {
    // Win Rate by Instrument
    const instruments = {};
    data.entries.forEach(e => {
        const inst = e.instrument || 'Unknown';
        if (!instruments[inst]) instruments[inst] = { wins: 0, total: 0 };
        instruments[inst].total++;
        if (e.pnl > 0) instruments[inst].wins++;
    });

    const winRateCtx = document.getElementById('winRateChart').getContext('2d');
    new Chart(winRateCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(instruments),
            datasets: [{
                label: 'Win Rate %',
                data: Object.values(instruments).map(i => (i.wins / i.total * 100).toFixed(1)),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });

    // P&L Over Time
    const dateMap = {};
    data.entries.forEach(e => {
        if (!dateMap[e.date]) dateMap[e.date] = 0;
        dateMap[e.date] += e.pnl;
    });

    const sortedDates = Object.keys(dateMap).sort();
    let cumulative = 0;
    const cumulativePnl = sortedDates.map(d => {
        cumulative += dateMap[d];
        return cumulative;
    });

    const pnlCtx = document.getElementById('pnlChart').getContext('2d');
    new Chart(pnlCtx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Cumulative P&L',
                data: cumulativePnl,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Trade Distribution
    const wins = data.entries.filter(e => e.pnl > 0).length;
    const losses = data.entries.filter(e => e.pnl < 0).length;
    const breakeven = data.entries.filter(e => e.pnl === 0).length;

    const distCtx = document.getElementById('distributionChart').getContext('2d');
    new Chart(distCtx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses', 'Breakeven'],
            datasets: [{
                data: [wins, losses, breakeven],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });

    // Monthly Performance
    const monthly = {};
    data.entries.forEach(e => {
        const month = e.date.substring(0, 7);
        if (!monthly[month]) monthly[month] = 0;
        monthly[month] += e.pnl;
    });

    const monthCtx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(monthCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: 'Monthly P&L',
                data: Object.values(monthly),
                backgroundColor: Object.values(monthly).map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: Object.values(monthly).map(v => v >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Data Management
function exportData() {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCSV() {
    const headers = ['Date', 'Title', 'Instrument', 'Direction', 'P&L', 'Tags', 'Content'];
    const rows = data.entries.map(e => [
        e.date,
        `"${e.title}"`,
        e.instrument,
        e.direction,
        e.pnl,
        `"${e.tags.join(', ')}"`,
        `"${e.content.replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm(`Import ${imported.entries?.length || 0} entries and ${imported.screenshots?.length || 0} screenshots? This will merge with existing data.`)) {
                data.entries = [...data.entries, ...(imported.entries || [])];
                data.screenshots = [...data.screenshots, ...(imported.screenshots || [])];
                if (imported.folders) {
                    imported.folders.forEach(f => {
                        if (!data.folders.includes(f)) data.folders.push(f);
                    });
                }
                saveData();
                location.reload();
            }
        } catch (err) {
            alert('Error importing file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (!confirm('WARNING: This will permanently delete ALL data. Are you sure?')) return;
    if (!confirm('Really sure? This cannot be undone.')) return;

    localStorage.removeItem('tradeJournalData');
    location.reload();
}

function updateStorageInfo() {
    const bytes = new Blob([JSON.stringify(data)]).size;
    const kb = (bytes / 1024).toFixed(2);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    document.getElementById('storage-info').textContent =
        `Using ${kb} KB (${mb} MB) of local storage • ${data.entries.length} entries • ${data.screenshots.length} screenshots`;
}

// Utilities
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modals on outside click
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};