/*

This is the TradingView API alternative backup system for
IF YahooFinance fails to fetch chart data (which occasionally occurs).

Although tradingview also provides indicators, because it is delayed for 15 minutes in BIST,
it is OK if we are just able to fetch chart data.

*/

import TradingView from '@mathieuc/tradingview';


export async function fetchTVchartData(symbol, timeframe = '15', range = 100) {

    const cleanSymbol = symbol.endsWith('.IS') ? symbol.slice(0, -3) : symbol;

    return new Promise((resolve, reject) => {
        const client = new TradingView.Client({
            token: process.env.TRADINGVIEW_TOKEN,
            signature: process.env.TRADINGVIEW_SIGNATURE,
        });
    
        let chart = new client.Session.Chart();
        chart.setMarket(`BIST:${cleanSymbol}`, {
            timeframe: `${timeframe}`,
            range, // Can be positive to get before or negative to get after
            //to: 1700000000,
        });
    
        chart.onSymbolLoaded(() => { // When the symbol is successfully loaded
            chart.onUpdate(() => {
                chart.periods.forEach(candle => {
                    candle.date = new Date(candle.time * 1000);
                    candle.high = candle.max;
                    candle.low = candle.min;
                });
                let charts = {
                    quotes: chart.periods
                };
                //charts.quotes = chart.periods;
                //chart.periods.reverse();
                charts.quotes.reverse();
                client.end();
                resolve(charts);
            });
        });

    });
}