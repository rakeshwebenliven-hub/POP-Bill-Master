
import { BackupData, SavedBillData, ContractorProfile, UserProfile } from '../types';
import { getHistory, getProfiles, loadDraft, getClientProfiles } from './storageService';
import { getCurrentUser } from './authService';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// =========================================================================
// ⚠️ IMPORTANT: YOU MUST REPLACE THIS WITH YOUR OWN GOOGLE CLIENT ID
// Get one from: https://console.cloud.google.com/apis/credentials
// =========================================================================
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'pop_bill_master_backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize the Google API Client
export const initGoogleDrive = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkLibs = setInterval(() => {
      if (window.gapi && window.google) {
        clearInterval(checkLibs);
        
        // Load GAPI
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          if (gisInited) resolve();
        });

        // Load GIS
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // defined later
        });
        gisInited = true;
        if (gapiInited) resolve();
      }
    }, 500);
  });
};

// Authenticate User
export const connectToGoogleDrive = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if Client ID is configured
    if (CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
        alert("Developer Error: Google Client ID not configured. Please see services/googleDriveService.ts");
        reject("Client ID missing");
        return;
    }

    if (!tokenClient) {
      reject('Google API not initialized');
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve(resp.access_token);
    };

    // Prompt user to sign in
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

// --- BACKUP LOGIC ---

// 1. Gather all local data
const gatherLocalData = (): BackupData => {
  return {
    user: getCurrentUser(),
    history: getHistory(),
    profiles: getProfiles(),
    clientProfiles: getClientProfiles(),
    draft: loadDraft(),
    lastBackupTime: Date.now()
  };
};

// 2. Find existing backup file
const findBackupFile = async (): Promise<string | null> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
      fields: 'files(id, name)',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id; // Return the first matching file ID
    }
    return null;
  } catch (err) {
    console.error('Error searching files', err);
    throw err;
  }
};

// 3. Upload File (Create or Update)
export const backupToDrive = async (): Promise<string> => {
  try {
    // Ensure we have a token
    if (!window.gapi.client.getToken()) {
        await connectToGoogleDrive();
    }

    const data = gatherLocalData();
    const fileContent = JSON.stringify(data);
    const fileId = await findBackupFile();

    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      parents: !fileId ? ['appDataFolder'] : undefined // Only set parent on create
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

    const request = window.gapi.client.request({
      'path': fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
      'method': fileId ? 'PATCH' : 'POST',
      'params': {'uploadType': 'multipart'},
      'headers': {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody
    });

    await request;
    return new Date().toLocaleString();
  } catch (error) {
    console.error("Backup failed", error);
    throw error;
  }
};

// --- RESTORE LOGIC ---

export const restoreFromDrive = async (): Promise<boolean> => {
  try {
     // Ensure we have a token
    if (!window.gapi.client.getToken()) {
        await connectToGoogleDrive();
    }

    const fileId = await findBackupFile();
    if (!fileId) {
      alert("No backup found in your Google Drive.");
      return false;
    }

    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });

    const backup: BackupData = response.result;

    if (!backup || !backup.history) {
        throw new Error("Invalid backup file format");
    }

    // Restore to LocalStorage
    if (backup.user) localStorage.setItem('pop_user_profile', JSON.stringify(backup.user));
    if (backup.history) localStorage.setItem('pop_bill_history', JSON.stringify(backup.history));
    if (backup.profiles) localStorage.setItem('pop_contractor_profiles', JSON.stringify(backup.profiles));
    if (backup.clientProfiles) localStorage.setItem('pop_client_profiles', JSON.stringify(backup.clientProfiles));
    if (backup.draft) localStorage.setItem('pop_bill_draft', JSON.stringify(backup.draft));
    
    return true;

  } catch (error) {
    console.error("Restore failed", error);
    throw error;
  }
};
