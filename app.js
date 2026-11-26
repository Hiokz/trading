/**
 * Trading Command Center & Research Hub - Main Application Script
 * Modular Single-Page Architecture with LocalStorage & Supabase Cloud Sync
 */

// Supabase Cloud Configuration (FinTracks Architecture)
const SUPABASE_URL = 'https://ljlzgbrnqxdbmcqrburk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbHpnYnJucXhkYm1jcXJidXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NTgzNTAsImV4cCI6MjExMTAzNDM1MH0.G3ZdSPoG2wXwRRaLl-2Z1mGez7A6NR3_iakTvudQ1WI';

// Clear legacy persistent tokens if any
try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sb-') || k.includes('-auth-token'))) {
            localStorage.removeItem(k);
        }
    }
} catch (e) {}

// Supabase client using sessionStorage
const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storage: window.sessionStorage,
            storageKey: 'tradinghub-session-auth',
            persistSession: true,
            autoRefreshToken: true
        }
    })
    : null;

let currentAuthUser = null;

// Application State
const state = {
    activeSection: 'technical',
    journalTrades: [],
    customNotes: []
};

// Section Metadata Registry
const SECTIONS = [
    { id: 'technical', name: 'Technical Analysis', icon: 'fa-chart-line', group: 'Analysis & Models' },
    { id: 'fundamental', name: 'Fundamental Analysis', icon: 'fa-landmark', group: 'Analysis & Models' },
    { id: 'news', name: 'Market News', icon: 'fa-newspaper', group: 'Market Pulse' },
    { id: 'journal', name: 'Trading Journal', icon: 'fa-book-bookmark', group: 'Execution & Journal' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadStoredData();
    initNavigation();
    initCommandPalette();
    initLiveClocks();
    initJournal();
    initCustomSelects();
    initNumberSteppers();
    initModals();
    initAuth();

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

    // Mobile menu toggle
    const mobileBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active');
        });
    }

    if (backdrop && sidebar) {
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        });
    }
}

function switchSection(sectionId) {
    state.activeSection = sectionId;

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');

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
 * Trading Journal Logic
 * ------------------------------------------------------------- */
function initJournal() {
    const form = document.getElementById('journal-form');
    const tableBody = document.getElementById('journal-table-body');
    const emptyState = document.getElementById('journal-empty-state');
    const statTotalPnl = document.getElementById('journal-stat-total-pnl');
    const statWinRate = document.getElementById('journal-stat-win-rate');
    const statTotalTrades = document.getElementById('journal-stat-total-trades');

    function renderJournal() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (state.journalTrades.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (statTotalTrades) statTotalTrades.textContent = '0';
            if (statTotalPnl) statTotalPnl.textContent = '$0.00';
            if (statWinRate) statWinRate.textContent = '0%';
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
                <td style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHTML(trade.notes || '-')}">
                    ${escapeHTML(trade.notes || '-')}
                </td>
                <td class="td-action" style="text-align: center;">
                    <button class="btn btn-icon btn-danger" style="width:28px; height:28px; margin: 0 auto; display: inline-flex; align-items: center; justify-content: center;" onclick="deleteJournalTrade(${index})" title="Delete">
                        <i class="fa-solid fa-trash" style="font-size: 0.75rem;"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Summary Statistics
        const winRate = ((winCount / state.journalTrades.length) * 100).toFixed(1);

        if (statTotalTrades) statTotalTrades.textContent = state.journalTrades.length.toString();
        if (statTotalPnl) {
            statTotalPnl.textContent = `${totalPnl >= 0 ? '+' : ''}${formatUSD(totalPnl)}`;
            statTotalPnl.style.color = totalPnl >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        if (statWinRate) statWinRate.textContent = `${winRate}%`;
    }

    function getTodayDateString() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function setTradeModalDateToday() {
        const dateInp = document.getElementById('j-date');
        if (dateInp) {
            dateInp.value = getTodayDateString();
        }
    }

    // Auto-fill today's current date immediately
    setTradeModalDateToday();

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const todayStr = getTodayDateString();
            const dateInput = document.getElementById('j-date');
            const date = (dateInput && dateInput.value) ? dateInput.value : todayStr;
            const ticker = document.getElementById('j-ticker').value.trim().toUpperCase();
            const direction = document.getElementById('j-direction').value;
            const entry = parseFloat(document.getElementById('j-entry').value) || 0;
            const exit = parseFloat(document.getElementById('j-exit').value) || 0;
            const size = parseFloat(document.getElementById('j-size').value) || 0;
            const strategy = document.getElementById('j-strategy').value.trim();
            const notes = document.getElementById('j-notes').value.trim();

            let pnl = 0;
            // 1 standard lot = 100 contract units (e.g. 100 oz for XAUUSD: 0.01 lot = 1 oz -> $200 price move * 1 = $200)
            const contractMultiplier = 100;
            if (direction === 'long') {
                pnl = (exit - entry) * (size * contractMultiplier);
            } else {
                pnl = (entry - exit) * (size * contractMultiplier);
            }

            const newTrade = { date, ticker, direction, entry, exit, size, pnl, strategy, notes };
            state.journalTrades.unshift(newTrade);
            saveStoredData();
            renderJournal();

            // Cloud Sync if authenticated with Supabase
            if (supabaseClient && currentAuthUser) {
                const payload = {
                    user_id: currentAuthUser.id,
                    date: newTrade.date,
                    pair: newTrade.ticker,
                    direction: newTrade.direction,
                    size: newTrade.size,
                    entry: newTrade.entry,
                    exit: newTrade.exit,
                    pnl: newTrade.pnl,
                    roi: parseFloat((((newTrade.exit - newTrade.entry) / (newTrade.entry || 1)) * 100).toFixed(2)),
                    notes: newTrade.notes || (newTrade.strategy ? `[${newTrade.strategy}]` : '')
                };
                supabaseClient.from('trading_journal').insert([payload]).select().then(({ data, error }) => {
                    if (!error && data && data[0]) {
                        newTrade.id = data[0].id;
                        saveStoredData();
                    } else if (error) {
                        console.error('Failed to sync trade to Supabase:', error);
                    }
                });
            }

            // Close modal & reset
            const modal = document.getElementById('modal-add-trade');
            if (modal) modal.classList.remove('active');
            form.reset();
            setTradeModalDateToday();
            updateLivePnlPreview();
        });

        form.addEventListener('reset', () => {
            setTimeout(setTradeModalDateToday, 0);
        });
    }

    // Interactive inputs live calculation & styling
    const inputSize = document.getElementById('j-size');
    const inputEntry = document.getElementById('j-entry');
    const inputExit = document.getElementById('j-exit');
    const inputDirection = document.getElementById('j-direction');
    const pnlPreview = document.getElementById('modal-trade-pnl-preview');
    const pnlVal = document.getElementById('modal-pnl-val');

    function updateLivePnlPreview() {
        const size = parseFloat(inputSize ? inputSize.value : 0) || 0;
        const entry = parseFloat(inputEntry ? inputEntry.value : 0) || 0;
        const exit = parseFloat(inputExit ? inputExit.value : 0) || 0;
        const dir = inputDirection ? inputDirection.value : 'long';

        if (inputDirection) {
            const wrapper = inputDirection.closest('.custom-select-container');
            const trigger = wrapper ? wrapper.querySelector('.custom-select-trigger') : null;
            if (dir === 'long') {
                inputDirection.classList.add('is-long');
                inputDirection.classList.remove('is-short');
                if (wrapper) { wrapper.classList.add('is-long'); wrapper.classList.remove('is-short'); }
                if (trigger) { trigger.classList.add('is-long'); trigger.classList.remove('is-short'); }
            } else {
                inputDirection.classList.add('is-short');
                inputDirection.classList.remove('is-long');
                if (wrapper) { wrapper.classList.add('is-short'); wrapper.classList.remove('is-long'); }
                if (trigger) { trigger.classList.add('is-short'); trigger.classList.remove('is-long'); }
            }
        }

        if (pnlPreview && pnlVal) {
            if (size > 0 && entry > 0 && exit > 0) {
                let pnl = 0;
                let pct = 0;
                // 1 standard lot = 100 contract units (e.g. 100 oz for XAUUSD: 0.01 lot = 1 oz -> $200 price move * 1 = $200)
                const contractMultiplier = 100;
                if (dir === 'long') {
                    pnl = (exit - entry) * (size * contractMultiplier);
                    pct = ((exit - entry) / entry) * 100;
                } else {
                    pnl = (entry - exit) * (size * contractMultiplier);
                    pct = ((entry - exit) / entry) * 100;
                }
                const isWin = pnl >= 0;
                pnlVal.textContent = `${isWin ? '+' : ''}${formatUSD(pnl)} (${isWin ? '+' : ''}${pct.toFixed(2)}%)`;
                pnlVal.style.color = isWin ? 'var(--success)' : 'var(--danger)';
                pnlPreview.style.borderColor = isWin ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
                pnlPreview.style.background = isWin ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                pnlPreview.classList.add('active');
            } else {
                pnlPreview.classList.remove('active');
            }
        }
    }

    [inputSize, inputEntry, inputExit].forEach(inp => {
        if (inp) inp.addEventListener('input', updateLivePnlPreview);
    });
    if (inputDirection) {
        inputDirection.addEventListener('change', updateLivePnlPreview);
        updateLivePnlPreview();
    }

    window.deleteJournalTrade = async function(index) {
        if (confirm('Delete this trade record?')) {
            const tradeToDelete = state.journalTrades[index];
            state.journalTrades.splice(index, 1);
            saveStoredData();
            renderJournal();

            if (supabaseClient && currentAuthUser && tradeToDelete && tradeToDelete.id) {
                const { error } = await supabaseClient
                    .from('trading_journal')
                    .delete()
                    .eq('id', tradeToDelete.id);
                if (error) {
                    console.error('Failed to delete trade from Supabase:', error);
                }
            }
        }
    };

    window.renderJournal = renderJournal;
    renderJournal();
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
                // Auto-fill today's current date when opening modal
                const dateInp = target.querySelector('#j-date, input[type="date"]');
                if (dateInp) {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    dateInp.value = `${yyyy}-${mm}-${dd}`;
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
                journalTrades: state.journalTrades
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
    } catch (e) {
        console.warn('LocalStorage error:', e);
    }
}

function saveStoredData() {
    try {
        localStorage.setItem('th_journal_trades', JSON.stringify(state.journalTrades));
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

/* -------------------------------------------------------------
 * Custom Animated Dropdowns (Hiok.Digital Architecture)
 * ------------------------------------------------------------- */
function initCustomSelects() {
    const customSelectSources = document.querySelectorAll('.custom-select-source');

    customSelectSources.forEach(select => {
        if (select.closest('.custom-select-container')) return;

        select.classList.add('hidden-select');
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-container';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';

        function getOptionHTML(opt) {
            if (!opt) return 'Select an option';
            if (select.id === 'j-direction') {
                if (opt.value === 'long') {
                    return `<i class="fa-solid fa-arrow-trend-up" style="color:var(--success); margin-right:8px; font-size:0.85rem;"></i><span>${opt.text}</span>`;
                } else if (opt.value === 'short') {
                    return `<i class="fa-solid fa-arrow-trend-down" style="color:var(--danger); margin-right:8px; font-size:0.85rem;"></i><span>${opt.text}</span>`;
                }
            }
            return `<span>${opt.text}</span>`;
        }

        function updateDirectionTheme(val) {
            if (select.id === 'j-direction') {
                wrapper.classList.remove('is-long', 'is-short');
                trigger.classList.remove('is-long', 'is-short');
                if (val === 'long') {
                    wrapper.classList.add('is-long');
                    trigger.classList.add('is-long');
                } else if (val === 'short') {
                    wrapper.classList.add('is-short');
                    trigger.classList.add('is-short');
                }
            }
        }

        let selectedOption = select.options[select.selectedIndex];
        trigger.innerHTML = `
            <span class="trigger-text">${getOptionHTML(selectedOption)}</span>
            <i class="fa-solid fa-chevron-down arrow-icon"></i>
        `;
        wrapper.appendChild(trigger);
        updateDirectionTheme(select.value);

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options-container';
        wrapper.appendChild(optionsContainer);

        Array.from(select.options).forEach((option) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            if (option.selected) optionDiv.classList.add('selected');
            optionDiv.dataset.value = option.value;
            optionDiv.innerHTML = getOptionHTML(option);

            if (option.disabled && option.value === "") {
                optionDiv.classList.add('is-placeholder');
            }

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                trigger.querySelector('.trigger-text').innerHTML = getOptionHTML(option);
                select.value = optionDiv.dataset.value;

                optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                optionDiv.classList.add('selected');

                wrapper.classList.remove('open');
                updateDirectionTheme(select.value);
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });

            optionsContainer.appendChild(optionDiv);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-container').forEach(c => {
                if (c !== wrapper) c.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        // Sync with form resets
        const parentForm = select.closest('form');
        if (parentForm) {
            parentForm.addEventListener('reset', () => {
                setTimeout(() => {
                    const opt = select.options[select.selectedIndex];
                    if (opt) {
                        trigger.querySelector('.trigger-text').innerHTML = getOptionHTML(opt);
                        optionsContainer.querySelectorAll('.custom-option').forEach(o => {
                            o.classList.toggle('selected', o.dataset.value === opt.value);
                        });
                        updateDirectionTheme(opt.value);
                    }
                }, 0);
            });
        }
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-container').forEach(c => c.classList.remove('open'));
    });
}

/* -------------------------------------------------------------
 * Custom Number Steppers (Position Size, Entry & Exit Prices)
 * ------------------------------------------------------------- */
function initNumberSteppers() {
    document.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const direction = parseFloat(btn.getAttribute('data-step')) || 1;
            const input = document.getElementById(targetId);
            if (input) {
                let currentVal = parseFloat(input.value);
                if (isNaN(currentVal)) {
                    currentVal = 0;
                }

                let step = 1;
                if (targetId === 'j-entry' || targetId === 'j-exit') {
                    if (currentVal >= 100) {
                        step = 1;
                    } else if (currentVal >= 10) {
                        step = 0.5;
                    } else {
                        step = 0.1;
                    }
                } else if (targetId === 'j-size') {
                    step = 0.01;
                }

                let updated = currentVal + (direction * step);
                if (updated < 0) updated = 0;
                if (targetId === 'j-size') {
                    input.value = (Math.round(updated * 100) / 100).toFixed(2);
                } else {
                    input.value = Math.round(updated * 10000) / 10000;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });
}

/* -------------------------------------------------------------
 * Authentication Management (FinTracks Architecture + Supabase)
 * ------------------------------------------------------------- */
function initAuth() {
    const authProfile = document.getElementById('auth-user-profile');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userDisplayStatus = document.getElementById('user-display-status');
    const btnLogout = document.getElementById('btn-logout');
    const btnOpenLogin = document.getElementById('btn-open-login');
    const loginOverlay = document.getElementById('login-overlay');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const loginForm = document.getElementById('login-form');
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authTogglePrompt = document.getElementById('auth-toggle-prompt');
    const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');

    let isRegisterMode = false;

    function setAuthMode(register) {
        isRegisterMode = register;
        if (loginError) {
            loginError.style.display = 'none';
            loginError.textContent = '';
        }
        if (authTitle) authTitle.textContent = isRegisterMode ? 'Create Account' : 'Terminal Access';
        if (authSubtitle) authSubtitle.textContent = isRegisterMode ? 'Register a new trader account to sync with Supabase.' : 'Sign in to sync and protect your trading records.';
        if (authSubmitBtn) authSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
        if (authTogglePrompt) authTogglePrompt.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
        if (btnToggleAuthMode) btnToggleAuthMode.textContent = isRegisterMode ? 'Sign In' : 'Create one';
    }

    if (btnToggleAuthMode) {
        btnToggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            setAuthMode(!isRegisterMode);
        });
    }

    const appLayout = document.getElementById('app-layout');

    function unlockApp(user) {
        currentAuthUser = user;
        const email = user.email || '';
        const rawName = email.includes('@') ? email.split('@')[0] : 'Trader';
        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        if (authProfile) authProfile.style.display = 'flex';
        if (btnLogout) btnLogout.style.display = 'inline-flex';
        if (btnOpenLogin) btnOpenLogin.style.display = 'none';
        if (userDisplayEmail) userDisplayEmail.textContent = `Welcome! ${displayName}`;
        if (userDisplayStatus) userDisplayStatus.textContent = 'Cloud Synced';

        if (loginOverlay) {
            loginOverlay.classList.remove('active');
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                if (appLayout) appLayout.style.display = 'flex';
                if (loginForm) loginForm.reset();
            }, 250);
        } else if (appLayout) {
            appLayout.style.display = 'flex';
        }
    }

    function lockApp() {
        currentAuthUser = null;
        if (authProfile) authProfile.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
        if (btnOpenLogin) btnOpenLogin.style.display = 'inline-flex';

        if (appLayout) appLayout.style.display = 'none';
        if (loginOverlay) {
            setAuthMode(false);
            loginOverlay.style.display = 'flex';
            setTimeout(() => {
                loginOverlay.classList.add('active');
            }, 10);
            if (loginUsername) loginUsername.focus();
        }
    }

    if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => lockApp());

    // Initialize Supabase Auth Session
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                unlockApp(session.user);
                loadTradesFromSupabase();
            } else {
                lockApp();
            }
        });

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session && session.user) {
                unlockApp(session.user);
                loadTradesFromSupabase();
            } else {
                lockApp();
            }
        });
    } else {
        lockApp();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawUser = loginUsername ? loginUsername.value.trim().toLowerCase() : '';
            const password = loginPassword ? loginPassword.value : '';

            function showError(msg) {
                if (loginError) {
                    let cleanMsg = msg;
                    if (cleanMsg.toLowerCase().includes('at least 6') || cleanMsg.toLowerCase().includes('least 6 characters')) {
                        cleanMsg = 'Password must be at least 8 alphanumeric characters (both letters and numbers).';
                    }
                    loginError.style.color = '#ef4444';
                    loginError.style.textAlign = 'center';
                    loginError.textContent = cleanMsg;
                    loginError.style.display = 'block';
                }
                if (authSubmitBtn) {
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
                }
            }

            if (!rawUser || !password) {
                showError('Please enter both your username and password.');
                return;
            }

            // Strictly disallow email formats
            if (rawUser.includes('@')) {
                showError('Please enter a username only, not an email.');
                return;
            }

            // Validate Username: minimum 4 letters
            const letterCount = (rawUser.match(/[a-zA-Z]/g) || []).length;
            if (rawUser.length < 4 || letterCount < 4) {
                showError('Username must contain at least 4 letters.');
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(rawUser)) {
                showError('Username can only contain letters, numbers, and underscores.');
                return;
            }

            // Validate Password: minimum 8 alphanumeric characters (both letters and numbers)
            if (password.length < 8) {
                showError('Password must be at least 8 characters long.');
                return;
            }

            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLetter || !hasNumber) {
                showError('Password must be alphanumeric (contain both letters and numbers).');
                return;
            }

            const email = `${rawUser}@tradinghub.local`;

            if (authSubmitBtn) {
                authSubmitBtn.disabled = true;
                authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            }
            if (loginError) loginError.style.display = 'none';

            if (!supabaseClient) {
                showError('Supabase client is not loaded.');
                return;
            }

            try {
                if (isRegisterMode) {
                    // Registration
                    const { data, error } = await supabaseClient.auth.signUp({ email, password });
                    if (error) {
                        showError(error.message);
                    } else if (data && data.session && data.session.user) {
                        unlockApp(data.session.user);
                    } else {
                        loginError.style.color = 'var(--success)';
                        loginError.textContent = 'Account created successfully! You can now sign in.';
                        loginError.style.display = 'block';
                        setTimeout(() => setAuthMode(false), 1500);
                    }
                } else {
                    // Sign In
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) {
                        showError(error.message);
                    } else if (data && data.user) {
                        unlockApp(data.user);
                    }
                }
            } catch (err) {
                showError(err.message || 'An error occurred during authentication.');
            } finally {
                if (authSubmitBtn) {
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
                }
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            sessionStorage.removeItem('tradinghub-session-auth');
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            state.journalTrades = [];
            saveStoredData();
            if (typeof window.renderJournal === 'function') {
                window.renderJournal();
            }
            lockApp();
        });
    }
}

/* -------------------------------------------------------------
 * Supabase Cloud Trades Synchronization
 * ------------------------------------------------------------- */
async function loadTradesFromSupabase() {
    if (!supabaseClient || !currentAuthUser) return;
    try {
        // 1. Sync any unsynced local trades to cloud
        const unsynced = state.journalTrades.filter(t => !t.id);
        if (unsynced.length > 0) {
            const payloads = unsynced.map(t => ({
                user_id: currentAuthUser.id,
                date: t.date || new Date().toISOString().split('T')[0],
                pair: t.ticker || 'XAUUSD',
                direction: t.direction || 'long',
                size: Number(t.size) || 0.01,
                entry: Number(t.entry) || 0,
                exit: Number(t.exit) || 0,
                pnl: Number(t.pnl) || 0,
                roi: parseFloat((((t.exit - t.entry) / (t.entry || 1)) * 100).toFixed(2)) || 0,
                notes: t.notes || (t.strategy ? `[${t.strategy}]` : '')
            }));
            const { data: insertedData, error: insertError } = await supabaseClient
                .from('trading_journal')
                .insert(payloads)
                .select();
            if (!insertError && insertedData) {
                insertedData.forEach((row, i) => {
                    if (unsynced[i]) unsynced[i].id = row.id;
                });
                saveStoredData();
            }
        }

        // 2. Fetch all cloud trades for the current authenticated user
        const { data, error } = await supabaseClient
            .from('trading_journal')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            state.journalTrades = data.map(row => {
                let strategy = 'Discretionary';
                let notes = row.notes || '';
                const match = notes.match(/^\[(.*?)\]\s*(.*)$/);
                if (match) {
                    strategy = match[1];
                    notes = match[2];
                }
                return {
                    id: row.id,
                    date: row.date,
                    ticker: row.pair || 'XAUUSD',
                    direction: row.direction,
                    size: parseFloat(row.size),
                    entry: parseFloat(row.entry),
                    exit: parseFloat(row.exit),
                    pnl: parseFloat(row.pnl),
                    strategy: strategy,
                    notes: notes
                };
            });
            saveStoredData();
            if (typeof window.renderJournal === 'function') {
                window.renderJournal();
            }
        } else if (error) {
            console.warn('Could not load trades from Supabase:', error.message);
        }
    } catch (e) {
        console.error('Error fetching Supabase trades:', e);
    }
}

