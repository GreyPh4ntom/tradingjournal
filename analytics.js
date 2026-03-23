class TradeJournal {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('trades')) || [];
        this.folders = JSON.parse(localStorage.getItem('folders')) || [];
        this.screenshots = JSON.parse(localStorage.getItem('screenshots')) || {};
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
    getEquityCurve() {
        let equity = 0;
        return this.trades.slice().reverse().map((trade, index) => {
            equity += parseFloat(trade.pnl) || 0;
            return { trade: index + 1, equity: equity };
        });
    }
}

const journal = new TradeJournal();

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

function updateAnalytics() {
    const stats = journal.getStats();

    // Update summary stats
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-winrate').textContent = stats.winRate + '%';

    const pnlEl = document.getElementById('stat-pnl');
    pnlEl.textContent = formatCurrency(stats.totalPnL);
    pnlEl.className = 'stat-box-value ' + (stats.totalPnL >= 0 ? 'positive' : 'negative');

    const avgEl = document.getElementById('stat-avg');
    avgEl.textContent = formatCurrency(stats.avgTrade);
    avgEl.className = 'stat-box-value ' + (parseFloat(stats.avgTrade) >= 0 ? 'positive' : 'negative');

    document.getElementById('stat-pf').textContent = stats.profitFactor;

    // Calculate expectancy
    const avgWin = stats.wins > 0 ?
        journal.trades.filter(t => t.result === 'win').reduce((sum, t) => sum + parseFloat(t.pnl), 0) / stats.wins : 0;
    const avgLoss = stats.losses > 0 ?
        Math.abs(journal.trades.filter(t => t.result === 'loss').reduce((sum, t) => sum + parseFloat(t.pnl), 0)) / stats.losses : 0;
    const winRate = parseFloat(stats.winRate) / 100;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    const expEl = document.getElementById('stat-expectancy');
    expEl.textContent = formatCurrency(expectancy);
    expEl.className = 'stat-box-value ' + (expectancy >= 0 ? 'positive' : 'negative');

    // Chart defaults
    Chart.defaults.color = 'rgba(245, 245, 245, 0.7)';
    Chart.defaults.borderColor = 'rgba(207, 157, 123, 0.1)';
    Chart.defaults.font.family = 'Inter';

    // Monthly Chart
    const monthlyData = {};
    journal.trades.forEach(trade => {
        const date = new Date(trade.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = 0;
        monthlyData[key] += parseFloat(trade.pnl) || 0;
    });

    const months = Object.keys(monthlyData).sort();
    new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data: {
            labels: months.map(m => {
                const [y, month] = m.split('-');
                return `${month}/${y.slice(2)}`;
            }),
            datasets: [{
                label: 'P&L ($)',
                data: months.map(m => monthlyData[m]),
                backgroundColor: months.map(m => monthlyData[m] >= 0 ? '#10b981' : '#ef4444'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(207, 157, 123, 0.05)' },
                    ticks: { callback: v => '$' + v }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // Symbol Chart
    const symbolData = {};
    journal.trades.forEach(trade => {
        const sym = trade.symbol?.toUpperCase();
        if (!sym) return;
        if (!symbolData[sym]) symbolData[sym] = { total: 0, wins: 0, pnl: 0 };
        symbolData[sym].total++;
        symbolData[sym].pnl += parseFloat(trade.pnl) || 0;
        if (trade.result === 'win') symbolData[sym].wins++;
    });

    const symbols = Object.keys(symbolData);
    new Chart(document.getElementById('symbolChart'), {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [{
                label: 'Win Rate %',
                data: symbols.map(s => ((symbolData[s].wins / symbolData[s].total) * 100).toFixed(1)),
                backgroundColor: '#CF9D7B',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(207, 157, 123, 0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // Strategy Chart
    const strategyData = {};
    journal.trades.forEach(trade => {
        const strat = trade.strategy || 'Unspecified';
        if (!strategyData[strat]) strategyData[strat] = 0;
        strategyData[strat]++;
    });

    new Chart(document.getElementById('strategyChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(strategyData),
            datasets: [{
                data: Object.values(strategyData),
                backgroundColor: ['#CF9D7B', '#724B39', '#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { usePointStyle: true, pointStyle: 'circle' }
                }
            }
        }
    });

    // Equity Curve
    const equityData = journal.getEquityCurve();
    new Chart(document.getElementById('equityChart'), {
        type: 'line',
        data: {
            labels: equityData.map(d => d.trade),
            datasets: [{
                label: 'Equity',
                data: equityData.map(d => d.equity),
                borderColor: '#CF9D7B',
                backgroundColor: 'rgba(207, 157, 123, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: 'rgba(207, 157, 123, 0.05)' },
                    ticks: { callback: v => '$' + v.toFixed(0) }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateAnalytics();
    updateMiniStats();
});