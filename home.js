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

            getRecentTrades(limit = 5) {
                return this.trades.slice(0, limit);
            }

            getTradesByDate(dateStr) {
                return this.trades.filter(t => t.date === dateStr);
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
            toast.innerHTML = `
                <span>${type === 'success' ? '✓' : '✕'}</span>
                <span>${message}</span>
            `;
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

        // Chart.js Defaults
        Chart.defaults.color = 'rgba(245, 245, 245, 0.7)';
        Chart.defaults.borderColor = 'rgba(207, 157, 123, 0.1)';
        Chart.defaults.font.family = 'Inter';

        // ==================== DASHBOARD SPECIFIC ====================
        
        function updateDashboard() {
            const stats = journal.getStats();
            
            // Update stats
            const totalPnlEl = document.getElementById('total-pnl');
            totalPnlEl.textContent = formatCurrency(stats.totalPnL);
            totalPnlEl.className = 'stat-value ' + (stats.totalPnL >= 0 ? 'positive' : 'negative');
            
            document.getElementById('win-rate').textContent = stats.winRate + '%';
            document.getElementById('profit-factor').textContent = stats.profitFactor;
            
            const avgTradeEl = document.getElementById('avg-trade');
            avgTradeEl.textContent = formatCurrency(stats.avgTrade);
            avgTradeEl.className = 'stat-value ' + (parseFloat(stats.avgTrade) >= 0 ? 'positive' : 'negative');
            
            document.getElementById('win-count').textContent = stats.wins + ' wins';
            document.getElementById('loss-count').textContent = stats.losses + ' losses';
            
            // Update sidebar mini stats
            document.getElementById('mini-total').textContent = stats.total;
            document.getElementById('mini-winrate').textContent = stats.winRate + '%';
            const miniPnl = document.getElementById('mini-pnl');
            miniPnl.textContent = formatCurrency(stats.totalPnL);
            miniPnl.className = 'mini-stat-value ' + (stats.totalPnL >= 0 ? 'positive' : 'negative');
            
            // Recent trades
            const recentList = document.getElementById('recent-trades');
            const recent = journal.getRecentTrades(5);
            
            if (recent.length === 0) {
                recentList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No trades yet. Start by adding your first trade!</div>';
            } else {
                recentList.innerHTML = recent.map(trade => `
                    <div class="trade-item">
                        <div class="trade-info">
                            <div>
                                <div class="trade-symbol">${trade.symbol.toUpperCase()}</div>
                                <div class="trade-meta">${trade.direction} • ${new Date(trade.date).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div class="trade-pnl" style="color: ${parseFloat(trade.pnl) >= 0 ? 'var(--win)' : 'var(--loss)'}">
                            ${formatCurrency(trade.pnl)}
                        </div>
                    </div>
                `).join('');
            }
            
            // Equity Curve Chart
            const equityCtx = document.getElementById('equityChart');
            if (equityCtx) {
                const equityData = journal.getEquityCurve();
                new Chart(equityCtx, {
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
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value.toFixed(0);
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        }
                    }
                });
            }
            
            // Distribution Chart
            const distCtx = document.getElementById('distributionChart');
            if (distCtx) {
                new Chart(distCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Wins', 'Losses', 'Breakeven'],
                        datasets: [{
                            data: [stats.wins, stats.losses, stats.breakevens],
                            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            }
                        }
                    }
                });
            }
        }

        document.addEventListener('DOMContentLoaded', updateDashboard);