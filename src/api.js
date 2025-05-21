
class TokenAPI {
    constructor() {
        
          this.endpoint = 'https://graph.codex.io/graphql'; 
          this.apiKey = 'f45042493bb1aa74d5e8f4cb1e5272121e5c14f9'; 
          
          this.headers = {
              'Content-Type': 'application/json',
              'Authorization': `f45042493bb1aa74d5e8f4cb1e5272121e5c14f9`,
          };
        
        this.debug = true;
    }

    async fetchTokensWithRanking(params = {}) {        
        const {
            rankings = [],
            filters = {},
            limit = 50,
            offset = 0,
            excludeTokens = [],
            phrase = '',
            statsType = 'FILTERED'
        } = params;
        
        const query = `
            query FilterTokens(
                $rankings: [TokenRanking]
                $filters: TokenFilters
                $limit: Int
                $offset: Int
                $excludeTokens: [String]
                $phrase: String
                $statsType: TokenPairStatisticsType
            ) {
                filterTokens(
                    rankings: $rankings
                    filters: $filters
                    limit: $limit
                    offset: $offset
                    excludeTokens: $excludeTokens
                    phrase: $phrase
                    statsType: $statsType
                ) {
                    count
                    page
                    results {
                        priceUSD
                        change24
                        change1
                        change4
                        change5m
                        change12
                        volume24
                        volume1
                        volume4
                        volume5m
                        volume12
                        volumeChange24
                        volumeChange1
                        volumeChange4
                        volumeChange5m
                        volumeChange12
                        marketCap
                        circulatingMarketCap
                        liquidity
                        holders
                        txnCount24
                        txnCount1
                        txnCount4
                        txnCount5m
                        txnCount12
                        buyCount24
                        buyCount1
                        buyCount4
                        buyCount5m
                        buyCount12
                        sellCount24
                        sellCount1
                        sellCount4
                        sellCount5m
                        sellCount12
                        buyVolume24
                        buyVolume1
                        buyVolume4
                        buyVolume5m
                        buyVolume12
                        sellVolume24
                        sellVolume1
                        sellVolume4
                        sellVolume5m
                        sellVolume12
                        uniqueTransactions24
                        uniqueTransactions1
                        uniqueTransactions4
                        uniqueTransactions5m
                        uniqueTransactions12
                        uniqueBuys24
                        uniqueBuys1
                        uniqueBuys4
                        uniqueBuys5m
                        uniqueBuys12
                        uniqueSells24
                        uniqueSells1
                        uniqueSells4
                        uniqueSells5m
                        uniqueSells12
                        createdAt
                        lastTransaction
                        age
                        high24
                        high1
                        high4
                        high5m
                        high12
                        low24
                        low1
                        low4
                        low5m
                        low12
                        isScam
                        swapPct1dOldWallet
                        swapPct7dOldWallet
                        walletAgeAvg
                        walletAgeStd
                        pair {
                            token0
                            token1
                        }
                        exchanges {
                            name
                        }
                        token {
                            address
                            decimals
                            name
                            networkId
                            symbol
                        }
                    }
                }
            }
        `;

        const variables = {
            rankings,
            filters,
            limit,
            offset,
            excludeTokens,
            phrase,
            statsType
        };

        if (this.debug) {
            console.log('GraphQL Query:', query);
            console.log('Variables:', JSON.stringify(variables, null, 2));
        }

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    query,
                    variables
                })
            });

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('📥 API Response data:', data);
            }
            
            if (data.errors) {
                console.error('GraphQL Errors:', data.errors);
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }

            if (!data.data || !data.data.filterTokens) {
                console.error('Unexpected response structure:', data);
                throw new Error('Unexpected response structure from API');
            }

            const result = data.data.filterTokens;
            console.log(`✅ Successfully fetched ${result.results.length} tokens, total count: ${result.count}`);
            
            return result;

        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    // Preset ranking configurations
    getPresetRankings() {
        return {
            trending: {
                rankings: [
                    { attribute: 'change24', direction: 'DESC' },
                    { attribute: 'volumeChange24', direction: 'DESC' },
                    { attribute: 'volume24', direction: 'DESC' }
                ],
                filters: {
                    liquidity: { gt: 50000 },
                    volume24: { gt: 10000 },
                    txnCount24: { gt: 50 }
                }
            },
            popular: {
                rankings: [
                    { attribute: 'volume24', direction: 'DESC' },
                    { attribute: 'marketCap', direction: 'DESC' },
                    { attribute: 'holders', direction: 'DESC' }
                ],
                filters: {
                    liquidity: { gt: 100000 },
                    volume24: { gt: 50000 },
                    holders: { gt: 100 }
                }
            },
            new: {
                rankings: [
                    { attribute: 'createdAt', direction: 'DESC' },
                    { attribute: 'volume24', direction: 'DESC' }
                ],
                filters: {
                    liquidity: { gt: 10000 },
                    volume24: { gt: 1000 }
                }
            },
            gainers: {
                rankings: [
                    { attribute: 'change24', direction: 'DESC' },
                    { attribute: 'volume24', direction: 'DESC' }
                ],
                filters: {
                    change24: { gt: 0.05 }, // Only tokens with >5% gain
                    liquidity: { gt: 25000 },
                    volume24: { gt: 5000 }
                }
            },
            volume: {
                rankings: [
                    { attribute: 'volume24', direction: 'DESC' },
                    { attribute: 'txnCount24', direction: 'DESC' },
                    { attribute: 'uniqueTransactions24', direction: 'DESC' }
                ],
                filters: {
                    liquidity: { gt: 25000 },
                    volume24: { gt: 25000 }
                }
            },
            active: {
                rankings: [
                    { attribute: 'uniqueTransactions24', direction: 'DESC' },
                    { attribute: 'uniqueBuys24', direction: 'DESC' },
                    { attribute: 'txnCount24', direction: 'DESC' }
                ],
                filters: {
                    liquidity: { gt: 25000 },
                    uniqueTransactions24: { gt: 50 }
                }
            }
        };
    }

    // Easy preset method calls
    async getTrendingTokens(limit = 100, offset = 0) {
        console.log('📈 Fetching trending tokens...');
        const preset = this.getPresetRankings().trending;
        return this.fetchTokensWithRanking({
            ...preset,
            limit,
            offset
        });
    }

    async getPopularTokens(limit = 100, offset = 0) {
        console.log('🔥 Fetching popular tokens...');
        const preset = this.getPresetRankings().popular;
        return this.fetchTokensWithRanking({
            ...preset,
            limit,
            offset
        });
    }

    async getNewTokens(limit = 100, offset = 0) {
        console.log('✨ Fetching new tokens...');
        const preset = this.getPresetRankings().new;
        return this.fetchTokensWithRanking({
            ...preset,
            limit,
            offset
        });
    }

    async testConnection() {
        console.log('🧪 Testing API connection...');
        
        try {
            const testResult = await this.fetchTokensWithRanking({
                rankings: [{ attribute: 'volume24', direction: 'DESC' }],
                filters: { network: [1] },
                limit: 1
            });
            
            console.log('✅ Test connection successful:', testResult);
            return true;
            
        } catch (error) {
            console.error('❌ Test connection failed:', error);
            return false;
        }
    }
}

// Create global API instance
console.log('🌍 Creating global tokenAPI instance...');
window.tokenAPI = new TokenAPI();

// Test connection on load
window.tokenAPI.testConnection().then(success => {
    if (success) {
        console.log('🎉 API connection test passed!');
    } else {
        console.warn('⚠️ API connection test failed - will use mock data');
    }
});

console.log('✅ API.js loaded successfully');