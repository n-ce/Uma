// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Checks an Invidious instance for responsiveness and speed using the search suggestions API.
 * @param i The instance URL.
 * @returns A Promise resolving to [score, url], where score is 0 if failed.
 */
async function getSuggestions(i: string): Promise<[number, string]> {
    const t = performance.now();

    return fetch(i + '/api/v1/search/suggestions?q=the')
        .then(_ => _.json())
        .then(data => {
            const finalTime = performance.now() - t;
            console.log(i, finalTime); // Uncomment for logging time
            
            // Score is calculated inversely to response time (faster = higher score)
            const score = Math.floor(1e5 / finalTime);
            
            if (data?.suggestions?.length)
                return [score, i] as [number, string];
            else throw new Error('No suggestions found');
        })
        .catch(() => [0, i]);
}

/**
 * Fetches an audio stream URL for a specific video ID from the instance.
 * @param instance The instance URL.
 * @returns A Promise resolving to [instanceUrl, audioStreamUrl] or [instanceUrl, ''].
 */
async function getAudioUrl(instance: string): Promise<[string, string]> {
    const url = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`)
        .then(res => res.json())
        .then(data => {
            // console.log(instance, `data: ${Boolean(data.adaptiveFormats.length)}`); // Uncomment for logging
            
            if (data && 'adaptiveFormats' in data) {
                // Find the first audio-only format
                const audioFormat = data.adaptiveFormats.find((f: { type: string; }) => f.type.startsWith('audio'));
                if (audioFormat) {
                    return audioFormat.url;
                } else {
                    throw new Error('No audio format found');
                }
            } else {
                throw new Error(data.error || 'Unknown API error');
            }
        })
        .catch(() => '');

    return [instance, url];
}

/**
 * Tests if the instance can successfully proxy the fetched audio URL.
 * @param i The instance URL.
 * @param url The audio stream URL to be proxied.
 * @returns A Promise resolving to the instance URL if passed, or '' if failed.
 */
async function loadTest(i: string, url: string): Promise<string> {

    if (!url) {
        console.log(`loadTest: ${i} - Skipped (no audio URL)`);
        return '';
    }

    // Construct the proxied URL using the Invidious proxy mechanism
    const curl = new URL(url);
    const origin = curl.origin;
    const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);

    const passed = await fetch(proxiedUrl)
        .then(res => res.status === 200)
        .catch(() => false);

    console.log(`loadTest: ${i} - ${passed ? 'passed' : 'failed'} proxy test`);

    return passed ? i : '';
}

/**
 * Reorders the list of instances based on audio URL availability and proxy load test results.
 * @param instances The array of speed-sorted instance URLs.
 * @returns A Promise resolving to the final, prioritized array of instance URLs.
 */
async function reorderByLoadTest(instances: string[]): Promise<string[]> {
    console.log('Initiating load test to reorder instances...');
    console.log(`Testing ${instances.length} living instances.`);
    
    // Fetch audio URLs for all living instances in parallel
    const audioUrls = await Promise.all(instances.map(getAudioUrl));
    
    // Run the proxy load test for all instances in parallel
    const loadTestResults = await Promise.all(audioUrls.map(([instance, url]) => loadTest(instance, url)));

    // Sort the instances based on a multi-criteria priority
    instances = instances.sort((a, b) => {
        const aLoadTestPassed = loadTestResults.includes(a);
        const bLoadTestPassed = loadTestResults.includes(b);

        // 1. Prioritize instances that passed the loadTest (proxy capability)
        if (aLoadTestPassed && !bLoadTestPassed) return -1;
        if (!aLoadTestPassed && bLoadTestPassed) return 1;

        const aAudioUrl = audioUrls.find(([inst]) => inst === a)?.[1];
        const bAudioUrl = audioUrls.find(([inst]) => inst === b)?.[1];

        // 2. Then prioritize instances that successfully found an audio URL
        if (aAudioUrl && !bAudioUrl) return -1;
        if (!aAudioUrl && bAudioUrl) return 1;

        // 3. Fallback to original speed ranking (or maintain relative order)
        return 0; 
    });
    
    return instances;
}

// --- Main Execution Block ---

export default async function() {
    console.log('Initiating Invidious instance test');

    // 1. Read and parse the instance list
    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);
    console.log(`Total instances loaded: ${instances.length}`);
    
    // 2. Filter for living instances and sort by speed
    const suggestionsResults = await Promise.all(instances.map(getSuggestions));
    console.log(suggestionsResults); // Uncomment to see raw scores
    
    const livingInstances = suggestionsResults
        .sort((a, b) => b[0] - a[0]) // Sort ONLY the passing instances by speed
        .map(i => i[1] as string);   // Extract just the URL strings
        
    console.log(`Living instances found (speed-sorted): ${livingInstances.length}`);
    console.log(livingInstances); // Uncomment to see speed-sorted list
    
    // 3. Reorder by load test (proxy capability)
    const finalOrderedList = await reorderByLoadTest(livingInstances);

    return finalOrderedList;
}
