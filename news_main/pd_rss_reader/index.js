const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { decode } = require('html-entities');
const readline = require('readline');
const { News_PD_AIFilter } = require('../pd_handler');
const { test } = require('./test_pd_debug'); // ✅ must include .js extension

// Category definitions
const CATEGORIES = {
    patronlar: 'patronlar',
    borsa: 'borsa',
    teknoloji: 'teknoloji',
    saglik: 'saglik',
    doga: 'doga',
    emlak: 'emlak',
    tekstil: 'tekstil',
    lux: 'lux',
    dunya: 'dunya',
    spor: 'spor',
    'kultur-sanat': 'kultur-sanat',
    gundem: 'gundem',
    medya: 'medya',
    aktuel: 'aktuel',
    otomobil: 'otomobil',
    finans: 'finans',
    ekonomi: 'ekonomi',
    sirketler: 'sirketler',
};

const BASE_RSS_URL = 'https://www.patronlardunyasi.com/rss/';
const STORAGE_PATH = './news_main/storage/';

// Clean content
function cleanText(text) {
    const once = decode(text);
    const twice = decode(once);
    return twice
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}



// Fetch and parse RSS for a specific category
async function fetchRSS(category) {
    const RSS_URL = `${BASE_RSS_URL}${category}`;
    try {
        const response = await fetch(RSS_URL);
        const xml = await response.text();

        return new Promise((resolve) => {
            xml2js.parseString(xml, (err, result) => {
                if (err || !result?.rss?.channel?.[0]?.item) {
                    console.log(`⚠️ Failed or unexpected format for category "${category}":`, err?.message || 'Unexpected structure');
                    return resolve([]);
                }

                const items = result.rss.channel[0].item;
                const latest10 = items.slice(0, 10).map((item) => {
                    const rawContent = item['content:encoded']?.[0] || '';
                    const decodedOnce = decode(rawContent);          // decode HTML entities
                    const decodedTwice = decode(decodedOnce);       // sometimes double-encoded
                    const cleanedContent = decodedTwice
                        .replace(/\r?\n|\r/g, ' ')                   // remove newlines
                        .replace(/\s+/g, ' ')                        // collapse spaces
                        .trim();

                    return {
                        title: cleanText(item.title[0]),
                        description: cleanText(item.description[0]),
                        content: cleanedContent,
                        pubDate: item.pubDate[0],
                        link: item.link[0],
                    };
                });
                resolve(latest10);
            });
        });
    } catch (error) {
        console.log(`❌ Error fetching RSS for ${category}:`, error.message);
        return [];
    }
}

function getJSONFilePath(category) {
    return `${STORAGE_PATH}pd_${category}_news.json`;
}

function readOldNews(filePath) {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return [];
}

function saveNews(filePath, newsArray) {
    fs.writeFileSync(filePath, JSON.stringify(newsArray, null, 2), 'utf-8');
}

// Updated to check for first three - because PD deletes or modifies some news)
function findNewNews(oldNews, newNews, maxLookahead = 3) {
    if (oldNews.length === 0) return newNews;
    // Check the first few oldNews items to find a match in newNews
    for (let i = 0; i < Math.min(maxLookahead, oldNews.length); i++) {
        const oldTitle = oldNews[i]?.title;
        const matchIndex = newNews.findIndex(item => item.title === oldTitle);
        if (matchIndex !== -1) {
            return newNews.slice(0, matchIndex);
        }
    }
    // No match found in first few entries — assume all are new
    return newNews;
}


async function processCategory(category) {
    const filePath = getJSONFilePath(category);
    const oldNews = readOldNews(filePath);
    const fetchedNews = await fetchRSS(category);
    const newNews = findNewNews(oldNews, fetchedNews);

    if (newNews.length > 8) { // 8'den fazla haber yeniyse iptal et.
        console.log(`⚠️ [${category}] RSS was probably broken: More than 8 news were new? Skipping.`);
    } else if (newNews.length > 0) {
        console.log(`🆕 [${category}] ${newNews.length} new news found:`);
        newNews.forEach((n, i) => {
            console.log(`📰 News #${i}: ${n.link}`);
            News_PD_AIFilter(`${n.title}`, `${n.description}`, `${n.content}`, `${n.pubDate}`, `${n.link}`);
        });
    }

    saveNews(filePath, fetchedNews);

}

// Main loop
async function runPDSession() {
    console.log('⏳ Initializing multi-category RSS fetcher...\n');

    for (const category of Object.keys(CATEGORIES)) {
        const filePath = getJSONFilePath(category);
        const initialNews = await fetchRSS(category);
        if (initialNews.length > 0) {
            saveNews(filePath, initialNews);
            console.log(`✅ [${category}] Initial news saved.`);
        }
    }

    test();

    const interval = setInterval(async () => {
        console.log(`\n🔁 Fetching PD updates at ${new Date().toLocaleTimeString()}...`);
        for (const category of Object.keys(CATEGORIES)) {
            await processCategory(category);
        }
    }, 60 * 1000); // Every minute

    // Graceful exit
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    console.log("\nPress 'e' to exit the session.");
    process.stdin.on('keypress', (_, key) => {
        if (key.name === 'e') {
            clearInterval(interval);
            console.log('\n👋 Exiting multi-category RSS session.');
            process.exit();
        }
    });
}

module.exports = { runPDSession };
