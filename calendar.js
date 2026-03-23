class TradeJournal {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('trades')) || [];
        this.folders = JSON.parse(localStorage.getItem('folders')) || [];
        this.screenshots = JSON.parse(localStorage.getItem('screenshots')) || {};
    }
    getTradesByDate(dateStr) {
        return this.trades.filter(t => t.date === dateStr);
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
let currentDate = new Date();

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return (num >= 0 ? '+' : '') + '$' + Math.abs(num).toFixed(2);
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

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById('calendarTitle').textContent =
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-weekday';
        div.textContent = day;
        grid.appendChild(div);
    });

    for (let i = firstDay - 1; i >= 0; i--) {
        grid.appendChild(createDayElement(daysInPrevMonth - i, true));
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrades = journal.getTradesByDate(dateStr);
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        grid.appendChild(createDayElement(day, false, dayTrades, dateStr, isToday));
    }

    const totalCells = grid.children.length - 7;
    const remaining = 35 - totalCells;
    for (let day = 1; day <= remaining; day++) {
        grid.appendChild(createDayElement(day, true));
    }
}

function createDayElement(day, isOtherMonth, trades = [], dateStr = '', isToday = false) {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOtherMonth ? ' other-month' : '') + (isToday ? ' today' : '');

    // Calculate daily P&L
    const dailyPnL = trades.reduce((sum, trade) => sum + (parseFloat(trade.pnl) || 0), 0);
    const hasTrades = trades.length > 0;

    // Build inner HTML with P&L display
    let innerHTML = `<span class="calendar-day-number">${day}</span>`;

    if (hasTrades) {
        const pnlColor = dailyPnL >= 0 ? 'var(--win)' : 'var(--loss)';
        const pnlSign = dailyPnL >= 0 ? '+' : '';

        innerHTML += `
            <div class="day-pnl" style="
                font-size: 0.75rem;
                font-weight: 700;
                color: ${pnlColor};
                margin-bottom: 4px;
                text-align: center;
            ">
                ${pnlSign}$${Math.abs(dailyPnL).toFixed(0)}
            </div>
        `;
    }

    div.innerHTML = innerHTML;

    if (hasTrades) {
        const tradesDiv = document.createElement('div');
        tradesDiv.className = 'calendar-trades';

        trades.forEach(trade => {
            const dot = document.createElement('div');
            dot.className = `trade-dot ${trade.result}`;
            tradesDiv.appendChild(dot);
        });

        div.appendChild(tradesDiv);
        div.addEventListener('click', () => showDayTrades(dateStr, trades, dailyPnL));
    }

    return div;
}

function showDayTrades(dateStr, trades, dailyTotal = 0) {
    const pnlColor = dailyTotal >= 0 ? 'var(--win)' : 'var(--loss)';

    let summaryHTML = `
    <div style="
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-xs);
        padding: 16px;
        margin-bottom: 16px;
        text-align: center;
    ">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Daily P&L</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: ${pnlColor};">
            ${formatCurrency(dailyTotal)}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            ${trades.length} trade${trades.length !== 1 ? 's' : ''}
        </div>
    </div>
`;
    document.getElementById('dayModalContent').innerHTML = summaryHTML + tradesHTML;
    document.getElementById('dayModalTitle').textContent = `Trades - ${new Date(dateStr).toLocaleDateString()}`;
    document.getElementById('dayModalContent').innerHTML = trades.map(trade => `
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-xs); padding: 16px; margin-bottom: 12px; border-left: 4px solid ${trade.result === 'win' ? 'var(--win)' : trade.result === 'loss' ? 'var(--loss)' : 'var(--breakeven)'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 1.1rem;">${trade.symbol?.toUpperCase()}</span>
                        <span style="font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; background: ${trade.result === 'win' ? 'rgba(16,185,129,0.15)' : trade.result === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color: ${trade.result === 'win' ? 'var(--win)' : trade.result === 'loss' ? 'var(--loss)' : 'var(--breakeven)'}">${trade.result}</span>
                    </div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: ${parseFloat(trade.pnl) >= 0 ? 'var(--win)' : 'var(--loss)'}; margin-bottom: 8px;">
                        ${formatCurrency(trade.pnl)}
                    </div>
                    ${trade.notes ? `<div style="font-size: 0.9rem; color: var(--text-secondary);">${trade.notes}</div>` : ''}
                </div>
            `).join('');
    document.getElementById('dayModal').classList.add('active');
}

function closeDayModal() {
    document.getElementById('dayModal').classList.remove('active');
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    updateMiniStats();
});