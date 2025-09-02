import { SpotifyConfig, TokenData, PlaybackState } from '../types';
import { Logger } from 'winston';

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenStore: Map<string, TokenData> = new Map();
  private stateStore: Map<string, number> = new Map(); // state -> timestamp
  private logger: Logger;

  constructor(config: SpotifyConfig, logger: Logger) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.logger = logger;

    // Clean up expired states every 10 minutes
    setInterval(() => {
      this.cleanupExpiredStates();
    }, 10 * 60 * 1000);
  }

  // Generate authorization URL for frontend
  getAuthorizationUrl(state: string): string {
    const scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming',
      'user-read-email',
      'user-read-private'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: state,
      scope: scopes,
      show_dialog: 'true'
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params}`;
    this.logger.info('Generated Spotify authorization URL');
    return authUrl;
  }

  // Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<TokenData> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Spotify token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      // Store token with expiration
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      const storedToken: TokenData = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt
      };
      
      this.tokenStore.set(state, storedToken);
      this.logger.info('Spotify token obtained and stored successfully');
      return storedToken;
    } catch (error) {
      this.logger.error('Error in Spotify callback handling:', error);
      throw error;
    }
  }

  // Refresh token if expired
  async refreshToken(refreshToken: string): Promise<TokenData> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Spotify token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      
      const refreshedToken: TokenData = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
        expires_at: expiresAt
      };

      this.logger.info('Spotify token refreshed successfully');
      return refreshedToken;
    } catch (error) {
      this.logger.error('Error refreshing Spotify token:', error);
      throw error;
    }
  }

  // Get current playback state
  async getCurrentPlayback(accessToken: string): Promise<PlaybackState | null> {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204) {
        // No active playback
        this.logger.debug('No active Spotify playback found');
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Failed to get Spotify playback state:', errorText);
        throw new Error(`Playback state request failed: ${response.status}`);
      }

      const playbackData = await response.json();
      
      const playbackState: PlaybackState = {
        device: {
          id: playbackData.device.id,
          name: playbackData.device.name,
          is_active: playbackData.device.is_active
        },
        track: {
          id: playbackData.item.id,
          name: playbackData.item.name,
          artists: playbackData.item.artists,
          album: {
            name: playbackData.item.album.name
          },
          duration_ms: playbackData.item.duration_ms
        },
        progress_ms: playbackData.progress_ms,
        is_playing: playbackData.is_playing
      };

      return playbackState;
    } catch (error) {
      this.logger.error('Error getting Spotify playback state:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Failed to get Spotify user profile:', errorText);
        throw new Error(`User profile request failed: ${response.status}`);
      }

      const profile = await response.json();
      this.logger.info(`Retrieved profile for user: ${profile.display_name}`);
      return profile;
    } catch (error) {
      this.logger.error('Error getting Spotify user profile:', error);
      throw error;
    }
  }

  // Transfer playback to a specific device
  async transferPlayback(accessToken: string, deviceId: string, play = false): Promise<void> {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: play
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Failed to transfer Spotify playback:', errorText);
        throw new Error(`Playback transfer failed: ${response.status}`);
      }

      this.logger.info(`Playback transferred to device: ${deviceId}`);
    } catch (error) {
      this.logger.error('Error transferring Spotify playback:', error);
      throw error;
    }
  }

  // Control playback (play, pause, skip, etc.)
  async controlPlayback(accessToken: string, action: 'play' | 'pause' | 'next' | 'previous'): Promise<void> {
    try {
      let endpoint: string;
      let method: string;

      switch (action) {
        case 'play':
          endpoint = 'https://api.spotify.com/v1/me/player/play';
          method = 'PUT';
          break;
        case 'pause':
          endpoint = 'https://api.spotify.com/v1/me/player/pause';
          method = 'PUT';
          break;
        case 'next':
          endpoint = 'https://api.spotify.com/v1/me/player/next';
          method = 'POST';
          break;
        case 'previous':
          endpoint = 'https://api.spotify.com/v1/me/player/previous';
          method = 'POST';
          break;
        default:
          throw new Error(`Unknown playback action: ${action}`);
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to ${action} Spotify playback:`, errorText);
        throw new Error(`Playback ${action} failed: ${response.status}`);
      }

      this.logger.info(`Spotify playback action: ${action}`);
    } catch (error) {
      this.logger.error(`Error controlling Spotify playback (${action}):`, error);
      throw error;
    }
  }

  // Get stored token by state
  getStoredToken(state: string): TokenData | undefined {
    return this.tokenStore.get(state);
  }

  // Check if token is expired
  isTokenExpired(token: TokenData): boolean {
    return Date.now() >= token.expires_at;
  }

  // Validate token and refresh if necessary
  async validateAndRefreshToken(token: TokenData): Promise<TokenData> {
    if (this.isTokenExpired(token)) {
      if (token.refresh_token) {
        this.logger.info('Token expired, refreshing...');
        return await this.refreshToken(token.refresh_token);
      } else {
        throw new Error('Token expired and no refresh token available');
      }
    }
    return token;
  }

  // Clean up expired tokens from memory
  cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [state, token] of this.tokenStore.entries()) {
      if (now >= token.expires_at) {
        this.tokenStore.delete(state);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  // Store state for OAuth verification
  storeState(state: string): void {
    this.stateStore.set(state, Date.now());
    this.logger.debug(`Stored OAuth state: ${state}`);
  }

  // Verify state parameter
  verifyState(state: string): boolean {
    const timestamp = this.stateStore.get(state);
    if (!timestamp) {
      this.logger.warn(`Invalid state parameter: ${state}`);
      return false;
    }

    // Check if state is expired (10 minutes)
    const now = Date.now();
    const stateAge = now - timestamp;
    const maxAge = 10 * 60 * 1000; // 10 minutes

    if (stateAge > maxAge) {
      this.logger.warn(`Expired state parameter: ${state}`);
      this.stateStore.delete(state);
      return false;
    }

    this.logger.debug(`Verified OAuth state: ${state}`);
    return true;
  }

  // Remove state after successful verification
  removeState(state: string): void {
    this.stateStore.delete(state);
    this.logger.debug(`Removed OAuth state: ${state}`);
  }

  // Clean up expired states
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    let cleanedCount = 0;

    for (const [state, timestamp] of this.stateStore.entries()) {
      if (now - timestamp > maxAge) {
        this.stateStore.delete(state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired OAuth states`);
    }
  }
}