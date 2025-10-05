/*

This is the main file for PATRONLAR DÜNYASI - NEWS Analysis using AI.

The current flow is built around 2 filters. First one is a cheap AI model that tries to measure
if news are worth being read by the second AI to measure impact score and financial analysis.

Welcome to the future!

*/


import { getNews, storeNews } from './db_handler.js';

import { simulationGetPortfolio } from '../simulation/lib/simulationService.js';
import { liveGetPortfolio } from '../algolab/portfolio/lib/portfolioService.js';

import { SimulationBot_Buy, SimulationBot_BuyNotify, SimulationBot_Bypass, SimulationBot_CriticalHaltSellAll, SimulationBot_Sell, SimulationBot_SellNotify } from '../bot_main/lib/simulationbot.js';
import { LiveBot_Buy, LiveBot_BuyNotify, LiveBot_Bypass, LiveBot_CriticalHaltSellAll, LiveBot_Sell, LiveBot_SellNotify } from '../bot_main/lib/livebot.js';

// For GEMINI
//import { GoogleGenAI } from "@google/genai";
//const Gemini = new GoogleGenAI({ apiKey: "" });

// For OPENAI
import OpenAI from 'openai';
import { addBypass, isBypassed } from './bypass/bypass.js';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// BIST-100 list
const BIST100 = [
  "AEFES", "AGHOL", "AKBNK", "AKSA", "AKSEN", "ALARK", "ALFAS", "ALTNY", "ANSGR", "ARCLK",
  "ASELS", "ASTOR", "AVPGY", "BALSU", "BERA", "BIMAS", "BINHO", "BRSAN", "BRYAT", "BSOKE",
  "BTCIM", "CANTE", "CCOLA", "CIMSA", "CLEBI", "CWENE", "DOAS", "DOHOL", "DSTKF", "EFORC",
  "EGEEN", "EKGYO", "ENERY", "ENJSA", "ENKAI", "EREGL", "EUPWR", "FENER", "FROTO", "GARAN",
  "GENIL", "GESAN", "GLRMK", "GRSEL", "GRTHO", "GSRAY", "GUBRF", "HALKB", "HEKTS", "IEYHO",
  "IPEKE", "ISCTR", "ISMEN", "KCAER", "KCHOL", "KONTR", "KOZAA", "KOZAL", "KRDMD", "KTLEV",
  "KUYAS", "LMKDC", "MAGEN", "MAVI", "MGROS", "MIATK", "MPARK", "OBAMS", "ODAS", "OTKAR",
  "OYAKC", "PASEU", "PETKM", "PGSUS", "RALYH", "REEDR", "SAHOL", "SASA", "SISE", "SKBNK",
  "SMRTG", "SOKM", "TABGD", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO", "TSKB", "TTKOM",
  "TTRAK", "TUPRS", "TUREX", "TURSG", "ULKER", "VAKBN", "VESTL", "YEOTK", "YKBNK", "ZOREN"
];


// Exported first AI Filter function

export async function News_PD_AIFilter(news_title, news_description, news_content, news_pubdate, news_link) {

    let newsText = `${news_title}\n${news_description}\n${news_content}\n${news_pubdate}`;

    try {

      const parsedOutput1 = await fetchFirstAIResponse(newsText);
      const { firstPass, companySymbol, impactScore, furtherInvestigationRequired, explanation } = evaluateFirstResponse(parsedOutput1);
      
      if (firstPass) {

        console.log(`🗞️ | ${news_title}\n🗞️ | Passed First Filter.`);
        const parsedOutput2 = await fetchSecondAIResponse(companySymbol, furtherInvestigationRequired, newsText);
        const { companySymbol: companySymbol2, overall_impact_on_market, confidence_score, symbols, explanation } = evaluateSecondResponse(parsedOutput2); 
        console.log(companySymbol2, overall_impact_on_market, confidence_score, symbols);

        let portfolio;
        (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
        let positions = portfolio.rawData.positions.map(position => position.symbol);

        // Commence the operations
        symbols.forEach(item => {

          if (![...BIST100, 'OVERALL-MARKET'].includes(item.symbol)) {
            return;
          }

          storeNews({companySymbol: item.symbol, impactScore, furtherInvestigationRequired, explanation}, {news_title, news_description, news_content, news_link}, {confidence_score, impact_tone: item.tone, weighted_score: item.weighted_score, impact_reasoning: item.reason});

          // FIRST CHECK: Is there an action required for overall market?
          if (item.symbol === 'OVERALL-MARKET') {
            let duration = item.option; // I parsed the duration as item.option.
            if (item.tone === 'BEARISH') {
              (process.env.IS_LIVE) ?
              LiveBot_Bypass({duration, tone: item.tone}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
              SimulationBot_Bypass({duration, tone: item.tone}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
              if (duration === 24) {
                // CRITICAL SELL ALL NOTIFICATION
                (process.env.IS_LIVE) ?
                LiveBot_CriticalHaltSellAll({time: 15}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
                SimulationBot_CriticalHaltSellAll({time: 15}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
              }
            } else if (item.tone === 'BULLISH') {
              (process.env.IS_LIVE) ?
              LiveBot_Bypass({duration, tone: item.tone}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
              SimulationBot_Bypass({duration, tone: item.tone}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
            }
            return;
          }

          if (item.tone === 'BEARISH') {
            if ([3, 4].includes(item.option)) {
                if (positions.includes(item.symbol)) {
                    (process.env.IS_LIVE) ?
                    LiveBot_Sell({symbol: item.symbol, priority: 1}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
                    SimulationBot_Sell({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
                }
                if (item.option === 4) {
                    addBypass(item.symbol, 24);
                    console.log(`🗞️ | 24-hour bypass added for ${item.symbol}`);
                }
            } else if (item.option === 2) {
                if (positions.includes(item.symbol)) {
                  (process.env.IS_LIVE) ?
                  LiveBot_SellNotify({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
                  SimulationBot_SellNotify({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
                }
            }
          } else if (item.tone === 'BULLISH') {
            if (!positions.includes(item.symbol)) {
              if (item.option === 3) {
                  (process.env.IS_LIVE) ?
                  LiveBot_Buy({symbol: item.symbol, priority: 1}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
                  SimulationBot_Buy({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
              } else if (item.option === 2) {
                  (process.env.IS_LIVE) ?
                  LiveBot_BuyNotify({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`}) :
                  SimulationBot_BuyNotify({symbol: item.symbol}, {reason: `PD News:\n${news_title}`, reasonText: `<i>${item.reason}\n\n${news_link}</i>\n\nConfidence Score: ${confidence_score}`});
              }
            }
          }
          
        });
      
      } else {
        storeNews({companySymbol, impactScore, furtherInvestigationRequired, explanation}, {news_title, news_description, news_content, news_link}, {});
        console.log(`🗞️ | ${news_title}\n🗞️ | Did not pass.`);
      }

    } catch (err) {
      console.log("News AI analysis failed:", err);
    }

}


// Fetch first OpenAI API response
async function fetchFirstAIResponse(newsText) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  // Full prompt for GPT-4o-mini
  const prompt = `
# Instructions

- You are an expert in Turkish stock markets (BIST) and financial news analysis.
- A recent news publication has just arrived ("CURRENT NEWS"). Break down this news and analyze it accordingly with the JSON format provided at the end.
- Response Strategy:
[BU KISIMDA STRATEJİYİ BELİRLEMEK, PAZARLARA VEYA OLAYLARA AĞIRLIK VERMEK GİBİ KARARLAR SİZE KALMIŞTIR.]

# JSON Format

{
  "companySymbol": "BIST-listed company symbol/ticker (e.g., THYAO) if company is clearly mentioned, otherwise 'Maybe' if unclear, or 'No' if unrelated to any BIST-listed company",
  "impactScore": float between 0.00 and 1.00 (To what extent could CURRENT NEWS impact BIST stock prices of the company/market?),
  "furtherInvestigationRequired": float between 0.00 and 1.00 (How necessary is further investigation using web sources?),
  "explanation": "Short explanation (Max 3 sentences)"
}

# CURRENT NEWS
"${newsText}"
`;

  // Post the API request, get the values as JSON
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      text: {
        "format": {
          "type": "json_object"
        }
      },
      temperature: 1,
      top_p: 1,
      input: `${prompt}`,
    });

    //console.log(response);
    const content = response.output_text;

    let parsedOutput;
    try {
      const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```[\s\n]*$/, '')
      .trim();
      parsedOutput = JSON.parse(cleaned);
    } catch (e) {
      console.log('Failed to parse JSON from response:', content);
      return;
    }

    console.log(parsedOutput);
    return parsedOutput;

  } catch (error) {
    console.log('Error during GPT call:', error.response ? error.response.data : error.message);
    throw error;
  }

}


// 1st Brainuşka evaluation - Arda
function evaluateFirstResponse(parsedOutput) {
    const { companySymbol, impactScore, furtherInvestigationRequired, explanation } = parsedOutput;

    const firstPass =
        (companySymbol === 'No' && impactScore >= 0.3 && furtherInvestigationRequired >= 0.4) ||
        ((Number(companySymbol === 'Maybe') + Number(impactScore >= 0.5) + Number(furtherInvestigationRequired >= 0.5)) >= 2) ||
        ((companySymbol !== 'No' && companySymbol !== 'Maybe') || impactScore >= 0.8 || furtherInvestigationRequired >= 0.7);


    return { firstPass, companySymbol, impactScore, furtherInvestigationRequired, explanation };

}


// Fetch 2nd OpenAI response
async function fetchSecondAIResponse(company, furtherInvestigationRequired, newsText) {

  let portfolio;
  (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
  let positions = portfolio.rawData.positions.map(position => position.symbol);
  let cash = portfolio.rawData.cashBalance;
  let past_news, web_search;
  if (company !== "No" || company !== "Maybe") {
    past_news = getNews(company, 60); // last 60 days
    past_news = Array.isArray(past_news)
    ? past_news.slice(0, 10).map(n => n.news_description)
    : [];
  }
  if (furtherInvestigationRequired >= 0.7) {
    web_search = 'Make sure you search the web.';
  } else {
    web_search = 'You may also search the web if needed.';
  }

  // Switched to cache system for more cost efficiency. - Arda
  const prompt_cached_prefix =
`
# Instructions

[BU KISIMDA STRATEJİYİ BELİRLEMEK, PAZARLARA VEYA OLAYLARA AĞIRLIK VERMEK GİBİ KARARLAR SİZE KALMIŞTIR.]

- Task Strategy:

[BU KISIMDA STRATEJİYİ BELİRLEMEK, PAZARLARA VEYA OLAYLARA AĞIRLIK VERMEK GİBİ KARARLAR SİZE KALMIŞTIR.]


# JSON Format
- Return a single, valid JSON object with no other text or explanation in this format:

{
  "companySymbol": "BIST-listed company symbol (ticker) which CURRENT NEWS directly mentions, 'No' if no direct mentions to any BIST-listed company",
  "market_analysis": {
      "overall_tone": "What is the expected impact of CURRENT NEWS on The Company's stock price or the overall market? ('BULLISH', 'BEARISH', 'NULL')",
      "overall_impact_on_market": float from 0.00 to 1.00 for how powerful the impact of CURRENT NEWS would be on overall BIST stocks,
  },
  "affected_stocks_analysis": [
    {
      "ticker": "The stock code / ticker of the company that may be affected by CURRENT NEWS.",
      "impact_tone": "How may this stock be affected by this CURRENT NEWS? ('BULLISH', 'BEARISH', 'NULL')",
      "relevance_score": float from 0.00 to 1.00 indicating how likely the CURRENT NEWS is related to this stock,
      "impact_score": float from 0.00 to 1.00 on how powerful the impact would be,
      "impact_reasoning": "Explain exactly why this stock is affected, referencing both the CURRENT NEWS and any relevant NEWS."
    }
  ],
  "portfolio_impact_analysis": [
    {
      "ticker": "The stock code from the CLIENT PORTFOLIO list that will be affected.",
      "impact_tone": "How may this stock be affected by this CURRENT NEWS? ('BULLISH', 'BEARISH', 'NULL')",
      "relevance_score": float from 0.00 to 1.00 indicating how likely the news is related to this holding,
      "impact_score": float from 0.00 to 1.00 on how powerful the impact would be,
      "impact_reasoning": "Explain exactly why this holding is affected, referencing both the CURRENT NEWS and any relevant NEWS."
    }
  ] (Do not provide for unaffected CLIENT PORTFOLIO.),
  "confidence_score": float from 0.00 to 1.00 on how confident are you in your overall assessment,
  "connection": {
      "news_connection": "Does the CURRENT NEWS relate to any of the PREVIOUS NEWS items? (true/false)",
  },
  "explanation": "Provide a short reasoning for your assessment (Max. 4 sentences)."
}

## Include a stock ONLY in "portfolio_impact_analysis" if stock is in CLIENT PORTFOLIO. (Do not include also in "affected_stocks_analysis").
## IMPORTANT: Every company stock you mention MUST BE ACTIVELY TRADED WITHIN BIST and tickers must be VALID. You can use this list below:

`;

  const prompt_external_info =
`
# External Information
---
## Context: CLIENT PORTFOLIO
${positions}
Cash: ${cash} TRY
---
## Context: PREVIOUS NEWS
${past_news}
---
## CURRENT NEWS (To be analyzed)
${newsText}
---
`;

  const prompt =
`
${prompt_cached_prefix}

${prompt_external_info}
`;

  // Post the API request, get the values as JSON
  try {

    const response = await openai.responses.create({
      model: "gpt-4.1",
      temperature: 1,
      top_p: 1,
      max_output_tokens: 10000,
      input: `${prompt}`,
      text: {
        "format": {
          "type": "json_object"
        }
      },
    });

    console.log(response);
    const content = response.output_text;

    let parsedOutput;
    try {

      const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```[\s\n]*$/, '')
      .trim();

      parsedOutput = JSON.parse(cleaned);

    } catch (e) {
      console.log('Failed to parse JSON from response:', content);
      //throw e;
      return;
    }

    console.log(parsedOutput);
    return parsedOutput;

  } catch (error) {
    console.log('Error during GPT call:', error.response ? error.response.data : error.message);
    throw error;
  }

}

function evaluateSecondResponse(parsedOutput) {

  let {
    companySymbol,
    market_analysis: {overall_tone, overall_impact_on_market},
    affected_stocks_analysis,
    portfolio_impact_analysis,
    confidence_score,
    connection: {news_connection},
    explanation
  } = parsedOutput;

  const symbols = [];
  let weighted_score;

  // Make confidence stronger if connection exists with past news
  if (news_connection) {
    confidence_score = confidence_score + 0.2;
  }

  affected_stocks_analysis.forEach(item => {

    if (confidence_score < 0.5 || item.relevance_score < 0.55) return;
    if (item.impact_tone === 'NULL') return;
    if (portfolio_impact_analysis.some(stock => stock.ticker === item.ticker)) return;
    if (item.ticker === companySymbol) item.relevance_score = 1; // set relevance score to 1 if we are checking Company itself.
    weighted_score = ((confidence_score * item.impact_score) + ((1 - confidence_score) * item.relevance_score)) * (0.5 + (0.5 * confidence_score));

    if (weighted_score >= 0.7 && item.impact_tone === 'BEARISH') {
      symbols.push({symbol: item.ticker, option: 4, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.65) {
      symbols.push({symbol: item.ticker, option: 3, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.5) {
      symbols.push({symbol: item.ticker, option: 2, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.4) {
      symbols.push({symbol: item.ticker, option: 1, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    }

  });

  portfolio_impact_analysis.forEach(item => {

    if (confidence_score < 0.5 || item.relevance_score < 0.4) return;
    if (item.impact_tone === 'NULL') return;
    if (item.ticker === companySymbol) item.relevance_score = 1; // set relevance score to 1 if we are checking Company itself.

    // WEIGHTED GEOMETRIC RELEVANCE-PENALIZED SCORING
    weighted_score = (
      Math.pow(item.impact_score, 0.4) *
      Math.pow(confidence_score, 0.3) *
      Math.pow(item.relevance_score, 0.3)
    ) * (1 - Math.max(0, (0.85 - item.relevance_score) * 0.5));


    if (weighted_score >= 0.7 && item.impact_tone === 'BEARISH') {
      symbols.push({symbol: item.ticker, option: 4, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.65) {
      symbols.push({symbol: item.ticker, option: 3, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.5) {
      symbols.push({symbol: item.ticker, option: 2, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    } else if (weighted_score >= 0.45) {
      symbols.push({symbol: item.ticker, option: 1, tone: item.impact_tone, reason: item.impact_reasoning, weighted_score: weighted_score});
    }

  });

  // OVERALL MARKET & COMPANY ANALYSIS
  if (confidence_score >= 0.6 && ((companySymbol === 'No' && overall_impact_on_market >= 0.6) || (companySymbol !== 'No' && overall_impact_on_market >= 0.7))) {
    // weighted score calculation
    (confidence_score < 0.8) ? weighted_score = overall_impact_on_market * (confidence_score * 1.25) : weighted_score = overall_impact_on_market;

    // The option Im going to send is in fact the duration of the bypass.
    if (weighted_score >= 0.8) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 24, tone: overall_tone, reason: explanation, weighted_score: weighted_score}); // I'll check if it is BEARISH or not above.
    } else if (weighted_score >= 0.7) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 8, tone: overall_tone, reason: explanation, weighted_score: weighted_score});
    } else if (weighted_score >= 0.65) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 6, tone: overall_tone, reason: explanation, weighted_score: weighted_score});
    } else if (weighted_score >= 0.625) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 4, tone: overall_tone, reason: explanation, weighted_score: weighted_score});
    } else if (weighted_score >= 0.6) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 3, tone: overall_tone, reason: explanation, weighted_score: weighted_score});
    } else if (weighted_score >= 0.5) {
      symbols.push({symbol: 'OVERALL-MARKET', option: 2, tone: overall_tone, reason: explanation, weighted_score: weighted_score});
    }

  }

  return {companySymbol, overall_impact_on_market, confidence_score, symbols, explanation};

}