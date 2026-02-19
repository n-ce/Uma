// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Fetches audio stream URL.
 */
async function getAudioUrl(instance: string): Promise<[string, string | null]> {
    try {
        // Using the same popular music ID as requested
        const res = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`, { 
            signal: AbortSignal.timeout(6000) 
        });
        
        if (!res.ok) return [instance, null];
        
        const data = await res.json();
        // Check for adaptiveFormats and ensure it's an array
        if (data?.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
            const audioFormat = data.adaptiveFormats.find((f: any) => f.type?.startsWith('audio'));
            return [instance, audioFormat ? audioFormat.url : null];
        }
    } catch (e) {
        // Silent catch to keep CI logs clean
    }
    return [instance, null];
}

/**
 * Validates the proxy functionality.
 */
async function loadTest(i: string, url: string | null): Promise<boolean> {
    if (!url) return false;
    try {
        const curl = new URL(url);
        const origin = curl.origin;
        // Construct the proxy URL
        const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);

        const res = await fetch(proxiedUrl, { 
            method: 'HEAD', // HEAD is faster for checking connectivity
            signal: AbortSignal.timeout(6000) 
        });
        
        return res.status === 200;
    } catch {
        return false;
    }
}

export default async function() {
    console.log('Initiating Invidious load test (3-way split)...');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    const splitInThree = (arr: string[]) => {
        const first = Math.ceil(arr.length / 3);
        const second = Math.ceil((arr.length - first) / 2) + first;
        return [
            arr.slice(0, first),
            arr.slice(first, second),
            arr.slice(second)
        ];
    };

    const chunks = splitInThree(instances);
    
    // Process chunks to find valid audio URLs
    const audioResults = (await Promise.all(
        chunks.map(chunk => Promise.all(chunk.map(getAudioUrl)))
    )).flat();

    // Filter to instances that returned a URL, then run load test
    const validInstances = await Promise.all(
        audioResults
            .filter(([_, url]) => url !== null)
            .map(async ([inst, url]) => {
                const passed = await loadTest(inst, url);
                return passed ? inst : null;
            })
    );

    const finalFilteredList = validInstances.filter((inst): inst is string => inst !== null);

    console.log(`Test complete. Found ${finalFilteredList.length} functional instances.`);
    
    // Safety check: If list is empty, return original to avoid wiping file and causing Git conflicts
    if (finalFilteredList.length === 0) {
        console.warn('Warning: No instances passed. Returning original list to prevent empty file.');
        return instances;
    }

    return finalFilteredList;
}
