import { db } from '../../db';
import axios from 'axios';
import type { SavedTest, LessonPlan, Presentation, Slide, ImagePlaceholder, SavedHomework, SavedExam, SavedParsedExam, ManualExam, DbRecord } from '../../types';
import { ADMIN_EMAILS } from '../../config';

// Get current user email from localStorage
const getCurrentUserEmail = (): string | null => {
    try {
        const userProfile = localStorage.getItem('user_profile');
        if (userProfile) {
            const user = JSON.parse(userProfile);
            return user.email;
        }
    } catch (error) {
        console.error('Error getting user email:', error);
    }
    return null;
};

// Determine the appropriate base URL based on user
const getBaseURL = (): string => {
    const userEmail = getCurrentUserEmail();
    if (userEmail && userEmail.toLowerCase() === 'admin@smartchalk.co.za') {
        return 'http://localhost:3001/api';
    }
    return 'https://smart-chalk-apex.vercel.app/api';
};

// Create API instance with dynamic URL
const api = axios.create({
  baseURL: getBaseURL(),
});

// Add interceptor to include Google token in requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('google_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

/**
 * Gathers all records from the local database, regardless of sync status.
 * This is used for a manual "force sync".
 * @returns A SyncPayload object containing all records, or null if there's nothing to sync.
 */
export const gatherAllData = async (): Promise<SyncPayload | null> => {
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

    let hasData = false;

    // Use a single transaction to read all data from the local DB.
    await db.transaction('r', db.tables, async () => {
        payload.savedTests = await db.savedTests.toArray();
        payload.lessonPlans = await db.lessonPlans.toArray();
        payload.presentations = await db.presentations.toArray();
        payload.slides = await db.slides.toArray();
        payload.imagePlaceholders = await db.imagePlaceholders.toArray();
        payload.savedHomework = await db.savedHomework.toArray();
        payload.savedExams = await db.savedExams.toArray();
        payload.savedParsedExams = await db.savedParsedExams.toArray();
        payload.savedManualExams = await db.savedManualExams.toArray();
        payload.trainingData = await db.trainingData.toArray();
    });

    // Check if any of the arrays have data.
    for (const key in payload) {
        if (payload[key as keyof SyncPayload].length > 0) {
            hasData = true;
            break;
        }
    }

    return hasData ? payload : null;
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
    console.log("Sync: Checking for dirty data to sync with the server...");
    const dirtyData = await gatherDirtyData();

    if (!dirtyData) {
        console.log("Sync: No dirty data to sync.");
        return;
    }

    console.log("Sync: Found dirty data. Preparing to send to server...", dirtyData);

    try {
        // Recreate API instance with current base URL in case user changed
        const currentApi = axios.create({
            baseURL: getBaseURL(),
        });
        
        // Add interceptor for current API instance
        currentApi.interceptors.request.use(config => {
            const token = localStorage.getItem('google_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        
        const response = await currentApi.post('/sync', dirtyData);
        await markDataAsSynced(dirtyData);
        console.log("Sync: Data successfully sent to the server and local records updated.");

    } catch (error) {
        console.error("Sync: Failed to send data to the server.", error);
    }
};

/**
 * Performs a manual sync. It gathers all data and sends it to the server.
 * This is intended to be triggered by a user action.
 */
export const performManualSync = async (serverUrl?: string) => {
    console.log("Manual Sync: Checking for all data to sync with the server...");
    const allData = await gatherAllData();

    if (!allData) {
        console.log("Manual Sync: No data to sync.");
        return { success: true, message: 'No data to sync.' };
    }

    console.log("Manual Sync: Found data. Preparing to send to server...", allData);

    try {
        // Use provided server URL or determine based on current user
        let targetUrl = serverUrl;
        if (!targetUrl) {
            const userEmail = getCurrentUserEmail();
            if (userEmail && userEmail.toLowerCase() === 'admin@smartchalk.co.za') {
                targetUrl = 'http://localhost:3001';
            } else {
                targetUrl = 'https://smart-chalk-apex.vercel.app/api';
            }
        }
        
        const customApi = axios.create({
            baseURL: `${targetUrl}/api`,
        });
        
        // Add interceptor for custom API instance
        customApi.interceptors.request.use(config => {
            const token = localStorage.getItem('google_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        
        const response = await customApi.post('/sync', allData);

        await markDataAsSynced(allData);
        console.log("Manual Sync: Data successfully sent to the server and local records updated.");
        return { success: true, message: 'Data successfully synced.' };

    } catch (error) {
        console.error("Manual Sync: Failed to send data to the server.", error);
        return { success: false, message: 'Failed to sync data.' };
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