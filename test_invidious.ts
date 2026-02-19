// @ts-ignore
import { readFile } from 'fs/promises';

/**
 * Stage 1: Basic connectivity check.
 */
async function isAlive(instance: string): Promise<boolean> {
    try {
        const res = await fetch(instance, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Stage 2: Fetches audio stream URL.
 */
async function getAudioUrl(instance: string): Promise<[string, string | null]> {
    try {
        const res = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`);
        if (!res.ok) return [instance, null];
        
        const data = await res.json();
        const audioFormat = data?.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio'));
        return [instance, audioFormat ? audioFormat.url : null];
    } catch {
        return [instance, null];
    }
}

/**
 * Stage 3: Verifies proxy functionality.
 */
async function loadTest(i: string, url: string | null): Promise<boolean> {
    if (!url) return false;
    try {
        const curl = new URL(url);
        const proxiedUrl = url.replace(curl.origin, i) + '&host=' + curl.origin.slice(8);
        const res = await fetch(proxiedUrl, { method: 'HEAD' });
        return res.status === 200;
    } catch {
        return false;
    }
}

export default async function() {
    console.log('Initiating Invidious Multi-Stage Test (No Timeout)...');

    const fileContent = await readFile('./invidious.json', 'utf8');
    const instances: string[] = JSON.parse(fileContent);

    const splitInThree = (arr: string[]) => {
        const s1 = Math.ceil(arr.length / 3);
        const s2 = Math.ceil((arr.length - s1) / 2) + s1;
        return [arr.slice(0, s1), arr.slice(s1, s2), arr.slice(s2)];
    };

    const chunks = splitInThree(instances);

    // Initial pass: Gather the Alive List
    const aliveResults = await Promise.all(
        chunks.map(chunk => Promise.all(chunk.map(async inst => (await isAlive(inst)) ? inst : null)))
    );
    const aliveList = aliveResults.flat().filter((i): i is string => i !== null);

    if (aliveList.length === 0) {
        console.error('Failure: Zero instances are alive.');
        return []; // Return empty to indicate total failure
    }

    // Secondary pass: Deep test only those that are alive
    const deepTestResults = await Promise.all(aliveList.map(async inst => {
        const [_, audioUrl] = await getAudioUrl(inst);
        const passedProxy = await loadTest(inst, audioUrl);
        return passedProxy ? inst : null;
    }));

    const functionalList = deepTestResults.filter((i): i is string => i !== null);

    if (functionalList.length === 0) {
        console.warn('No instances passed proxy tests. Returning basic alive list.');
        return aliveList; // Minimum viable list
    }

    console.log(`Success: Found ${functionalList.length} functional instances.`);
    return functionalList;
}
