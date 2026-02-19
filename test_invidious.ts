// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Stage 1: API Stats & Version Check.
 * Checks for the 'version' property regardless of HTTP status code.
 */
async function isAlive(instance: string): Promise<boolean> {
    try {
        const res = await fetch(`${instance}/api/v1/stats`);
        const data = await res.json();
        // Instance is considered alive if it returns a valid Invidious version string
        return data && typeof data === 'object' && 'version' in data;
    } catch {
        return false;
    }
}

/**
 * Stage 2: Audio URL and Proxy Verification.
 * Returns a score: 2 (Proxy Pass), 1 (Metadata Pass), 0 (Alive only).
 */
async function getFunctionalScore(instance: string): Promise<number> {
    try {
        const res = await fetch(`${instance}/api/v1/videos/v4pi1LxuDHc`);
        const data = await res.json();
        
        const audioFormat = data?.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio'));
        if (!audioFormat) return 0; 

        console.log('Testing Functional Capability: ', instance);

        const curl = new URL(audioFormat.url);
        const proxiedUrl = audioFormat.url.replace(curl.origin, instance) + '&host=' + curl.origin.slice(8);
        
        // Proxy check
        const proxyRes = await fetch(proxiedUrl, { method: 'HEAD' });
        return proxyRes.status === 200 ? 2 : 1;
    } catch {
        return 0;
    }
}

export default async function() {
    console.log('Initiating Invidious Multi-Stage Test...');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    const splitInThree = (arr: string[]) => {
        const s1 = Math.ceil(arr.length / 3);
        const s2 = Math.ceil((arr.length - s1) / 2) + s1;
        return [
            arr.slice(0, s1),
            arr.slice(s1, s2),
            arr.slice(s2)
        ];
    };

    const chunks = splitInThree(instances);

    // 1. Parallel check for instances returning a version property
    const aliveResults = await Promise.all(
        chunks.map(chunk => 
            Promise.all(chunk.map(async inst => (await isAlive(inst)) ? inst : null))
        )
    );
    const aliveList = aliveResults.flat().filter((i): i is string => i !== null);

    console.log(`Initial check: ${aliveList.length} instances validated via version.`);

    // 2. Score the alive instances for ordering
    const scoredList = await Promise.all(
        aliveList.map(async (inst) => {
            const score = await getFunctionalScore(inst);
            return { inst, score };
        })
    );

    // 3. Sort by score (Functional > Metadata > Version Only)
    const sortedFinalList = scoredList
        .sort((a, b) => b.score - a.score)
        .map(item => item.inst);

    console.log(`Final list compiled with ${sortedFinalList.length} instances.`);
    
    return sortedFinalList;
}
