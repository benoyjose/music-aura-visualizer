let googleModule = null;
function getGoogle() {
  if (!googleModule) {
    try {
      const g = require('googleapis');
      googleModule = g.google || g;
    } catch (e) {
      console.warn('[YouTube Uploader] Error resolving googleapis:', e.message);
      return null;
    }
  }
  return googleModule;
}

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class YouTubeUploader {
  constructor(mainWindow, userDataPath) {
    this.mainWindow = mainWindow;
    this.userDataPath = userDataPath;
    this.tokensPath = path.join(userDataPath, 'youtube_tokens.json');
    this.configPath = path.join(userDataPath, 'youtube_credentials.json');

    this.oauth2Client = null;
    this.authServer = null;
    this.currentUploadAbort = null;
    this.isUploading = false;

    this.initOAuthClient();
  }

  // Load or initialize OAuth2 Client
  initOAuthClient() {
    const google = getGoogle();
    if (!google) {
      return;
    }

    let clientId = '';
    let clientSecret = '';

    if (fs.existsSync(this.configPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        if (creds.clientId) clientId = creds.clientId.trim();
        if (creds.clientSecret) clientSecret = creds.clientSecret.trim();
      } catch (e) {
        console.error('Error reading YouTube credentials:', e);
      }
    }

    if (!clientId || !clientSecret) {
      this.oauth2Client = null;
      return;
    }

    // Default redirect URI for local loopback (Desktop app RFC 8252)
    const redirectUri = 'http://127.0.0.1:8912';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Load saved tokens if available
    if (fs.existsSync(this.tokensPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(this.tokensPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
      } catch (e) {
        console.error('Error loading saved tokens:', e);
      }
    }

    // Auto-save refreshed tokens
    this.oauth2Client.on('tokens', (tokens) => {
      this.saveTokens(tokens);
    });
  }

  saveCredentials(clientId, clientSecret) {
    const creds = { clientId: (clientId || '').trim(), clientSecret: (clientSecret || '').trim() };
    fs.writeFileSync(this.configPath, JSON.stringify(creds, null, 2), 'utf8');
    this.initOAuthClient();
    return { success: true };
  }

  getSavedCredentials() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (e) {
        return { clientId: '', clientSecret: '' };
      }
    }
    return { clientId: '', clientSecret: '' };
  }

  saveTokens(tokens) {
    let existing = {};
    if (fs.existsSync(this.tokensPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(this.tokensPath, 'utf8'));
      } catch (e) {}
    }
    const merged = { ...existing, ...tokens };
    fs.writeFileSync(this.tokensPath, JSON.stringify(merged, null, 2), 'utf8');
  }

  async getChannelProfile() {
    if (!this.oauth2Client || !this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
      return { connected: false };
    }

    try {
      const google = getGoogle();
      if (!google) throw new Error('Google APIs module not found.');
      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
      const res = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true
      });

      if (res.data.items && res.data.items.length > 0) {
        const channel = res.data.items[0];
        return {
          connected: true,
          channelId: channel.id,
          title: channel.snippet.title,
          customUrl: channel.snippet.customUrl || '',
          avatarUrl: channel.snippet.thumbnails.default.url,
          subscriberCount: channel.statistics.subscriberCount
        };
      }
      return { connected: true, title: 'YouTube Channel' };
    } catch (err) {
      console.error('Error getting channel profile:', err.message);
      return { connected: false, error: err.message };
    }
  }

  startAuthFlow() {
    return new Promise((resolve, reject) => {
      const creds = this.getSavedCredentials();
      if (!creds.clientId || !creds.clientSecret) {
        return reject(new Error('Please configure your Google Cloud Client ID & Client Secret first.'));
      }

      this.initOAuthClient();

      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly'
      ];

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      // Stop any existing loopback server
      if (this.authServer) {
        try { this.authServer.close(); } catch (e) {}
      }

      // Start local loopback HTTP server to receive OAuth code
      this.authServer = http.createServer(async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url, true);
          const code = parsedUrl.query ? parsedUrl.query.code : null;
          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; background: #0c0e14; color: #fff; text-align: center; padding: 50px;">
                  <h1 style="color: #00ff88; font-size: 26px; margin-bottom: 12px;">✅ Authorization Successful!</h1>
                  <p style="color: #ccc; font-size: 16px; margin-bottom: 8px;">You have successfully connected Spectrometer Studio with your YouTube channel.</p>
                  <p style="color: #888; font-size: 14px;">You can now close this browser tab and return to the application.</p>
                </body>
              </html>
            `);

            try {
              this.authServer.close();
            } catch (e) {}
            this.authServer = null;

            // Exchange code for tokens
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            this.saveTokens(tokens);

            const profile = await this.getChannelProfile();
            resolve(profile);
          } else if (parsedUrl.query && parsedUrl.query.error) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Authorization declined or error: ' + parsedUrl.query.error);
            reject(new Error('OAuth error: ' + parsedUrl.query.error));
          }
        } catch (err) {
          reject(err);
        }
      });

      this.authServer.listen(8912, '127.0.0.1', () => {
        shell.openExternal(authUrl);
      });

      this.authServer.on('error', (err) => {
        reject(err);
      });
    });
  }

  disconnect() {
    if (fs.existsSync(this.tokensPath)) {
      try {
        fs.unlinkSync(this.tokensPath);
      } catch (e) {}
    }
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({});
    }
    return { success: true };
  }

  /**
   * Resumable YouTube Video Upload
   * Uploads large 4K / 8K video files in chunks with progress reporting
   */
  async uploadVideo(options) {
    if (this.isUploading) {
      throw new Error('An upload is already in progress.');
    }

    const {
      filePath,
      title,
      description = '',
      tags = [],
      privacyStatus = 'public', // 'public', 'unlisted', 'private'
      categoryId = '10', // 10 = Music
      madeForKids = false
    } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    this.isUploading = true;
    this.currentUploadAbort = new AbortController();

    const google = getGoogle();
    if (!google) throw new Error('Google APIs module not found.');
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    const startTime = Date.now();
    let uploadedBytes = 0;

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = (uploadedBytes / fileSize) * 100;
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speedBps = uploadedBytes / Math.max(0.1, elapsedSec);
      const remainingBytes = Math.max(0, fileSize - uploadedBytes);
      const etaSec = remainingBytes / Math.max(1, speedBps);

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('youtube:upload-progress', {
          progress: Math.min(100, progress),
          uploadedBytes,
          totalBytes: fileSize,
          speedMBps: (speedBps / (1024 * 1024)).toFixed(2),
          elapsedSec,
          etaSec
        });
      }
    });

    try {
      const res = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: title.slice(0, 100),
              description: description.slice(0, 5000),
              tags: Array.isArray(tags) ? tags.slice(0, 50) : tags.split(',').map(t => t.trim()),
              categoryId
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: Boolean(madeForKids)
            }
          },
          media: {
            body: fileStream
          }
        },
        {
          signal: this.currentUploadAbort.signal
        }
      );

      this.isUploading = false;
      this.currentUploadAbort = null;

      const videoId = res.data.id;
      const videoUrl = `https://youtu.be/${videoId}`;
      const studioUrl = `https://studio.youtube.com/video/${videoId}/edit`;

      return {
        success: true,
        videoId,
        videoUrl,
        studioUrl,
        title: res.data.snippet.title,
        status: res.data.status.privacyStatus
      };

    } catch (err) {
      this.isUploading = false;
      this.currentUploadAbort = null;
      console.error('YouTube upload error:', err);
      throw err;
    }
  }

  cancelUpload() {
    if (this.currentUploadAbort) {
      try {
        this.currentUploadAbort.abort();
      } catch (e) {}
      this.currentUploadAbort = null;
    }
    this.isUploading = false;
    return { success: true, canceled: true };
  }
}

module.exports = YouTubeUploader;
