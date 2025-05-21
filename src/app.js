// app.js - Token Analyzer Main Application
let currentTab = 'trending';
let tokensData = [];
let currentPage = 1;
let currentSort = { column: 'score', order: 'desc' };

// Initialize controls when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupWeightControls();
    setupSortingControls();
    setupTableSorting();
    fetchTokens();
}

// Initialize weight controls
function setupWeightControls() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
            if (tokensData.length > 0) {
                rankAndDisplayTokens();
            }
        });
    });
}

// Initialize sorting controls
function setupSortingControls() {
    document.getElementById('primary-sort').addEventListener('change', function() {
        currentSort.column = this.value;
        rankAndDisplayTokens();
    });

    document.getElementById('sort-order').addEventListener('change', function() {
        currentSort.order = this.value;
        rankAndDisplayTokens();
    });

    document.getElementById('results-per-page').addEventListener('change', function() {
        currentPage = 1;
        rankAndDisplayTokens();
    });
}

// Initialize table header sorting
function setupTableSorting() {
    document.querySelectorAll('th.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.sort;
            if (currentSort.column === column) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.order = 'desc';
            }
            
            // Update dropdown to match
            document.getElementById('primary-sort').value = column;
            document.getElementById('sort-order').value = currentSort.order;
            
            rankAndDisplayTokens();
        });
    });
}

function getWeights(category) {
    const weights = {};
    document.querySelectorAll(`input[id^="${category}-"]`).forEach(input => {
        const metric = input.id.replace(`${category}-`, '');
        weights[metric] = parseInt(input.value);
    });
    return weights;
}

function normalizeValue(value, min, max) {
    if (max === min) return 0;
    return (value - min) / (max - min);
}

function calculateScore(token, weights, category) {
    let score = 0;
    let totalWeight = 0;

    // Get all values for normalization
    const allValues = {};
    Object.keys(weights).forEach(metric => {
        allValues[metric] = tokensData.map(t => {
            let value = parseFloat(t[metric]) || 0;
            
            // Special handling for createdAt (newer = higher score)
            if (metric === 'createdAt') {
                const now = Date.now() / 1000;
                const daysSinceCreation = (now - value) / (24 * 60 * 60);
                value = Math.max(0, 30 - daysSinceCreation); // Score higher for tokens < 30 days old
            }
            
            return value;
        }).filter(v => v > 0);
    });

    Object.entries(weights).forEach(([metric, weight]) => {
        if (weight === 0) return;

        let value = parseFloat(token[metric]) || 0;
        
        // Special handling for different metrics
        if (metric === 'createdAt') {
            const now = Date.now() / 1000;
            const daysSinceCreation = (now - value) / (24 * 60 * 60);
            value = Math.max(0, 30 - daysSinceCreation);
        }

        if (allValues[metric] && allValues[metric].length > 0) {
            const min = Math.min(...allValues[metric]);
            const max = Math.max(...allValues[metric]);
            const normalizedValue = normalizeValue(value, min, max);
            
            score += normalizedValue * weight;
            totalWeight += weight;
        }
    });

    return totalWeight > 0 ? score / totalWeight * 100 : 0;
}

function sortTokens(tokens, column, order) {
    return tokens.sort((a, b) => {
        let valueA, valueB;
        
        if (column === 'token') {
            valueA = a.token?.name || '';
            valueB = b.token?.name || '';
        } else if (column === 'rank') {
            valueA = tokens.indexOf(a) + 1;
            valueB = tokens.indexOf(b) + 1;
        } else {
            valueA = parseFloat(a[column]) || 0;
            valueB = parseFloat(b[column]) || 0;
        }
        
        if (order === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
}

function rankAndDisplayTokens() {
    if (!tokensData.length) return;

    const weights = getWeights(currentTab);
    
    // Calculate scores
    const scoredTokens = tokensData.map(token => ({
        ...token,
        score: calculateScore(token, weights, currentTab)
    }));

    // Sort tokens
    const sortedTokens = sortTokens(scoredTokens, currentSort.column, currentSort.order);
    
    displayTokens(sortedTokens);
    updateSortHeaders();
}

function updateSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === currentSort.column) {
            header.classList.add(`sort-${currentSort.order}`);
        }
    });
}

// Updated displayTokens function with better link handling

function displayTokens(tokens) {
    const resultsPerPage = parseInt(document.getElementById('results-per-page').value);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pageTokens = tokens.slice(startIndex, endIndex);
    
    const tbody = document.getElementById('tokens-table-body');
    
    tbody.innerHTML = pageTokens.map((token, index) => {
        const change24 = parseFloat(token.change24) || 0;
        const changeClass = change24 > 0 ? 'change-positive' : change24 < 0 ? 'change-negative' : 'change-neutral';
        const changeSign = change24 > 0 ? '+' : '';
        const rank = startIndex + index + 1;
        
        // Find the token in the original tokensData array for proper indexing
        const originalIndex = tokensData.findIndex(t => 
            t.token?.address === token.token?.address && 
            t.token?.networkId === token.token?.networkId
        );
        
        // Check if token has valid data for Matcha link
        const hasValidAddress = token.token?.address && token.token?.address !== 'N/A';
        const hasValidNetwork = token.token?.networkId;
        const canOpenMatcha = hasValidAddress && hasValidNetwork;
        
        // Create click handler
        const clickHandler = canOpenMatcha 
            ? `onclick="openTokenOnMatcha(tokensData[${originalIndex}])" style="cursor: pointer;"` 
            : `style="cursor: not-allowed; opacity: 0.7;" title="No address available"`;
        
        // Tooltip text
        const tooltipText = canOpenMatcha 
            ? "Click to view on Matcha" 
            : "Address not available";
        
        return `
            <tr ${clickHandler} title="${tooltipText}">
                <td class="rank-cell">${rank}</td>
                <td>
                    <div class="token-name">
                        ${token.token?.name || 'Unknown Token'}
                        ${canOpenMatcha ? '<span class="external-link-icon">🔗</span>' : '<span class="external-link-icon" style="opacity: 0.3;">❌</span>'}
                    </div>
                    <span class="token-symbol">${token.token?.symbol || 'N/A'}</span>
                    ${token.isScam ? '<div class="scam-warning">⚠️ SCAM</div>' : ''}
                    ${!canOpenMatcha ? '<div style="font-size: 0.7rem; color: #999;">No Matcha link</div>' : ''}
                </td>
                <td class="price-cell">${formatPrice(token.priceUSD)}</td>
                <td class="${changeClass}">${changeSign}${(change24 * 100).toFixed(2)}%</td>
                <td class="volume-cell">${formatNumber(token.volume24)}</td>
                <td class="mcap-cell">${formatNumber(token.marketCap)}</td>
                <td class="liquidity-cell">${formatNumber(token.liquidity)}</td>
                <td>${formatNumber(token.txnCount24, 0)}</td>
                <td>${formatNumber(token.holders, 0)}</td>
                <td>${getTimeSinceCreation(token.createdAt)}</td>
                <td class="score-cell">${token.score.toFixed(1)}</td>
            </tr>
        `;
    }).join('');

    updatePagination(tokens.length, resultsPerPage);
}

function updatePagination(totalTokens, resultsPerPage) {
    const totalPages = Math.ceil(totalTokens / resultsPerPage);
    const paginationEl = document.getElementById('pagination');
    const pageInfoEl = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (totalPages > 1) {
        paginationEl.style.display = 'flex';
        pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    } else {
        paginationEl.style.display = 'none';
    }
}

function changePage(direction) {
    const resultsPerPage = parseInt(document.getElementById('results-per-page').value);
    const totalPages = Math.ceil(tokensData.length / resultsPerPage);
    
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    rankAndDisplayTokens();
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
    
    if (days > 0) return `${days}d`;
    return `${hours}h`;
}

function getNetworkName(networkId) {
    const networks = {
        1: 'ethereum',
        56: 'bsc',
        137: 'polygon',
        43114: 'avalanche',
        250: 'fantom',
        42161: 'arbitrum',
        10: 'optimism',
        'solana': 'solana'
    };
    return networks[networkId] || 'ethereum';
}

function openTokenOnMatcha(token) {
    const networkName = getNetworkName(token.token?.networkId);
    const tokenAddress = token.token?.address;
    
    if (tokenAddress) {
        const matchaUrl = `https://matcha.xyz/tokens/${networkName}/${tokenAddress}`;
        window.open(matchaUrl, '_blank');
    } else {
        console.warn('Token address not available for:', token.token?.name);
    }
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    currentTab = tabName;
    currentPage = 1;
    rankAndDisplayTokens();
}

async function fetchTokens() {
    const statusElement = document.getElementById('api-status');
    statusElement.textContent = 'Fetching tokens...';
    
    try {
        let apiTokens = [];
        
        // Check if tokenAPI is available (from api.js)
        if (window.tokenAPI) {
            // Fetch different data based on current tab
            switch(currentTab) {
                case 'trending':
                    apiTokens = await window.tokenAPI.getTrendingTokens();
                    break;
                case 'popular':
                    apiTokens = await window.tokenAPI.getPopularTokens();
                    break;
                case 'new':
                    apiTokens = await window.tokenAPI.getNewTokens();
                    break;
                default:
                    apiTokens = await window.tokenAPI.fetchTokens();
            }
            
            tokensData = apiTokens;
            statusElement.textContent = `Loaded ${tokensData.length} tokens successfully!`;
        } else {
            throw new Error('API not available');
        }
        
        rankAndDisplayTokens();
        
    } catch (error) {
        console.error('Error fetching tokens:', error);
        statusElement.textContent = `Error fetching data: ${error.message}. Using mock data for demo.`;
        
        // Fallback to mock data for development
        tokensData = generateMockTokens();
        rankAndDisplayTokens();
    }
}

function generateMockTokens() {
    const mockTokens = [];
    const tokenNames = [
        'YinYang', 'MoonCoin', 'RocketFuel', 'DeFiMax', 'CryptoGem', 
        'TokenX', 'StarCoin', 'MetaVerse', 'BlockChain', 'CoinBase', 
        'DogeCoin', 'SafeMoon', 'ShibaInu', 'ElonMars', 'ToTheMoon',
        'DiamondHands', 'AlphaCoin', 'BetaToken', 'GammaFi', 'DeltaSwap'
    ];
    
    for (let i = 0; i < 150; i++) {
        const basePrice = Math.random() * 10;
        const volume24 = Math.random() * 5000000;
        const marketCap = volume24 * (10 + Math.random() * 100);
        const createdAt = Date.now() / 1000 - Math.random() * 90 * 24 * 60 * 60;
        const networkIds = [1, 56, 137, 'solana', 42161, 10, 43114, 250];
        
        mockTokens.push({
            token: {
                name: `${tokenNames[i % tokenNames.length]} ${Math.floor(i / tokenNames.length) + 1}`,
                symbol: `${tokenNames[i % tokenNames.length].substring(0, 3).toUpperCase()}${Math.floor(i / tokenNames.length) + 1}`,
                address: generateMockAddress(i),
                networkId: networkIds[i % networkIds.length]
            },
            priceUSD: basePrice.toFixed(6),
            change24: (Math.random() - 0.5) * 2,
            volume24: volume24.toFixed(2),
            volumeChange24: (Math.random() - 0.5) * 2,
            marketCap: marketCap.toFixed(2),
            liquidity: (Math.random() * 1000000).toFixed(2),
            holders: Math.floor(Math.random() * 25000),
            txnCount24: Math.floor(Math.random() * 2000),
            buyCount24: Math.floor(Math.random() * 1000),
            sellCount24: Math.floor(Math.random() * 1000),
            createdAt: Math.floor(createdAt),
            exchanges: [{ 
                name: ['Uniswap', 'SushiSwap', 'PancakeSwap', 'Balancer', '1inch'][Math.floor(Math.random() * 5)] 
            }],
            isScam: Math.random() < 0.03
        });
    }
    
    return mockTokens;
}

function generateMockAddress(index) {
    // Generate realistic looking addresses for different networks
    if (index % 4 === 0) {
        // Solana address format
        return Array(44).fill(0).map(() => 
            'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)]
        ).join('');
    } else {
        // Ethereum-style address
        return '0x' + Array(40).fill(0).map(() => 
            '0123456789abcdef'[Math.floor(Math.random() * 16)]
        ).join('');
    }
}

// Global functions for HTML onclick handlers
window.showTab = showTab;
window.fetchTokens = fetchTokens;
window.changePage = changePage;
window.openTokenOnMatcha = openTokenOnMatcha;