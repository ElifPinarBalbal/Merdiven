import { News_PD_AIFilter } from "../pd_handler.js";
import fs from 'fs';
import path from 'path';

export function test() {

    const category = `gundem`;
    const new_index = 4;
    const filePath = `./news_main/storage/pd_${category}_news.json`;

    if (!fs.existsSync(filePath)) {
        console.log('❌ File not found:', filePath);
        return;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    let items;

    try {
        items = JSON.parse(raw);
        if (!Array.isArray(items)) throw new Error('JSON is not an array.');
    } catch (err) {
        console.log('❌ Failed to parse JSON:', err.message);
        return;
    }

    let n = items[new_index];
    
    News_PD_AIFilter(`${n.title}`, `${n.description}`, `${n.content}`, `${n.pubDate}`, `${n.link}`);
}