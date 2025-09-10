import "dotenv/config";
import rootAgent from "./agents/agent";
import {
	MarketDataTools,
	ScraperTools,
	SearchTools,
  
} from "./shared/tools/index";

function getCurrentDateFormatted(): string {
	return new Date().toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

class Timer {
	private startTime: number;
	private label: string;

	constructor(label: string) {
		this.label = label;
		this.startTime = Date.now();
	}

	elapsed(): number {
		return Date.now() - this.startTime;
	}

	log() {
		console.log(`${this.label}: ${this.elapsed()}ms`);
	}
}

const userQuery =
	process.env.USER_QUERY?.replace(/^"|"$/g, "") || process.argv[2] || "";

interface ScrapedContent {
	url: string;
	title: string;
	content: string;
	cleanedContent: string;
	publishedDate?: string;
	metadata: {
		relevanceScore: number;
		wordCount: number;
		source: string;
	};
}

interface SynonymResponse {
	synonyms: string[];
	originalQuery: string;
}

function createAnalysisPrompt(
	scrapedContents: ScrapedContent[],
	synonymResponse: SynonymResponse,
	augmentedData: any,
): string {
	const contentSummary = scrapedContents
		.map(
			(content, index) =>
				`${index + 1}. ${content.title}\nURL: ${content.url}\nContent: ${content.content.substring(0, 1000)}...`,
		)
		.join("\n\n");

	let prompt = `Based on the following information, provide a comprehensive crypto analysis:

ORIGINAL QUERY: ${synonymResponse.originalQuery}

SEARCH QUERIES USED:
${synonymResponse.synonyms.map((query, index) => `${index + 1}. ${query}`).join("\n")}`;

	if (augmentedData && Object.keys(augmentedData).length > 0) {
		prompt += `\n\n## LIVE MARKET DATA (CoinGecko API - ${getCurrentDateFormatted()}):\n`;
		for (const id in augmentedData) {
			const coin = augmentedData[id];
			const marketCap = coin.market_cap
				? `$${(coin.market_cap / 1000000).toFixed(2)}M`
				: "N/A";
			const volume24h = coin.total_volume
				? `$${(coin.total_volume / 1000000).toFixed(2)}M`
				: "N/A";
			const priceChange = coin.price_change_24h
				? `${coin.price_change_24h > 0 ? "+" : ""}${coin.price_change_24h.toFixed(2)}%`
				: "N/A";

			prompt += `### ${coin.name} (${coin.symbol.toUpperCase()}) - ${coin.id}\n`;
			prompt += `**Current Price:** $${coin.current_price}\n`;
			prompt += `**Market Cap:** ${marketCap}\n`;
			prompt += `**24h Volume:** ${volume24h}\n`;
			prompt += `**24h Change:** ${priceChange}\n`;
			prompt += `**24h Range:** $${coin.low_24h} - $${coin.high_24h}\n`;
			prompt += `**All-Time High:** $${coin.ath || "N/A"} (${coin.ath_date ? new Date(coin.ath_date).toLocaleDateString() : "N/A"})\n`;
			prompt += `**Circulating Supply:** ${coin.circulating_supply ? `${(coin.circulating_supply / 1000000).toFixed(2)}M ${coin.symbol.toUpperCase()}` : "N/A"}\n`;
			prompt += `**Market Cap Rank:** #${coin.market_cap_rank || "N/A"}\n\n`;
		}
	}

	prompt += `\n## RESEARCH SOURCES & CONTENT:\n${contentSummary}\n\n## ANALYSIS REQUIREMENTS:\n- Provide specific price targets with confidence levels\n- Include risk-reward ratios\n- Mention key support/resistance levels with exact prices\n- Compare against Bitcoin and overall market trends\n- Include trading volume analysis\n- Assess liquidity and market depth\n- Provide both bullish and bearish scenarios\n- Include correlation analysis with major crypto assets\n- Mention any regulatory or fundamental catalysts\n- Provide actionable entry/exit strategies with stop-losses`;
	return prompt;
}

async function main() {
	if (!userQuery.trim()) {
		console.log("❌ No query provided!");
		console.log("📝 Please provide a cryptocurrency analysis query.");
		console.log("💡 Examples:");
		console.log('   • "Technical analysis on Bitcoin and Ethereum"');
		console.log('   • "Price prediction for Solana and Cardano"');
		console.log('   • "Market analysis of DeFi tokens"');
		console.log("\n🔧 Usage:");
		console.log('   npm start "your query here"');
		console.log("   or set USER_QUERY environment variable");
		return;
	}

	const enableExa = process.env.ENABLE_EXA === "true";
	let searchEngine = process.env.SEARCH_ENGINE || process.argv[3] || "tavily";

	if (!enableExa && searchEngine === "dual") {
		searchEngine = "tavily";
	}

	console.log(`🔧 EXA Enabled: ${enableExa ? "✅" : "❌"}`);
	console.log(`🔍 Search Engine: ${searchEngine.toUpperCase()}`);
	console.log(`🚀 Starting crypto analysis for: "${userQuery}"`);

	// Initialize tools
	const marketDataTools = new MarketDataTools();
	const searchTools = new SearchTools();
	const scraperTools = new ScraperTools();

	// Validate query using query-validator agent
	const agent1 = await rootAgent.queryValidatorAgent;
	const validationResult = await agent1.runner.ask(userQuery);
	const validationContent =
		typeof validationResult === "string"
			? validationResult.trim()
			: JSON.stringify(validationResult);

	// Check if query is valid (not the default rejection message)
	const isValid = !/^sorry, please ask about crypto-related insights\.?$/i.test(
		validationContent,
	);

	if (!isValid) {
		console.log(validationContent);
		return;
	}

	const validation = {
		isValid: true,
		sanitizedQuery: validationContent,
	};

	const timer = new Timer("Total Analysis");

	console.log("📦 Setting up knowledge base from CoinGecko...");
	await marketDataTools.setupKnowledgeBase();

	// Identify tokens using token-identifier agent
	const tokenAgent = await rootAgent.tokenIdentifierAgent;
	const tokenResult = await tokenAgent.runner.ask(validation.sanitizedQuery);
	const tokenResponse =
		typeof tokenResult === "string"
			? tokenResult.trim()
			: JSON.stringify(tokenResult);

	const detectionResult =
		marketDataTools.parseTokenIdentificationResponse(tokenResponse);

	if ("error" in detectionResult) {
		console.log("❌ Token detection failed:", detectionResult.error);

		// Get suggestions if tokens couldn't be identified
		const suggestions = await marketDataTools.getSuggestions(
			validation.sanitizedQuery,
		);
		if (suggestions.length > 0) {
			console.log("\n💡 Suggested tokens based on your query:");
			suggestions.forEach((suggestion: any, index: number) => {
				console.log(
					`   ${index + 1}. ${suggestion.name} (${suggestion.symbol.toUpperCase()}) - ID: ${suggestion.id}`,
				);
			});
			console.log(
				"\n🎯 To improve accuracy, please rephrase your query using complete token names from the list above.",
			);
			console.log(
				'📝 Example: "Technical analysis of Bitcoin and Ethereum" instead of "BTC ETH analysis"',
			);
		} else {
			console.log(
				"Sorry, we only serve mid to popular coins for now. Please ask about well-known cryptocurrencies.",
			);
		}

		timer.log();
		return;
	}

	const detectedAssets = detectionResult as Array<{
		name: string;
		id: string;
		symbol: string;
	}>;
	console.log(`🪙 Detected ${detectedAssets.length} relevant coins`);

	// Generate synonyms using synonym-generator agent
	const agent2 = await rootAgent.synonymGeneratorAgent;
	const synonymResult = await agent2.runner.ask(
		`Generate synonym search queries for: "${validation.sanitizedQuery}"`,
	);
	const synonymContent =
		typeof synonymResult === "string"
			? synonymResult
			: JSON.stringify(synonymResult);

	console.log("🔍 Generated synonyms response:", synonymContent);

	let synonyms: string[] = [];
	try {
		const jsonMatch = synonymContent.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const jsonData = JSON.parse(jsonMatch[0]);
			for (const key in jsonData) {
				if (Object.hasOwn(jsonData, key) && typeof jsonData[key] === "string") {
					const synonym = jsonData[key].trim();
					if (synonym && synonym !== validation.sanitizedQuery) {
						synonyms.push(synonym);
					}
				}
			}
		}
	} catch (error) {
		synonyms = [
			`${validation.sanitizedQuery} analysis`,
			`${validation.sanitizedQuery} trends`,
			`${validation.sanitizedQuery} news`,
		];
	}

	const synonymResponse = {
		synonyms,
		originalQuery: validation.sanitizedQuery,
	};

	console.log(`📝 Generated ${synonymResponse.synonyms.length} search queries`);

	// Search for content
	let searchResults: any;
	const allQueries = [validation.sanitizedQuery, ...synonymResponse.synonyms];

	switch (searchEngine) {
		case "exa":
			searchResults = await searchTools.searchExaOnly(allQueries);
			break;
		case "tavily":
			searchResults = await searchTools.searchTavilyOnly(allQueries);
			break;
		case "dual":
		default:
			searchResults = await searchTools.searchDualEngine(allQueries);
			break;
	}

	console.log(
		`🔍 Found ${searchResults.urls.length} URLs from ${searchEngine} search`,
	);

	// Scrape content
	const scrapedContents: ScrapedContent[] = [];

	try {
		const scrapedResults = await scraperTools.scrapeMultiple(
			searchResults.urls.slice(0, 10),
		);
		scrapedContents.push(...scrapedResults);
	} catch (error) {
		console.error("Scraping failed:", error);
	}

	// Get market data
	const augmentedData =
		await marketDataTools.fetchDetailedCoinData(detectedAssets);

	// Generate final analysis using analysis-generator agent
	const analysisPrompt = createAnalysisPrompt(
		scrapedContents,
		synonymResponse,
		augmentedData,
	);
	const agent3: any = await rootAgent.analysisGeneratorAgent;
	const analysisResult = await agent3.runner.ask(analysisPrompt);
	const finalAnalysis =
		typeof analysisResult === "string"
			? analysisResult
			: JSON.stringify(analysisResult);

	timer.log();
	console.log("\n📊 FINAL ANALYSIS:\n");
	console.log(finalAnalysis);

	await scraperTools.cleanup();
}

main().catch(console.error);
