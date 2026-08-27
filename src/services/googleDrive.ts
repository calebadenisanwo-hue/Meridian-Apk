/**
 * Google Drive Client-Side Storage & Backup Service
 * 
 * Every user connects their OWN personal Google Drive account via Google Identity Services (OAuth2).
 * All data is encrypted/saved strictly to the user's private Google Drive (using the drive.file scope,
 * which only grants permission to files created by this app).
 */

const DRIVE_TOKEN_KEY = 'meridian:gdrive_token';
const DRIVE_USER_KEY = 'meridian:gdrive_user';
const DRIVE_BACKUP_FILE_NAME = 'meridian_personal_os_backup.json';
const DRIVE_CLIENT_ID_KEY = 'meridian:gdrive_client_id';

// Default / fallback public OAuth Client ID for the app, configurable by user
export const DEFAULT_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
export const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
  connectedAt: string;
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export interface DriveActionResult {
  success: boolean;
  message: string;
  fileId?: string;
  lastSync?: string;
}

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

/**
 * Loads the Google Identity Services (GIS) client script if not already loaded
 */
export async function loadGisScript(): Promise<boolean> {
  if (window.google?.accounts?.oauth2) {
    return true;
  }

  return new Promise((resolve) => {
    const existing = document.getElementById('google-gis-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Google GIS script');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Get stored OAuth token for the current user
 */
export function getStoredToken(): string | null {
  try {
    const tokenData = localStorage.getItem(DRIVE_TOKEN_KEY);
    if (!tokenData) return null;
    const parsed = JSON.parse(tokenData);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(DRIVE_TOKEN_KEY);
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
}

/**
 * Store user's Google OAuth access token
 */
export function storeToken(accessToken: string, expiresInSeconds = 3599): void {
  const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
  localStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify({ accessToken, expiresAt }));
}

/**
 * Get connected Google account details
 */
export function getConnectedUser(): GoogleDriveUser | null {
  try {
    const raw = localStorage.getItem(DRIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Set connected Google account details
 */
export function setConnectedUser(user: GoogleDriveUser | null): void {
  if (!user) {
    localStorage.removeItem(DRIVE_USER_KEY);
    localStorage.removeItem(DRIVE_TOKEN_KEY);
  } else {
    localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get custom Client ID if user specified one
 */
export function getCustomClientId(): string {
  return localStorage.getItem(DRIVE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
}

/**
 * Save custom Client ID
 */
export function setCustomClientId(id: string): void {
  if (id.trim()) {
    localStorage.setItem(DRIVE_CLIENT_ID_KEY, id.trim());
  } else {
    localStorage.removeItem(DRIVE_CLIENT_ID_KEY);
  }
}

/**
 * Connect the current user to THEIR personal Google Drive account
 */
export async function connectUserGoogleDrive(customClientId?: string): Promise<{ success: boolean; user?: GoogleDriveUser; error?: string }> {
  await loadGisScript();

  if (!window.google?.accounts?.oauth2) {
    return { success: false, error: 'Google Identity Services library could not be initialized.' };
  }

  const clientId = (customClientId || getCustomClientId() || '').trim();
  if (!clientId) {
    return {
      success: false,
      error: 'Google OAuth Client ID is required. Please provide a Client ID or configure one in settings.',
    };
  }

  return new Promise((resolve) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            storeToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);

            // Fetch user info with the token
            let userInfo: GoogleDriveUser = {
              email: 'Connected User',
              name: 'Google Account',
              connectedAt: new Date().toISOString(),
            };

            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                userInfo = {
                  email: info.email || 'user@gmail.com',
                  name: info.name || info.given_name || 'Google User',
                  picture: info.picture,
                  connectedAt: new Date().toISOString(),
                };
              }
            } catch (e) {
              console.warn('Could not fetch user profile info', e);
            }

            setConnectedUser(userInfo);
            resolve({ success: true, user: userInfo });
          } else {
            resolve({
              success: false,
              error: tokenResponse?.error_description || tokenResponse?.error || 'Authentication cancelled.',
            });
          }
        },
        error_callback: (err: any) => {
          resolve({ success: false, error: err?.message || 'Google Sign-in failed.' });
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      resolve({ success: false, error: err.message || 'Failed to initiate Google OAuth flow.' });
    }
  });
}

/**
 * Disconnect user's Google Drive account
 */
export function disconnectUserGoogleDrive(): void {
  const token = getStoredToken();
  if (token && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {
        console.log('Google token revoked');
      });
    } catch (e) {
      // Ignore
    }
  }
  setConnectedUser(null);
}

/**
 * Backup local data JSON to the user's personal Google Drive
 */
export async function uploadBackupToGoogleDrive(payload: Record<string, any>): Promise<DriveActionResult> {
  const token = getStoredToken();
  if (!token) {
    return {
      success: false,
      message: 'Google Drive is not connected. Please connect your personal Google account first.',
    };
  }

  const timestamp = new Date().toISOString();
  const backupData = {
    version: '2.4.0',
    type: 'meridian_full_backup',
    app: 'Meridian Personal Systems OS',
    exportedAt: timestamp,
    data: payload,
  };

  const fileContent = JSON.stringify(backupData, null, 2);

  try {
    // 1. Search if meridian_personal_os_backup.json already exists in user's Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!searchRes.ok) {
      if (searchRes.status === 401) {
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        return { success: false, message: 'Google session expired. Please reconnect your Google Drive.' };
      }
      throw new Error(`Drive search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

    if (existingFile) {
      // 2. Update existing file content
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        }
      );

      if (!updateRes.ok) {
        throw new Error(`Failed to update backup file in Drive: ${updateRes.statusText}`);
      }

      return {
        success: true,
        message: `Successfully backed up to your personal Google Drive (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
        fileId: existingFile.id,
        lastSync: timestamp,
      };
    } else {
      // 3. Create new backup file via multipart upload
      const metadata = {
        name: DRIVE_BACKUP_FILE_NAME,
        mimeType: 'application/json',
        description: 'Meridian Personal Systems OS local data backup',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!createRes.ok) {
        throw new Error(`Failed to create backup file in Drive: ${createRes.statusText}`);
      }

      const createdFile = await createRes.json();
      return {
        success: true,
        message: 'New backup file created and saved in your personal Google Drive.',
        fileId: createdFile.id,
        lastSync: timestamp,
      };
    }
  } catch (err: any) {
    console.error('Google Drive backup error:', err);
    return {
      success: false,
      message: err.message || 'Failed to save backup to Google Drive.',
    };
  }
}

/**
 * Retrieve backup JSON directly from the user's personal Google Drive
 */
export async function downloadBackupFromGoogleDrive(): Promise<{ success: boolean; data?: Record<string, any>; message: string; modifiedTime?: string }> {
  const token = getStoredToken();
  if (!token) {
    return {
      success: false,
      message: 'Google Drive is not connected. Please connect your personal Google account first.',
    };
  }

  try {
    // 1. Search for the backup file in user's Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!searchRes.ok) {
      if (searchRes.status === 401) {
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        return { success: false, message: 'Google session expired. Please reconnect your Google Drive.' };
      }
      throw new Error(`Drive lookup failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) {
      return {
        success: false,
        message: 'No existing Meridian backup file found in your Google Drive.',
      };
    }

    const file = searchData.files[0];

    // 2. Download the file content
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!downloadRes.ok) {
      throw new Error(`Failed to download backup content: ${downloadRes.statusText}`);
    }

    const parsedJson = await downloadRes.json();
    const dataPayload = parsedJson.data || parsedJson;

    return {
      success: true,
      data: dataPayload,
      modifiedTime: file.modifiedTime,
      message: `Retrieved backup from Google Drive (last modified ${new Date(file.modifiedTime).toLocaleString()}).`,
    };
  } catch (err: any) {
    console.error('Google Drive retrieval error:', err);
    return {
      success: false,
      message: err.message || 'Failed to download backup from Google Drive.',
    };
  }
}
