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

        // Volume & Trading filters (24h only)
        addNumberFilter('min-volumeChange24', 'volumeChange24');
        addNumberFilter('min-buyVolume24', 'buyVolume24');
        addNumberFilter('max-sellVolume24', 'sellVolume24', true);

        // Price & Changes filters
        addNumberFilter('min-priceUSD', 'priceUSD');
        addNumberFilter('max-priceUSD', 'priceUSD', true);
        addNumberFilter('min-change24', 'change24');
        addNumberFilter('max-change24', 'change24', true);

        // Transaction filters (24h only)
        addNumberFilter('min-uniqueTransactions24', 'uniqueTransactions24');
        addNumberFilter('min-uniqueBuys24', 'uniqueBuys24');
        addNumberFilter('max-uniqueSells24', 'uniqueSells24', true);
        addNumberFilter('min-buyCount24', 'buyCount24');
        addNumberFilter('max-sellCount24', 'sellCount24', true);

        // Time and age filters
        addNumberFilter('min-age', 'age');
        addNumberFilter('max-age', 'age', true);
        addDateFilter('min-createdAt', 'createdAt');
        addDateFilter('max-createdAt', 'createdAt', true);

        // Advanced filters
        addNumberFilter('min-walletAgeAvg', 'walletAgeAvg');
        addNumberFilter('max-swapPct1dOldWallet', 'swapPct1dOldWallet', true);
        addNumberFilter('max-swapPct7dOldWallet', 'swapPct7dOldWallet', true);

        // Network filter
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
}let tokensData = [];
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

function clearRanking() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;
    
    const firstItem = rankingList.querySelector('.ranking-item');
    if (firstItem) {
        const select = firstItem.querySelector('.attribute-select');
        const descBtn = firstItem.querySelector('.direction-btn[data-direction="DESC"]');
        const ascBtn = firstItem.querySelector('.direction-btn[data-direction="ASC"]');
        
        if (select) select.value = '';
        if (descBtn) descBtn.classList.add('active');
        if (ascBtn) ascBtn.classList.remove('active');
    }
    
    rankings = [];
    updateApiStatus('Ranking cleared', 'info');
}

function updateRankingFromUI() {
    rankings = [];
    const item = document.querySelector('.ranking-item');
    
    if (item) {
        const select = item.querySelector('.attribute-select');
        const activeDirection = item.querySelector('.direction-btn.active');
        
        if (select && activeDirection && select.value) {
            rankings = [{
                attribute: select.value,
                direction: activeDirection.dataset.direction
            }];
        }
    }
    
    console.log('📊 Updated ranking:', rankings);
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
    
    // Clear existing ranking
    clearRanking();
    
    // Apply first ranking from preset to the single ranking item
    if (config.rankings && config.rankings.length > 0) {
        const firstRanking = config.rankings[0]; // Use only the first ranking
        const item = document.querySelector('.ranking-item');
        
        if (item) {
            const select = item.querySelector('.attribute-select');
            const directionBtns = item.querySelectorAll('.direction-btn');
            
            if (select) select.value = firstRanking.attribute;
            
            directionBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.direction === firstRanking.direction);
            });
        }
    }
    
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
        updateApiStatus('Please select a ranking attribute', 'error');
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

        // Volume filters - 5 minutes
        addNumberFilter('min-volume5m', 'volume5m');
        addNumberFilter('min-volumeChange5m', 'volumeChange5m');
        addNumberFilter('min-buyVolume5m', 'buyVolume5m');
        addNumberFilter('max-sellVolume5m', 'sellVolume5m', true);

        // Volume filters - 1 hour
        addNumberFilter('min-volume1', 'volume1');
        addNumberFilter('min-volumeChange1', 'volumeChange1');
        addNumberFilter('min-buyVolume1', 'buyVolume1');
        addNumberFilter('max-sellVolume1', 'sellVolume1', true);

        // Volume filters - 4 hours
        addNumberFilter('min-volume4', 'volume4');
        addNumberFilter('min-volumeChange4', 'volumeChange4');
        addNumberFilter('min-buyVolume4', 'buyVolume4');
        addNumberFilter('max-sellVolume4', 'sellVolume4', true);

        // Volume filters - 12 hours
        addNumberFilter('min-volume12', 'volume12');
        addNumberFilter('min-volumeChange12', 'volumeChange12');
        addNumberFilter('min-buyVolume12', 'buyVolume12');
        addNumberFilter('max-sellVolume12', 'sellVolume12', true);

        // Volume filters - 24 hours
        addNumberFilter('min-volumeChange24', 'volumeChange24');
        addNumberFilter('min-buyVolume24', 'buyVolume24');
        addNumberFilter('max-sellVolume24', 'sellVolume24', true);

        // Price filters
        addNumberFilter('min-priceUSD', 'priceUSD');
        addNumberFilter('max-priceUSD', 'priceUSD', true);

        // Price change filters - 5 minutes
        addNumberFilter('min-change5m', 'change5m');
        addNumberFilter('max-change5m', 'change5m', true);

        // Price change filters - 1 hour
        addNumberFilter('min-change1', 'change1');
        addNumberFilter('max-change1', 'change1', true);

        // Price change filters - 4 hours
        addNumberFilter('min-change4', 'change4');
        addNumberFilter('max-change4', 'change4', true);

        // Price change filters - 12 hours
        addNumberFilter('min-change12', 'change12');
        addNumberFilter('max-change12', 'change12', true);

        // Price change filters - 24 hours
        addNumberFilter('min-change24', 'change24');
        addNumberFilter('max-change24', 'change24', true);

        // Transaction filters - 5 minutes
        addNumberFilter('min-txnCount5m', 'txnCount5m');
        addNumberFilter('min-uniqueTransactions5m', 'uniqueTransactions5m');
        addNumberFilter('min-uniqueBuys5m', 'uniqueBuys5m');
        addNumberFilter('max-uniqueSells5m', 'uniqueSells5m', true);
        addNumberFilter('min-buyCount5m', 'buyCount5m');
        addNumberFilter('max-sellCount5m', 'sellCount5m', true);

        // Transaction filters - 1 hour
        addNumberFilter('min-txnCount1', 'txnCount1');
        addNumberFilter('min-uniqueTransactions1', 'uniqueTransactions1');
        addNumberFilter('min-uniqueBuys1', 'uniqueBuys1');
        addNumberFilter('max-uniqueSells1', 'uniqueSells1', true);
        addNumberFilter('min-buyCount1', 'buyCount1');
        addNumberFilter('max-sellCount1', 'sellCount1', true);

        // Transaction filters - 4 hours
        addNumberFilter('min-txnCount4', 'txnCount4');
        addNumberFilter('min-uniqueTransactions4', 'uniqueTransactions4');
        addNumberFilter('min-uniqueBuys4', 'uniqueBuys4');
        addNumberFilter('max-uniqueSells4', 'uniqueSells4', true);
        addNumberFilter('min-buyCount4', 'buyCount4');
        addNumberFilter('max-sellCount4', 'sellCount4', true);

        // Transaction filters - 12 hours
        addNumberFilter('min-txnCount12', 'txnCount12');
        addNumberFilter('min-uniqueTransactions12', 'uniqueTransactions12');
        addNumberFilter('min-uniqueBuys12', 'uniqueBuys12');
        addNumberFilter('max-uniqueSells12', 'uniqueSells12', true);
        addNumberFilter('min-buyCount12', 'buyCount12');
        addNumberFilter('max-sellCount12', 'sellCount12', true);

        // Transaction filters - 24 hours
        addNumberFilter('min-uniqueTransactions24', 'uniqueTransactions24');
        addNumberFilter('min-uniqueBuys24', 'uniqueBuys24');
        addNumberFilter('max-uniqueSells24', 'uniqueSells24', true);
        addNumberFilter('min-buyCount24', 'buyCount24');
        addNumberFilter('max-sellCount24', 'sellCount24', true);

        // Time and age filters
        addNumberFilter('min-age', 'age');
        addNumberFilter('max-age', 'age', true);
        addDateFilter('min-createdAt', 'createdAt');
        addDateFilter('max-createdAt', 'createdAt', true);

        // Advanced filters
        addStringFilter('creatorAddress', 'creatorAddress');
        addNumberFilter('min-walletAgeAvg', 'walletAgeAvg');
        addNumberFilter('max-swapPct1dOldWallet', 'swapPct1dOldWallet', true);
        addNumberFilter('max-swapPct7dOldWallet', 'swapPct7dOldWallet', true);
        addStringFilter('exchangeId', 'exchangeId');
        addStringFilter('exchangeAddress', 'exchangeAddress');
        addStringFilter('launchpadProtocol', 'launchpadProtocol');

        // Network filter
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
        tbody.innerHTML = '<tr><td colspan="22" class="loading">❌ No tokens found</td></tr>';
        return;
    }
    
    // Filter out tokens with contract addresses as names
    const filteredTokens = tokensData.filter(token => {
        const tokenName = token.token?.name || '';
        const tokenSymbol = token.token?.symbol || '';
        
        // Check if name looks like a contract address (long alphanumeric string)
        const isContractAddressName = /^[A-Za-z0-9]{20,}$/.test(tokenName) || 
                                     /^0x[A-Fa-f0-9]{40}$/.test(tokenName) ||
                                     tokenName.length > 50;
        
        // Check if symbol looks like a contract address
        const isContractAddressSymbol = /^[A-Za-z0-9]{20,}$/.test(tokenSymbol) ||
                                       /^0x[A-Fa-f0-9]{40}$/.test(tokenSymbol) ||
                                       tokenSymbol.length > 20;
        
        // Exclude tokens where name or symbol looks like contract address
        return !isContractAddressName && !isContractAddressSymbol;
    });
    
    if (filteredTokens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="22" class="loading">❌ No valid tokens found after filtering</td></tr>';
        return;
    }
    
    const resultsPerPageElement = document.getElementById('results-per-page');
    const limit = resultsPerPageElement ? parseInt(resultsPerPageElement.value) : 50;
    const startRank = ((currentPage - 1) * limit) + 1;
    
    tbody.innerHTML = filteredTokens.map((token, index) => {
        const change24 = parseFloat(token.change24) || 0;
        const changeClass = change24 > 0 ? 'change-positive' : change24 < 0 ? 'change-negative' : 'change-neutral';
        const changeSign = change24 > 0 ? '+' : '';
        const rank = startRank + index;
        
        // Volume change calculation
        const volumeChange24 = parseFloat(token.volumeChange24) || 0;
        const volumeChangeClass = volumeChange24 > 0 ? 'change-positive' : volumeChange24 < 0 ? 'change-negative' : 'change-neutral';
        const volumeChangeSign = volumeChange24 > 0 ? '+' : '';
        
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
                <td class="${volumeChangeClass}">${volumeChangeSign}${(volumeChange24 * 100).toFixed(2)}%</td>
                <td class="mcap-cell">${formatNumber(token.marketCap)}</td>
                <td class="liquidity-cell">${formatNumber(token.liquidity)}</td>
                <td class="txn-cell">${formatNumber(token.txnCount24, 0)}</td>
                <td class="unique-txn-cell">${formatNumber(token.uniqueTransactions24, 0)}</td>
                <td class="buyers-cell">${formatNumber(token.uniqueBuys24, 0)}</td>
                <td class="sellers-cell">${formatNumber(token.uniqueSells24, 0)}</td>
                <td class="buy-count-cell">${formatNumber(token.buyCount24, 0)}</td>
                <td class="sell-count-cell">${formatNumber(token.sellCount24, 0)}</td>
                <td class="buy-volume-cell">${formatNumber(token.buyVolume24)}</td>
                <td class="sell-volume-cell">${formatNumber(token.sellVolume24)}</td>
                <td class="holders-cell">${formatNumber(token.holders, 0)}</td>
                <td class="age-cell">${getTimeSinceCreation(token.createdAt)}</td>
                <td class="wallet-age-cell">${formatNumber(token.walletAgeAvg, 1)}d</td>
                <td class="old-wallet-1d-cell">${formatNumber(token.swapPct1dOldWallet, 1)}%</td>
                <td class="old-wallet-7d-cell">${formatNumber(token.swapPct7dOldWallet, 1)}%</td>
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
    
    if (p < 0.01) return '$' + p.toFixed(6);
    if (p < 1) return '$' + p.toFixed(4);
    return '$' + p.toFixed(2);
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

// Mock data function for fallback
function generateMockTokens() {
    const mockTokens = [];
    const symbols = ['MOCK', 'TEST', 'DEMO', 'FAKE', 'SAMPLE'];
    const names = ['Mock Token', 'Test Coin', 'Demo Token', 'Fake Coin', 'Sample Token'];
    
    for (let i = 0; i < 100; i++) {
        mockTokens.push({
            token: {
                address: `0x${Math.random().toString(16).substr(2, 40)}`,
                name: names[i % names.length] + ` ${i + 1}`,
                symbol: symbols[i % symbols.length] + (i + 1),
                networkId: [1, 56, 137][i % 3]
            },
            priceUSD: Math.random() * 100,
            change24: (Math.random() - 0.5) * 0.5,
            volume24: Math.random() * 1000000,
            marketCap: Math.random() * 10000000,
            liquidity: Math.random() * 1000000,
            txnCount24: Math.floor(Math.random() * 1000),
            uniqueBuys24: Math.floor(Math.random() * 500),
            uniqueSells24: Math.floor(Math.random() * 500),
            createdAt: Date.now() / 1000 - Math.random() * 86400 * 30,
            isScam: Math.random() < 0.1
        });
    }
    
    return mockTokens;
}

// Global functions for HTML event handlers
window.fetchTokens = fetchTokens;
window.changePage = changePage;
window.goToFirstPage = goToFirstPage;
window.goToLastPage = goToLastPage;
window.applyPreset = applyPreset;
window.clearRanking = clearRanking;
window.applyCustomRanking = applyCustomRanking;
window.openTokenLink = openTokenLink;
window.clearAllFilters = clearAllFilters;