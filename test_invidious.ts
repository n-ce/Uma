// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Fetches an audio stream URL. Returns null if the instance is unresponsive or lacks data.
 */
async function getAudioUrl(instance: string): Promise<[string, string | null]> {
    try {
        const res = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        
        if (data?.adaptiveFormats) {
            const audioFormat = data.adaptiveFormats.find((f: { type: string; }) => f.type.startsWith('audio'));
            return [instance, audioFormat ? audioFormat.url : null];
        }
    } catch {
        // Error handled by returning null
    }
    return [instance, null];
}

/**
 * Tests the proxy capability. Returns true only on a strict 200 OK response.
 */
async function loadTest(i: string, url: string | null): Promise<boolean> {
    if (!url) return false;

    try {
        const curl = new URL(url);
        const origin = curl.origin;
        const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);

        const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(5000) });
        return res.status === 200;
    } catch {
        return false;
    }
}

export default async function() {
    console.log('Initiating Invidious load test (Filtering failures...)');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    // Split into three chunks for parallel processing
    const splitInThree = (arr: string[]) => {
        const size = Math.ceil(arr.length / 3);
        return [
            arr.slice(0, size),
            arr.slice(size, size * 2),
            arr.slice(size * 2)
        ];
    };

    const chunks = splitInThree(instances);
    
    // Step 1: Get URLs in parallel chunks
    const audioResults = (await Promise.all(
        chunks.map(chunk => Promise.all(chunk.map(getAudioUrl)))
    )).flat();

    // Step 2: Run load tests and filter out failures immediately
    const validInstances = await Promise.all(
        audioResults.map(async ([inst, url]) => {
            const passed = await loadTest(inst, url);
            return passed ? inst : null;
        })
    );

    // Step 3: Remove all null values (failed/unresponsive instances)
    const finalFilteredList = validInstances.filter((inst): inst is string => inst !== null);

    console.log(`Test complete. Found ${finalFilteredList.length} functional instances.`);
    return finalFilteredList;
}
