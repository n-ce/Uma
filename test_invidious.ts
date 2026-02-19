// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Performs a deep functional check on a single instance using the video API.
 * Returns a score and the instance URL.
 */
async function getFunctionalScore(instance: string): Promise<[number, string] | null> {
    try {
        // Direct test using the video API
        const res = await fetch(`${instance}/api/v1/videos/v4pi1LxuDHc`);
        const data = await res.json();
        
        // If the response doesn't have adaptiveFormats, we consider it a failure 
        // as it cannot fulfill the primary purpose of the instance.
        if (!data || !data.adaptiveFormats) {
            return null;
        }

        console.log(`Checking: ${instance}`);

        const audioFormat = data.adaptiveFormats.find((f: any) => f.type?.startsWith('audio'));
        
        // If no audio format is found, the instance is alive but limited
        if (!audioFormat) return [1, instance];

        // Load Test (Proxy check)
        const curl = new URL(audioFormat.url);
        const proxiedUrl = audioFormat.url.replace(curl.origin, instance) + '&host=' + curl.origin.slice(8);
        
        const proxyRes = await fetch(proxiedUrl, { method: 'HEAD' });
        
        // Score 2: Full Proxy Pass | Score 1: Metadata Pass only
        const finalScore = proxyRes.status === 200 ? 2 : 1;
        return [finalScore, instance];

    } catch (e) {
        // Instance failed to return valid JSON or connection failed
        return null;
    }
}

export default async function() {
    console.log('Initiating Sequential Video API Test...');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    const results: { inst: string; score: number }[] = [];

    // One-by-one sequential execution
    for (const instance of instances) {
        const result = await getFunctionalScore(instance);
        if (result) {
            const [score, inst] = result;
            results.push({ inst, score });
        }
    }

    // Sort by functional score (Proxy > Metadata)
    const sortedFinalList = results
        .sort((a, b) => b.score - a.score)
        .map(item => item.inst);

    console.log(`Test complete. ${sortedFinalList.length} instances validated.`);
    
    return sortedFinalList;
}
