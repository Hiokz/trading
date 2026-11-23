/**
 * Trading Command Center & Research Hub - Main Application Script
 * Modular Single-Page Architecture with LocalStorage Persistence
 */

// Application State
const state = {
    activeSection: 'technical',
    journalTrades: [],
    backtestRuns: [],
    customNotes: []
};

// Section Metadata Registry
const SECTIONS = [
    { id: 'technical', name: 'Technical Analysis', icon: 'fa-chart-line', group: 'Analysis & Models' },
    { id: 'fundamental', name: 'Fundamental Analysis', icon: 'fa-landmark', group: 'Analysis & Models' },
    { id: 'quant', name: 'Quantitative Trading', icon: 'fa-code', group: 'Analysis & Models' },
    { id: 'backtest', name: 'Backtesting Laboratory', icon: 'fa-flask-vial', group: 'Analysis & Models' },
    { id: 'news', name: 'Market News', icon: 'fa-newspaper', group: 'Market Pulse' },
    { id: 'journal', name: 'Trading Journal', icon: 'fa-book-bookmark', group: 'Execution & Risk' },
    { id: 'risk', name: 'Risk Management', icon: 'fa-shield-halved', group: 'Execution & Risk' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadStoredData();
    initNavigation();
    initCommandPalette();
    initLiveClocks();
    initRiskCalculator();
    initJournal();
    initBacktestLab();
    initModals();

    // Check URL Hash for initial navigation
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && SECTIONS.some(s => s.id === initialHash)) {
        switchSection(initialHash);
    } else {
        switchSection('technical');
    }
});

/* -------------------------------------------------------------
 * Navigation & Routing
 * ------------------------------------------------------------- */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (target) {
                switchSection(target);
            }
        });
    });
}

function switchSection(sectionId) {
    state.activeSection = sectionId;

    // Update Nav Sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.getAttribute('data-target') === sectionId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Update Sections
    document.querySelectorAll('.hub-section').forEach(sec => {
        if (sec.id === `sec-${sectionId}`) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });

    // Update Breadcrumb
    const secMeta = SECTIONS.find(s => s.id === sectionId);
    if (secMeta) {
        const breadcrumbEl = document.getElementById('header-breadcrumb-title');
        if (breadcrumbEl) breadcrumbEl.textContent = secMeta.name;
    }

    // Scroll Viewport to Top
    const viewport = document.querySelector('.content-viewport');
    if (viewport) {
        viewport.scrollTop = 0;
    }

    // Sync URL without anchor jumping
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${sectionId}`);
    } else {
        window.location.hash = sectionId;
    }
}

/* -------------------------------------------------------------
 * Command Palette (Ctrl + K)
 * ------------------------------------------------------------- */
function initCommandPalette() {
    const modal = document.getElementById('cmd-modal');
    const input = document.getElementById('cmd-search-input');
    const resultsContainer = document.getElementById('cmd-results-list');
    const openBtns = document.querySelectorAll('.btn-open-cmd');

    function openPalette() {
        if (!modal) return;
        modal.classList.add('active');
        if (input) {
            input.value = '';
            input.focus();
            renderSearchResults('');
        }
    }

    function closePalette() {
        if (!modal) return;
        modal.classList.remove('active');
    }

    openBtns.forEach(b => b.addEventListener('click', openPalette));

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (modal.classList.contains('active')) {
                closePalette();
            } else {
                openPalette();
            }
        }
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closePalette();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePalette();
    });

    if (input) {
        input.addEventListener('input', (e) => {
            renderSearchResults(e.target.value.trim().toLowerCase());
        });
    }

    function renderSearchResults(query) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '';

        const matches = SECTIONS.filter(s => 
            !query || s.name.toLowerCase().includes(query) || s.group.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            resultsContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No matching sections found.</div>`;
            return;
        }

        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cmd-item';
            div.innerHTML = `
                <div class="cmd-item-left">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.name}</span>
                </div>
                <span class="tag-badge">${item.group}</span>
            `;
            div.addEventListener('click', () => {
                switchSection(item.id);
                closePalette();
            });
            resultsContainer.appendChild(div);
        });
    }
}

/* -------------------------------------------------------------
 * Live Real-Time Date & Country Clocks
 * ------------------------------------------------------------- */
function initLiveClocks() {
    const sgDateEl = document.getElementById('date-sg');
    const sgTimeEl = document.getElementById('clock-sg');
    const idDateEl = document.getElementById('date-id');
    const idTimeEl = document.getElementById('clock-id');
    const nyDateEl = document.getElementById('date-ny');
    const nyTimeEl = document.getElementById('clock-ny');

    function update() {
        const now = new Date();

        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const timeOptions = {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };

        // Singapore (Asia/Singapore, UTC+8)
        if (sgDateEl) sgDateEl.textContent = now.toLocaleDateString('en-US', { ...dateOptions, timeZone: 'Asia/Singapore' });
        if (sgTimeEl) sgTimeEl.textContent = now.toLocaleTimeString('en-US', { ...timeOptions, timeZone: 'Asia/Singapore' });

        // Indonesia (Asia/Jakarta, UTC+7)
        if (idDateEl) idDateEl.textContent = now.toLocaleDateString('en-US', { ...dateOptions, timeZone: 'Asia/Jakarta' });
        if (idTimeEl) idTimeEl.textContent = now.toLocaleTimeString('en-US', { ...timeOptions, timeZone: 'Asia/Jakarta' });

        // US New York (America/New_York, UTC-5)
        if (nyDateEl) nyDateEl.textContent = now.toLocaleDateString('en-US', { ...dateOptions, timeZone: 'America/New_York' });
        if (nyTimeEl) nyTimeEl.textContent = now.toLocaleTimeString('en-US', { ...timeOptions, timeZone: 'America/New_York' });
    }

    update();
    setInterval(update, 1000);
}

/* -------------------------------------------------------------
 * Risk Management Calculator
 * ------------------------------------------------------------- */
function initRiskCalculator() {
    const accBalanceInput = document.getElementById('calc-acc-balance');
    const riskPercentInput = document.getElementById('calc-risk-percent');
    const entryPriceInput = document.getElementById('calc-entry-price');
    const stopLossInput = document.getElementById('calc-stop-loss');
    const takeProfitInput = document.getElementById('calc-take-profit');

    const outRiskAmount = document.getElementById('calc-out-risk-amount');
    const outPositionSize = document.getElementById('calc-out-position-size');
    const outTotalValue = document.getElementById('calc-out-total-value');
    const outRewardRisk = document.getElementById('calc-out-reward-risk');
    const outPotentialProfit = document.getElementById('calc-out-potential-profit');

    function calculate() {
        const balance = parseFloat(accBalanceInput.value) || 0;
        const riskPct = parseFloat(riskPercentInput.value) || 0;
        const entry = parseFloat(entryPriceInput.value) || 0;
        const stop = parseFloat(stopLossInput.value) || 0;
        const target = parseFloat(takeProfitInput.value) || 0;

        if (balance <= 0 || riskPct <= 0 || entry <= 0 || stop <= 0) {
            if (outRiskAmount) outRiskAmount.textContent = '$0.00';
            if (outPositionSize) outPositionSize.textContent = '0';
            if (outTotalValue) outTotalValue.textContent = '$0.00';
            if (outRewardRisk) outRewardRisk.textContent = '0.00 : 1';
            if (outPotentialProfit) outPotentialProfit.textContent = '$0.00';
            return;
        }

        const riskDollar = balance * (riskPct / 100);
        const stopDistance = Math.abs(entry - stop);

        let positionSize = 0;
        if (stopDistance > 0) {
            positionSize = riskDollar / stopDistance;
        }

        const totalPositionValue = positionSize * entry;
        const targetDistance = Math.abs(target - entry);
        const rr = stopDistance > 0 && targetDistance > 0 ? (targetDistance / stopDistance).toFixed(2) : '0.00';
        const potentialProfit = positionSize * targetDistance;

        if (outRiskAmount) outRiskAmount.textContent = formatUSD(riskDollar);
        if (outPositionSize) outPositionSize.textContent = positionSize.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (outTotalValue) outTotalValue.textContent = formatUSD(totalPositionValue);
        if (outRewardRisk) outRewardRisk.textContent = `${rr} : 1`;
        if (outPotentialProfit) outPotentialProfit.textContent = formatUSD(potentialProfit);
    }

    [accBalanceInput, riskPercentInput, entryPriceInput, stopLossInput, takeProfitInput].forEach(inp => {
        if (inp) inp.addEventListener('input', calculate);
    });

    calculate();
}

/* -------------------------------------------------------------
 * Trading Journal Logic
 * ------------------------------------------------------------- */
function initJournal() {
    const form = document.getElementById('journal-form');
    const tableBody = document.getElementById('journal-table-body');
    const emptyState = document.getElementById('journal-empty-state');
    const statTotalPnl = document.getElementById('journal-stat-total-pnl');
    const statWinRate = document.getElementById('journal-stat-win-rate');
    const statProfitFactor = document.getElementById('journal-stat-pf');
    const statTotalTrades = document.getElementById('journal-stat-total-trades');

    function renderJournal() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (state.journalTrades.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (statTotalTrades) statTotalTrades.textContent = '0';
            if (statTotalPnl) statTotalPnl.textContent = '$0.00';
            if (statWinRate) statWinRate.textContent = '0%';
            if (statProfitFactor) statProfitFactor.textContent = '0.00';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        let totalPnl = 0;
        let winCount = 0;
        let totalGain = 0;
        let totalLoss = 0;

        state.journalTrades.forEach((trade, index) => {
            const pnl = Number(trade.pnl) || 0;
            totalPnl += pnl;

            if (pnl > 0) {
                winCount++;
                totalGain += pnl;
            } else if (pnl < 0) {
                totalLoss += Math.abs(pnl);
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHTML(trade.date || '--')}</strong></td>
                <td><span class="tag-badge red">${escapeHTML(trade.ticker.toUpperCase())}</span></td>
                <td><span class="pill ${trade.direction === 'long' ? 'long' : 'short'}">${trade.direction.toUpperCase()}</span></td>
                <td>${formatUSD(trade.entry)}</td>
                <td>${formatUSD(trade.exit)}</td>
                <td>${Number(trade.size).toLocaleString()}</td>
                <td class="${pnl >= 0 ? 'text-success' : 'text-danger'} font-bold">
                    ${pnl >= 0 ? '+' : ''}${formatUSD(pnl)}
                </td>
                <td><span class="tag-badge">${escapeHTML(trade.strategy || 'Discretionary')}</span></td>
                <td style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${escapeHTML(trade.notes || '-')}
                </td>
                <td>
                    <button class="btn btn-icon btn-danger" style="width:28px; height:28px;" onclick="deleteJournalTrade(${index})" title="Delete">
                        <i class="fa-solid fa-trash" style="font-size: 0.75rem;"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Summary Statistics
        const winRate = ((winCount / state.journalTrades.length) * 100).toFixed(1);
        const profitFactor = totalLoss > 0 ? (totalGain / totalLoss).toFixed(2) : (totalGain > 0 ? 'MAX' : '0.00');

        if (statTotalTrades) statTotalTrades.textContent = state.journalTrades.length.toString();
        if (statTotalPnl) {
            statTotalPnl.textContent = `${totalPnl >= 0 ? '+' : ''}${formatUSD(totalPnl)}`;
            statTotalPnl.style.color = totalPnl >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        if (statWinRate) statWinRate.textContent = `${winRate}%`;
        if (statProfitFactor) statProfitFactor.textContent = profitFactor;
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('j-date').value;
            const ticker = document.getElementById('j-ticker').value.trim().toUpperCase();
            const direction = document.getElementById('j-direction').value;
            const entry = parseFloat(document.getElementById('j-entry').value) || 0;
            const exit = parseFloat(document.getElementById('j-exit').value) || 0;
            const size = parseFloat(document.getElementById('j-size').value) || 0;
            const strategy = document.getElementById('j-strategy').value.trim();
            const notes = document.getElementById('j-notes').value.trim();

            let pnl = 0;
            if (direction === 'long') {
                pnl = (exit - entry) * size;
            } else {
                pnl = (entry - exit) * size;
            }

            const newTrade = { date, ticker, direction, entry, exit, size, pnl, strategy, notes };
            state.journalTrades.unshift(newTrade);
            saveStoredData();
            renderJournal();

            // Close modal & reset
            const modal = document.getElementById('modal-add-trade');
            if (modal) modal.classList.remove('active');
            form.reset();
        });
    }

    window.deleteJournalTrade = function(index) {
        if (confirm('Delete this trade record?')) {
            state.journalTrades.splice(index, 1);
            saveStoredData();
            renderJournal();
        }
    };

    renderJournal();
}

/* -------------------------------------------------------------
 * Backtest Laboratory
 * ------------------------------------------------------------- */
function initBacktestLab() {
    const form = document.getElementById('backtest-form');
    const tableBody = document.getElementById('backtest-table-body');

    function renderBacktests() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (state.backtestRuns.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--text-muted);">No backtests recorded yet. Log your first optimization run!</td></tr>`;
            return;
        }

        state.backtestRuns.forEach((bt, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHTML(bt.name)}</strong></td>
                <td><span class="tag-badge red">${escapeHTML(bt.asset)}</span></td>
                <td>${escapeHTML(bt.timeframe)}</td>
                <td>${escapeHTML(bt.tradesCount)}</td>
                <td><span class="pill win">${escapeHTML(bt.winRate)}%</span></td>
                <td class="font-bold text-success">${escapeHTML(bt.profitFactor)}</td>
                <td>
                    <button class="btn btn-icon btn-danger" style="width:28px; height:28px;" onclick="deleteBacktestRun(${index})">
                        <i class="fa-solid fa-trash" style="font-size: 0.75rem;"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('bt-name').value.trim();
            const asset = document.getElementById('bt-asset').value.trim().toUpperCase();
            const timeframe = document.getElementById('bt-tf').value;
            const tradesCount = document.getElementById('bt-trades').value;
            const winRate = document.getElementById('bt-winrate').value;
            const profitFactor = document.getElementById('bt-pf').value;

            state.backtestRuns.unshift({ name, asset, timeframe, tradesCount, winRate, profitFactor });
            saveStoredData();
            renderBacktests();

            const modal = document.getElementById('modal-add-backtest');
            if (modal) modal.classList.remove('active');
            form.reset();
        });
    }

    window.deleteBacktestRun = function(index) {
        state.backtestRuns.splice(index, 1);
        saveStoredData();
        renderBacktests();
    };

    renderBacktests();
}

/* -------------------------------------------------------------
 * General Modals Management
 * ------------------------------------------------------------- */
function initModals() {
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-open-modal');
            const target = document.getElementById(modalId);
            if (target) {
                target.classList.add('active');
                // Auto-fill today's date if date input exists
                const dateInp = target.querySelector('input[type="date"]');
                if (dateInp && !dateInp.value) {
                    dateInp.value = new Date().toISOString().split('T')[0];
                }
            }
        });
    });

    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });

    // Backup & Export JSON
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const backupData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                journalTrades: state.journalTrades,
                backtestRuns: state.backtestRuns
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trading_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    const btnTriggerImport = document.getElementById('btn-trigger-import');
    const inputImport = document.getElementById('input-import-json');
    if (btnTriggerImport && inputImport) {
        btnTriggerImport.addEventListener('click', () => inputImport.click());
        inputImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed.journalTrades && Array.isArray(parsed.journalTrades)) {
                        state.journalTrades = parsed.journalTrades;
                    }
                    if (parsed.backtestRuns && Array.isArray(parsed.backtestRuns)) {
                        state.backtestRuns = parsed.backtestRuns;
                    }
                    saveStoredData();
                    location.reload();
                } catch (err) {
                    alert('Invalid JSON backup file.');
                }
            };
            reader.readAsText(file);
        });
    }
}

/* -------------------------------------------------------------
 * Persistence & Helpers
 * ------------------------------------------------------------- */
function loadStoredData() {
    try {
        const storedJournal = localStorage.getItem('th_journal_trades');
        if (storedJournal) state.journalTrades = JSON.parse(storedJournal);

        const storedBt = localStorage.getItem('th_backtest_runs');
        if (storedBt) state.backtestRuns = JSON.parse(storedBt);
    } catch (e) {
        console.warn('LocalStorage error:', e);
    }
}

function saveStoredData() {
    try {
        localStorage.setItem('th_journal_trades', JSON.stringify(state.journalTrades));
        localStorage.setItem('th_backtest_runs', JSON.stringify(state.backtestRuns));
    } catch (e) {
        console.warn('LocalStorage save error:', e);
    }
}

function formatUSD(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
