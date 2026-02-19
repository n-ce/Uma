// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Fetches an audio stream URL for a specific video ID from the instance.
 */
async function getAudioUrl(instance: string): Promise<[string, string]> {
    try {
        const res = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`);
        const data = await res.json();
        
        if (data?.adaptiveFormats) {
            const audioFormat = data.adaptiveFormats.find((f: { type: string; }) => f.type.startsWith('audio'));
            return [instance, audioFormat ? audioFormat.url : ''];
        }
    } catch (e) {
        // Silently fail to keep logs clean during bulk testing
    }
    return [instance, ''];
}

/**
 * Tests if the instance can successfully proxy the fetched audio URL.
 */
async function loadTest(i: string, url: string): Promise<[string, boolean]> {
    if (!url) return [i, false];

    try {
        const curl = new URL(url);
        const origin = curl.origin;
        const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);

        const res = await fetch(proxiedUrl);
        const passed = res.status === 200;
        console.log(`loadTest: ${i} - ${passed ? 'passed' : 'failed'}`);
        return [i, passed];
    } catch {
        return [i, false];
    }
}

/**
 * Main logic to split, test, and order instances by proxy capability.
 */
export default async function() {
    console.log('Initiating Invidious load test');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    // Split into three chunks
    const splitInThree = (arr: string[]) => {
        const size = Math.ceil(arr.length / 3);
        return [
            arr.slice(0, size),
            arr.slice(size, size * 2),
            arr.slice(size * 2)
        ];
    };

    const chunks = splitInThree(instances);
    
    // Process chunks to get potential audio URLs
    const audioResults = await Promise.all(
        chunks.map(chunk => Promise.all(chunk.map(getAudioUrl)))
    );
    const flatAudioResults = audioResults.flat();

    // Perform load tests on instances that returned a URL
    const loadResults = await Promise.all(
        flatAudioResults.map(([inst, url]) => loadTest(inst, url))
    );

    // Create a Map for quick lookup of test results
    const resultsMap = new Map(loadResults);

    // Sort: Passed instances first, failed/unresponsive last
    const finalOrderedList = instances.sort((a, b) => {
        const aPassed = resultsMap.get(a) ? 1 : 0;
        const bPassed = resultsMap.get(b) ? 1 : 0;
        return bPassed - aPassed; 
    });

    console.log(`Test complete. Prioritized ${loadResults.filter(r => r[1]).length} functional proxies.`);
    return finalOrderedList;
}
