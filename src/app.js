let tokensData = [];
let currentPage = 1;
let totalTokens = 0;
let isLoading = false;
let rankings = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupDirectionToggles();
    applyPreset('trending'); 
}

function setupEventListeners() {
    // Filter tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-tab')) {
            const tabName = e.target.dataset.tab;
            switchFilterTab(tabName);
        }
    });

    // Filter controls with debouncing
    const filterInputs = [
        'min-liquidity', 'min-volume24', 'min-txnCount24', 'min-marketCap', 'min-holders',
        'min-volume5m', 'min-volume1', 'min-volume4', 'min-volume12',
        'min-volumeChange5m', 'min-volumeChange1', 'min-volumeChange4', 'min-volumeChange12', 'min-volumeChange24',
        'min-change5m', 'min-change1', 'min-change4', 'min-change12', 'min-change24',
        'max-change5m', 'max-change1', 'max-change4', 'max-change12', 'max-change24',
        'min-priceUSD', 'max-priceUSD',
        'min-buyCount5m', 'min-buyCount1', 'min-buyCount4', 'min-buyCount12', 'min-buyCount24',
        'min-buyVolume5m', 'min-buyVolume1', 'min-buyVolume4', 'min-buyVolume12', 'min-buyVolume24',
        'min-uniqueBuys5m', 'min-uniqueBuys1', 'min-uniqueBuys4', 'min-uniqueBuys12', 'min-uniqueBuys24',
        'max-sellCount5m', 'max-sellCount1', 'max-sellCount4', 'max-sellCount12', 'max-sellCount24',
        'max-sellVolume5m', 'max-sellVolume1', 'max-sellVolume4', 'max-sellVolume12', 'max-sellVolume24',
        'max-uniqueSells5m', 'max-uniqueSells1', 'max-uniqueSells4', 'max-uniqueSells12', 'max-uniqueSells24',
        'min-txnCount5m', 'min-txnCount1', 'min-txnCount4', 'min-txnCount12',
        'min-uniqueTransactions5m', 'min-uniqueTransactions1', 'min-uniqueTransactions4', 'min-uniqueTransactions12', 'min-uniqueTransactions24',
        'min-age', 'max-age', 'min-createdAt', 'max-createdAt', 'creatorAddress',
        'min-walletAgeAvg', 'max-swapPct1dOldWallet', 'max-swapPct7dOldWallet',
        'exchangeId', 'exchangeAddress', 'launchpadProtocol'
    ];

    filterInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('input', debounce(fetchTokens, 800));
        }
    });

    const immediateFilters = [
        'network-filter', 'includeScams', 'isVerified', 'mintable', 'freezable',
        'launchpadCompleted', 'launchpadMigrated', 'trendingIgnored'
    ];

    immediateFilters.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('change', debounce(fetchTokens, 300));
        }
    });

    const resultsPerPageElement = document.getElementById('results-per-page');
    if (resultsPerPageElement) {
        resultsPerPageElement.addEventListener('change', function() {
            currentPage = 1;
            updatePageDisplay();
            fetchTokens();
        });
    }

    // Attribute selection changes
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('attribute-select')) {
            updateRankingFromUI();
        }
    });
}

function setupDirectionToggles() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.direction-btn')) {
            const btn = e.target.closest('.direction-btn');
            const toggle = btn.closest('.direction-toggle');
            
            // Update toggle state
            toggle.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            updateRankingFromUI();
        }
    });
}

function switchFilterTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    const activeTab = document.querySelector(`.filter-tab[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Hide all filter content
    document.querySelectorAll('.filter-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected filter content
    const activeContent = document.querySelector(`.filter-content[data-content="${tabName}"]`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function addRanking() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;
    
    const currentItems = rankingList.querySelectorAll('.ranking-item');
    const newIndex = currentItems.length;
    
    if (newIndex >= 5) {
        updateApiStatus('Maximum 5 rankings allowed', 'error');
        return;
    }
    
    const newItem = document.createElement('div');
    newItem.className = 'ranking-item';
    newItem.innerHTML = `
        <div class="ranking-number">${newIndex + 1}</div>
        <div class="ranking-controls">
            <select class="attribute-select" data-index="${newIndex}">
                <option value="">Select attribute...</option>
                <option value="change24">💹 Price Change 24h</option>
                <option value="volume24">📊 Volume 24h</option>
                <option value="volumeChange24">📈 Volume Change 24h</option>
                <option value="marketCap">🏢 Market Cap</option>
                <option value="liquidity">💧 Liquidity</option>
                <option value="txnCount24">🔄 Transactions 24h</option>
                <option value="uniqueTransactions24">👥 Unique Transactions 24h</option>
                <option value="uniqueBuys24">🛒 Unique Buys 24h</option>
                <option value="uniqueSells24">💸 Unique Sells 24h</option>
                <option value="buyVolume24">💚 Buy Volume 24h</option>
                <option value="sellVolume24">❤️ Sell Volume 24h</option>
                <option value="buyCount24">📥 Buy Count 24h</option>
                <option value="sellCount24">📤 Sell Count 24h</option>
                <option value="holders">👤 Holders</option>
                <option value="createdAt">📅 Creation Date</option>
                <option value="priceUSD">💵 Current Price</option>
                <option value="age">⏰ Token Age</option>
                <option value="high24">⬆️ 24h High</option>
                <option value="low24">⬇️ 24h Low</option>
            </select>
            <div class="direction-toggle" data-index="${newIndex}">
                <button class="direction-btn active" data-direction="DESC">
                    <span class="direction-icon">⬇️</span>
                    <span class="direction-label">High to Low</span>
                </button>
                <button class="direction-btn" data-direction="ASC">
                    <span class="direction-icon">⬆️</span>
                    <span class="direction-label">Low to High</span>
                </button>
            </div>
        </div>
        <button class="remove-ranking" onclick="removeRanking(${newIndex})">❌</button>
    `;
    
    rankingList.appendChild(newItem);
    updateRemoveButtons();
}

function removeRanking(index) {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;
    
    const items = rankingList.querySelectorAll('.ranking-item');
    
    if (items.length <= 1) {
        updateApiStatus('Must have at least one ranking', 'error');
        return;
    }
    
    if (items[index]) {
        items[index].remove();
    }
    
    // Renumber remaining items
    const remainingItems = rankingList.querySelectorAll('.ranking-item');
    remainingItems.forEach((item, newIndex) => {
        const numberDiv = item.querySelector('.ranking-number');
        const select = item.querySelector('.attribute-select');
        const toggle = item.querySelector('.direction-toggle');
        const removeBtn = item.querySelector('.remove-ranking');
        
        if (numberDiv) numberDiv.textContent = newIndex + 1;
        if (select) select.dataset.index = newIndex;
        if (toggle) toggle.dataset.index = newIndex;
        if (removeBtn) removeBtn.setAttribute('onclick', `removeRanking(${newIndex})`);
    });
    
    updateRemoveButtons();
    updateRankingFromUI();
}

function updateRemoveButtons() {
    const items = document.querySelectorAll('.ranking-item');
    items.forEach((item) => {
        const removeBtn = item.querySelector('.remove-ranking');
        if (removeBtn) {
            removeBtn.style.display = items.length > 1 ? 'block' : 'none';
        }
    });
}

function clearAllRankings() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;
    
    // Keep only the first ranking item and reset it
    const items = rankingList.querySelectorAll('.ranking-item');
    for (let i = items.length - 1; i > 0; i--) {
        items[i].remove();
    }
    
    // Reset the first item
    const firstItem = rankingList.querySelector('.ranking-item');
    if (firstItem) {
        const select = firstItem.querySelector('.attribute-select');
        const descBtn = firstItem.querySelector('.direction-btn[data-direction="DESC"]');
        const ascBtn = firstItem.querySelector('.direction-btn[data-direction="ASC"]');
        
        if (select) select.value = '';
        if (descBtn) descBtn.classList.add('active');
        if (ascBtn) ascBtn.classList.remove('active');
    }
    
    updateRemoveButtons();
    rankings = [];
    updateApiStatus('Rankings cleared', 'info');
}

function updateRankingFromUI() {
    rankings = [];
    const items = document.querySelectorAll('.ranking-item');
    
    items.forEach(item => {
        const select = item.querySelector('.attribute-select');
        const activeDirection = item.querySelector('.direction-btn.active');
        
        if (select && activeDirection && select.value) {
            rankings.push({
                attribute: select.value,
                direction: activeDirection.dataset.direction
            });
        }
    });
    
    console.log('📊 Updated rankings:', rankings);
}

function applyPreset(presetName) {
    console.log('🎯 Applying preset:', presetName);
    
    // Remove active class from all preset cards
    document.querySelectorAll('.preset-card').forEach(card => card.classList.remove('active'));
    
    // Add active class to selected preset
    const activeCard = document.querySelector(`.preset-card.${presetName}`);
    if (activeCard) activeCard.classList.add('active');
    
    if (!window.tokenAPI) {
        updateApiStatus('API not ready, using mock data', 'warning');
        return;
    }
    
    const presetConfigs = window.tokenAPI.getPresetRankings();
    const config = presetConfigs[presetName];
    
    if (!config) {
        console.error('❌ Unknown preset:', presetName);
        return;
    }
    
    // Clear existing rankings
    clearAllRankings();
    
    // Apply preset rankings to UI
    config.rankings.forEach((ranking, index) => {
        if (index > 0) {
            addRanking();
        }
        
        const item = document.querySelectorAll('.ranking-item')[index];
        if (item) {
            const select = item.querySelector('.attribute-select');
            const directionBtns = item.querySelectorAll('.direction-btn');
            
            if (select) select.value = ranking.attribute;
            
            directionBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.direction === ranking.direction);
            });
        }
    });
    
    // Apply preset filters safely
    const liquidityInput = document.getElementById('min-liquidity');
    if (liquidityInput && config.filters.liquidity?.gt) {
        liquidityInput.value = config.filters.liquidity.gt;
    }
    
    const volumeInput = document.getElementById('min-volume24');
    if (volumeInput && config.filters.volume24?.gt) {
        volumeInput.value = config.filters.volume24.gt;
    }
    
    const txnInput = document.getElementById('min-txnCount24');
    if (txnInput && config.filters.txnCount24?.gt) {
        txnInput.value = config.filters.txnCount24.gt;
    }
    
    // Update rankings array and fetch
    updateRankingFromUI();
    currentPage = 1;
    updatePageDisplay();
    fetchTokens();
}

function applyCustomRanking() {
    updateRankingFromUI();
    
    if (rankings.length === 0) {
        updateApiStatus('Please select at least one ranking attribute', 'error');
        return;
    }
    
    // Remove active state from preset cards
    document.querySelectorAll('.preset-card').forEach(card => card.classList.remove('active'));
    
    currentPage = 1;
    updatePageDisplay();
    fetchTokens();
}

function buildFilters() {
    const filters = {};
    
    // Helper function to safely add number filter
    function addNumberFilter(filterId, filterKey, isMax = false) {
        const element = document.getElementById(filterId);
        if (element && element.value && element.value.trim() !== '') {
            const value = parseFloat(element.value);
            if (!isNaN(value) && value > 0) {
                if (!filters[filterKey]) filters[filterKey] = {};
                filters[filterKey][isMax ? 'lt' : 'gt'] = value;
            }
        }
    }
    
    // Helper function to safely add string filter
    function addStringFilter(filterId, filterKey) {
        const element = document.getElementById(filterId);
        if (element && element.value && element.value.trim() !== '') {
            filters[filterKey] = element.value.trim();
        }
    }
    
    // Helper function to safely add array filter
    function addArrayFilter(filterId, filterKey) {
        const element = document.getElementById(filterId);
        if (element && element.value && element.value.trim() !== '') {
            const values = element.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (values.length > 0) {
                filters[filterKey] = values;
            }
        }
    }
    
    // Helper function to safely add boolean filter
    function addBooleanFilter(filterId, filterKey) {
        const element = document.getElementById(filterId);
        if (element && element.checked) {
            filters[filterKey] = true;
        }
    }
    
    // Helper function to safely add date filter
    function addDateFilter(filterId, filterKey, isMax = false) {
        const element = document.getElementById(filterId);
        if (element && element.value && element.value.trim() !== '') {
            const timestamp = Math.floor(new Date(element.value).getTime() / 1000);
            if (!isNaN(timestamp)) {
                if (!filters[filterKey]) filters[filterKey] = {};
                filters[filterKey][isMax ? 'lt' : 'gt'] = timestamp;
            }
        }
    }

    try {
        // Basic filters
        addNumberFilter('min-liquidity', 'liquidity');
        addNumberFilter('min-volume24', 'volume24');
        addNumberFilter('min-txnCount24', 'txnCount24');
        addNumberFilter('min-marketCap', 'marketCap');
        addNumberFilter('min-holders', 'holders');

        const networkElement = document.getElementById('network-filter');
        if (networkElement) {
            if (networkElement.value === 'all') {
                const supportedNetworks = [
                    1,      // Ethereum
                    56,     // BSC  
                    137,    // Polygon
                    43114,  // Avalanche
                    1399811149, // Solana
                    42161,  // Arbitrum
                    10,     // Optimism
                    8453,   // Base
                    130,    // Unichain
                    534352, // Scroll
                    81457,  // Blast
                    59144,  // Linea
                    5000,   // Mantle
                    34443   // Mode
                ];
                filters.network = supportedNetworks;
            } else {
                // When a specific network is selected
                const networkId = parseInt(networkElement.value);
                if (!isNaN(networkId)) {
                    filters.network = [networkId];
                }
            }
        }
        
    } catch (error) {
        console.error('Error building filters:', error);
        updateApiStatus('Error building filters: ' + error.message, 'error');
    }
    
    console.log('📊 Built filters:', filters);
    return filters;
}

function clearAllFilters() {
    // Clear all input fields
    const inputs = document.querySelectorAll('.filter-content input[type="number"], .filter-content input[type="text"], .filter-content input[type="datetime-local"]');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('.filter-content input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset network filter to "all"
    const networkFilter = document.getElementById('network-filter');
    if (networkFilter) {
        networkFilter.value = 'all';
    }
    
    // Reset to first page
    currentPage = 1;
    updatePageDisplay();
    
    updateApiStatus('All filters cleared', 'info');
    
    // Refresh data with cleared filters
    fetchTokens();
}

async function fetchTokens() {
    if (isLoading) return;
    
    if (rankings.length === 0) {
        updateApiStatus('No ranking criteria selected', 'error');
        return;
    }
    
    isLoading = true;
    updateApiStatus('🔄 Fetching tokens...', 'loading');
    
    try {
        const resultsPerPageElement = document.getElementById('results-per-page');
        const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
        const offset = (currentPage - 1) * limit;
        const filters = buildFilters();
        
        console.log('📊 Fetching with rankings:', rankings);
        console.log('🔍 Fetching with filters:', filters);
        
        let result;
        
        if (window.tokenAPI) {
            result = await window.tokenAPI.fetchTokensWithRanking({
                rankings: rankings,
                filters: filters,
                limit: limit,
                offset: offset
            });
        } else {
            throw new Error('API not available');
        }
        
        tokensData = result.results || [];
        totalTokens = result.count || tokensData.length;
        
        displayTokens();
        updatePaginationInfo();
        updateApiStatus(`✅ Loaded ${tokensData.length} tokens successfully`, 'success');
        
    } catch (error) {
        console.error('❌ Error fetching tokens:', error);
        updateApiStatus(`❌ Error: ${error.message}. Using mock data.`, 'error');
        
        // Fallback to mock data
        const mockData = generateMockTokens();
        const resultsPerPageElement = document.getElementById('results-per-page');
        const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
        const startIndex = (currentPage - 1) * limit;
        tokensData = mockData.slice(startIndex, startIndex + limit);
        totalTokens = mockData.length;
        
        displayTokens();
        updatePaginationInfo();
    }
    
    isLoading = false;
}

function displayTokens() {
    const tbody = document.getElementById('tokens-table-body');
    if (!tbody) return;
    
    if (!tokensData || tokensData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="loading">❌ No tokens found</td></tr>';
        return;
    }
    
    const resultsPerPageElement = document.getElementById('results-per-page');
    const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
    const startRank = ((currentPage - 1) * limit) + 1;
    
    tbody.innerHTML = tokensData.map((token, index) => {
        const change24 = parseFloat(token.change24) || 0;
        const changeClass = change24 > 0 ? 'change-positive' : change24 < 0 ? 'change-negative' : 'change-neutral';
        const changeSign = change24 > 0 ? '+' : '';
        const rank = startRank + index;
        
        const networkName = getNetworkName(token.token?.networkId);
        const tokenAddress = token.token?.address;
        const hasValidLink = networkName && tokenAddress && tokenAddress !== 'N/A';
        
        return `
            <tr class="token-row" ${hasValidLink ? `onclick="openTokenLink('${networkName}', '${tokenAddress}')"` : ''}>
                <td class="rank-cell">
                    <div class="rank-badge">${rank}</div>
                </td>
                <td class="token-cell">
                    <div class="token-name">${token.token?.name || 'Unknown Token'}</div>
                    <div class="token-symbol">${token.token?.symbol || 'N/A'}</div>
                    ${token.isScam ? '<div class="scam-warning">⚠️ SCAM</div>' : ''}
                </td>
                <td class="price-cell">${formatPrice(token.priceUSD)}</td>
                <td class="${changeClass}">${changeSign}${(change24 * 100).toFixed(2)}%</td>
                <td class="volume-cell">${formatNumber(token.volume24)}</td>
                <td class="mcap-cell">${formatNumber(token.marketCap)}</td>
                <td class="liquidity-cell">${formatNumber(token.liquidity)}</td>
                <td class="txn-cell">${formatNumber(token.txnCount24, 0)}</td>
                <td class="buyers-cell">${formatNumber(token.uniqueBuys24, 0)}</td>
                <td class="sellers-cell">${formatNumber(token.uniqueSells24, 0)}</td>
                <td class="age-cell">${getTimeSinceCreation(token.createdAt)}</td>
                <td class="link-cell">
                    ${hasValidLink ? 
                        `<button class="matcha-btn" onclick="event.stopPropagation(); openTokenLink('${networkName}', '${tokenAddress}')">🔗 View</button>` :
                        '<span class="no-link">❌ N/A</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function openTokenLink(networkName, tokenAddress) {
    const url = `https://matcha.xyz/tokens/${networkName}/${tokenAddress}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Pagination functions
function changePage(direction) {
    const resultsPerPageElement = document.getElementById('results-per-page');
    const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
    const maxPage = Math.ceil(totalTokens / limit);
    
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= maxPage) {
        currentPage = newPage;
        updatePageDisplay();
        fetchTokens();
    }
}

function goToFirstPage() {
    if (currentPage !== 1) {
        currentPage = 1;
        updatePageDisplay();
        fetchTokens();
    }
}

function goToLastPage() {
    const resultsPerPageElement = document.getElementById('results-per-page');
    const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
    const maxPage = Math.ceil(totalTokens / limit);
    
    if (currentPage !== maxPage && maxPage > 0) {
        currentPage = maxPage;
        updatePageDisplay();
        fetchTokens();
    }
}

function updatePageDisplay() {
    const pageInfoElement = document.getElementById('page-info');
    const pageDisplayElement = document.getElementById('page-display');
    
    if (pageInfoElement) pageInfoElement.textContent = `Page ${currentPage}`;
    if (pageDisplayElement) pageDisplayElement.textContent = `Page ${currentPage}`;
}

function updatePaginationInfo() {
    const resultsPerPageElement = document.getElementById('results-per-page');
    const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
    const startItem = ((currentPage - 1) * limit) + 1;
    const endItem = Math.min(currentPage * limit, totalTokens);
    const maxPage = Math.ceil(totalTokens / limit);
    
    const paginationInfoElement = document.getElementById('pagination-info');
    if (paginationInfoElement) {
        paginationInfoElement.textContent = `Showing ${startItem}-${endItem} of ${totalTokens} tokens`;
    }
    
    // Update all pagination button states
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === maxPage || maxPage === 0;
    
    ['prev-btn', 'prev-btn-footer', 'first-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = isFirstPage;
    });
    
    ['next-btn', 'next-btn-footer', 'last-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = isLastPage;
    });
}

function updateApiStatus(message, type = 'info') {
    const statusElement = document.getElementById('api-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `filter-hint api-status ${type}`;
    }
}

// Utility Functions
function getNetworkName(networkId) {
    const networks = {
        1: 'ethereum', '1': 'ethereum',
        56: 'bsc', '56': 'bsc', 
        137: 'polygon', '137': 'polygon',
        43114: 'avalanche', '43114': 'avalanche',
        34443: 'mode', '34443': 'mode',
        42161: 'arbitrum', '42161': 'arbitrum',
        10: 'optimism', '10': 'optimism',
        8453: 'base', '8453': 'base',
        5000: 'mantle', '5000': 'mantle',
        59144: 'linea', '59144': 'linea',
        1399811149: 'solana', '1399811149': 'solana',
        534352: 'scroll', '534352': 'scroll',
        81457: 'blast', '81457': 'blast',
    };
    return networks[networkId] || 'ethereum';
}

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    
    const n = parseFloat(num);
    if (isNaN(n)) return 'N/A';
    
    if (n >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
    return n.toFixed(decimals);
}

function formatPrice(price) {
    const p = parseFloat(price);
    if (isNaN(p)) return 'N/A';
    
    if (p < 0.01) return ''  + p.toFixed(6);
    if (p < 1) return ''  + p.toFixed(4);
    return ''  + p.toFixed(2);
}

function getTimeSinceCreation(timestamp) {
    if (!timestamp) return 'N/A';
    
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 30) return `${Math.floor(days / 30)}mo`;
    if (days > 0) return `${days}d`;
    return `${hours}h`;
}

// Global functions for HTML event handlers
window.fetchTokens = fetchTokens;
window.changePage = changePage;
window.goToFirstPage = goToFirstPage;
window.goToLastPage = goToLastPage;
window.applyPreset = applyPreset;
window.addRanking = addRanking;
window.removeRanking = removeRanking;
window.clearAllRankings = clearAllRankings;
window.applyCustomRanking = applyCustomRanking;
window.openTokenLink = openTokenLink;
window.clearAllFilters = clearAllFilters;