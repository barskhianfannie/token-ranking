

 // config/api.js - Token API with Debug Logging
console.log('🔧 API.js loading...');

class TokenAPI {
    constructor() {
        console.log('🚀 TokenAPI constructor called');
        
        // Replace these with your actual values
        this.endpoint = 'https://graph.codex.io/graphql'; 
        this.apiKey = 'f45042493bb1aa74d5e8f4cb1e5272121e5c14f9'; 
        
        this.headers = {
            'Content-Type': 'application/json',
            // Uncomment and update based on your API requirements:
            'Authorization': `f45042493bb1aa74d5e8f4cb1e5272121e5c14f9`,
            // 'X-API-Key': this.apiKey,
            // 'x-api-key': this.apiKey,
        };
        
        this.debug = true; // Set to false for production
        
        console.log('📍 Endpoint configured:', this.endpoint);
        console.log('🔑 Headers configured:', this.headers);
        
        // Validate configuration
        if (this.endpoint === 'YOUR_ACTUAL_GRAPHQL_ENDPOINT_HERE') {
            console.warn('⚠️ WARNING: You need to update the endpoint URL in config/api.js');
        }
    }

    async testConnection() {
        console.log('🧪 Testing API connection...');
        
        try {
            const testQuery = `
                query TestConnection {
                    filterTokens(limit: 1) {
                        count
                        results {
                            token {
                                name
                                symbol
                            }
                        }
                    }
                }
            `;
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ query: testQuery })
            });
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Test connection successful:', data);
            return true;
            
        } catch (error) {
            console.error('❌ Test connection failed:', error);
            return false;
        }
    }

    async fetchTokens(filters = {}) {
        console.log('📊 Fetching tokens with filters:', filters);
        
        const query = `
            query FilterTokens($filters: TokenFilters, $limit: Int, $offset: Int) {
                filterTokens(
                    filters: $filters
                    limit: $limit
                    offset: $offset
                    statsType: FILTERED
                ) {
                    count
                    page
                    results {
                        priceUSD
                        change24
                        change1
                        change5m
                        volume24
                        volume1
                        volumeChange24
                        marketCap
                        circulatingMarketCap
                        liquidity
                        holders
                        txnCount24
                        txnCount1
                        buyCount24
                        sellCount24
                        uniqueTransactions24
                        createdAt
                        lastTransaction
                        isScam
                        high24
                        low24
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
            filters: {
                liquidity: { gt: 10000 },
                txnCount24: { gt: 10 },
                network: [1], // Ethereum network
                ...filters
            },
            limit: 200,
            offset: 0
        };

        if (this.debug) {
            console.log('🔍 GraphQL Query:', query);
            console.log('🔍 Variables:', variables);
            console.log('🔍 Endpoint:', this.endpoint);
            console.log('🔍 Headers:', this.headers);
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

            console.log('📡 Fetch response status:', response.status);
            console.log('📡 Fetch response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('📥 Raw API Response:', data);
            }
            
            if (data.errors) {
                console.error('❌ GraphQL Errors:', data.errors);
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }

            if (!data.data || !data.data.filterTokens) {
                console.error('❌ Unexpected response structure:', data);
                throw new Error('Unexpected response structure from API');
            }

            const tokens = data.data.filterTokens.results;
            console.log(`✅ Successfully fetched ${tokens.length} tokens`);
            
            return tokens;

        } catch (error) {
            console.error('❌ API Error:', error);
            console.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    // Method to get trending tokens
    async getTrendingTokens() {
        console.log('📈 Fetching trending tokens...');
        return this.fetchTokens({
            change24: { gt: 0.1 }, // Tokens with >10% price increase
            volume24: { gt: 50000 }, // Volume > $50k
            txnCount24: { gt: 100 }
        });
    }

    // Method to get new tokens
    async getNewTokens() {
        console.log('✨ Fetching new tokens...');
        const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        return this.fetchTokens({
            createdAt: { gt: oneDayAgo },
            liquidity: { gt: 5000 }
        });
    }

    // Method to get popular tokens
    async getPopularTokens() {
        console.log('🔥 Fetching popular tokens...');
        return this.fetchTokens({
            volume24: { gt: 100000 },
            holders: { gt: 100 },
            marketCap: { gt: 1000000 }
        });
    }
}

// Create global API instance
console.log('🌍 Creating global tokenAPI instance...');
window.tokenAPI = new TokenAPI();

// Test connection immediately
window.tokenAPI.testConnection().then(success => {
    if (success) {
        console.log('🎉 API connection test passed!');
    } else {
        console.warn('⚠️ API connection test failed - will use mock data');
    }
});

console.log('✅ API.js loaded successfully');