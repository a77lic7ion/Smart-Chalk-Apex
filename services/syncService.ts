import { db } from '../db';
import type { SavedTest, LessonPlan, Presentation, Slide, ImagePlaceholder, SavedHomework, SavedExam, SavedParsedExam, ManualExam, DbRecord } from '../types';

// This interface defines the structure of the data that will be sent to the server.
export interface SyncPayload {
    savedTests: SavedTest[];
    lessonPlans: LessonPlan[];
    presentations: Presentation[];
    slides: Slide[];
    imagePlaceholders: ImagePlaceholder[];
    savedHomework: SavedHomework[];
    savedExams: SavedExam[];
    savedParsedExams: SavedParsedExam[];
    savedManualExams: ManualExam[];
    trainingData: DbRecord[];
}

/**
 * Gathers all records from the local database that are marked as 'dirty' (not yet synced).
 * @returns A SyncPayload object containing all dirty records, or null if there's nothing to sync.
 */
export const gatherDirtyData = async (): Promise<SyncPayload | null> => {
    const payload: SyncPayload = {
        savedTests: [],
        lessonPlans: [],
        presentations: [],
        slides: [],
        imagePlaceholders: [],
        savedHomework: [],
        savedExams: [],
        savedParsedExams: [],
        savedManualExams: [],
        trainingData: []
    };

    let hasDirtyData = false;

    // Use a single transaction to read all dirty data from the local DB.
    await db.transaction('r', db.tables, async () => {
        payload.savedTests = await db.savedTests.where('syncStatus').equals('dirty').toArray();
        payload.lessonPlans = await db.lessonPlans.where('syncStatus').equals('dirty').toArray();
        payload.presentations = await db.presentations.where('syncStatus').equals('dirty').toArray();
        payload.slides = await db.slides.where('syncStatus').equals('dirty').toArray();
        payload.imagePlaceholders = await db.imagePlaceholders.where('syncStatus').equals('dirty').toArray();
        payload.savedHomework = await db.savedHomework.where('syncStatus').equals('dirty').toArray();
        payload.savedExams = await db.savedExams.where('syncStatus').equals('dirty').toArray();
        payload.savedParsedExams = await db.savedParsedExams.where('syncStatus').equals('dirty').toArray();
        payload.savedManualExams = await db.savedManualExams.where('syncStatus').equals('dirty').toArray();
        payload.trainingData = await db.trainingData.where('syncStatus').equals('dirty').toArray();
    });

    // Check if any of the arrays have data.
    for (const key in payload) {
        if (payload[key as keyof SyncPayload].length > 0) {
            hasDirtyData = true;
            break;
        }
    }

    return hasDirtyData ? payload : null;
};

// The time between sync attempts, in milliseconds. 5 minutes.
const SYNC_INTERVAL = 5 * 60 * 1000;

/**
 * Updates the syncStatus of all provided records to 'synced' in the local database.
 * @param syncedData The payload of data that was successfully synced with the server.
 */
const markDataAsSynced = async (syncedData: SyncPayload): Promise<void> => {
    await db.transaction('rw', db.tables, async () => {
        for (const key in syncedData) {
            const table = db[key as keyof typeof db] as Dexie.Table<any, any>;
            const ids = syncedData[key as keyof SyncPayload].map(item => item.id);
            if (ids.length > 0) {
                await table.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
            }
        }
    });
    console.log("Sync Service: Local data marked as synced.");
};

/**
 * The main sync function. It gathers dirty data and will eventually send it to the server.
 */
const performSync = async () => {
    console.log("Sync Service: Checking for data to sync with the server...");
    const dirtyData = await gatherDirtyData();

    if (!dirtyData) {
        console.log("Sync Service: No new data to sync.");
        return;
    }

    console.log("Sync Service: Found new data. Preparing to send to server...", dirtyData);

    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dirtyData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Could not parse error response.' }));
            throw new Error(`Server responded with status: ${response.status}. ${errorData.message}`);
        }

        await markDataAsSynced(dirtyData);
        console.log("Sync Service: Data successfully sent to the server and local records updated.");

    } catch (error) {
        console.error("Sync Service: Failed to send data to the server.", error);
    }
};

// A variable to hold the timer ID, so we can start and stop it.
let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * Starts the periodic sync service. If it's already running, it does nothing.
 */
export const startSyncService = () => {
    if (syncIntervalId) {
        console.log("Sync Service is already running.");
        return;
    }
    console.log(`Starting Sync Service. Will run every ${SYNC_INTERVAL / 1000 / 60} minutes.`);

    // Run once immediately on startup, then start the interval.
    performSync();
    syncIntervalId = setInterval(performSync, SYNC_INTERVAL);
};

/**
 * Stops the periodic sync service.
 */
export const stopSyncService = () => {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
        console.log("Sync Service stopped.");
    }
};