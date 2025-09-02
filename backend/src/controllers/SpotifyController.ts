import { Request, Response } from 'express';
import { SpotifyService } from '../services/SpotifyService';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class SpotifyController {
  private spotifyService: SpotifyService;
  private logger: Logger;

  constructor(spotifyService: SpotifyService, logger: Logger) {
    this.spotifyService = spotifyService;
    this.logger = logger;
  }

  // GET /api/spotify/auth
  getAuthUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const state = uuidv4();
      const authUrl = this.spotifyService.getAuthorizationUrl(state);
      
      // Store state in Spotify service for verification
      this.spotifyService.storeState(state);
      
      res.json({
        authUrl,
        state
      });
    } catch (error) {
      this.logger.error('Error generating Spotify auth URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate authorization URL' 
      });
    }
  };

  // GET /api/spotify/callback
  handleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        this.logger.error('Spotify authorization error:', error);
        res.status(400).json({ 
          error: 'Authorization denied',
          details: error 
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({ 
          error: 'Missing code or state parameter' 
        });
        return;
      }

      // Verify state to prevent CSRF attacks
      if (!this.spotifyService.verifyState(state as string)) {
        this.logger.warn('State mismatch in Spotify callback');
        res.status(400).json({ 
          error: 'Invalid state parameter' 
        });
        return;
      }

      const tokenData = await this.spotifyService.handleCallback(
        code as string, 
        state as string
      );

      // Remove state from storage
      this.spotifyService.removeState(state as string);

      res.json({
        success: true,
        token: tokenData.access_token,
        expiresIn: tokenData.expires_in
      });
    } catch (error) {
      this.logger.error('Error in Spotify callback:', error);
      res.status(500).json({ 
        error: 'Failed to process authorization callback' 
      });
    }
  };

  // POST /api/spotify/refresh
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ 
          error: 'Refresh token is required' 
        });
        return;
      }

      const tokenData = await this.spotifyService.refreshToken(refreshToken);

      res.json({
        success: true,
        token: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        refreshToken: tokenData.refresh_token
      });
    } catch (error) {
      this.logger.error('Error refreshing Spotify token:', error);
      res.status(500).json({ 
        error: 'Failed to refresh token' 
      });
    }
  };

  // GET /api/spotify/playback
  getPlaybackState = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: 'Authorization token required' 
        });
        return;
      }

      const accessToken = authHeader.substring(7);
      const playbackState = await this.spotifyService.getCurrentPlayback(accessToken);

      if (!playbackState) {
        res.json({ 
          isPlaying: false,
          playbackState: null 
        });
        return;
      }

      res.json({
        isPlaying: playbackState.is_playing,
        playbackState
      });
    } catch (error) {
      this.logger.error('Error getting Spotify playback state:', error);
      res.status(500).json({ 
        error: 'Failed to get playback state' 
      });
    }
  };

  // GET /api/spotify/profile
  getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: 'Authorization token required' 
        });
        return;
      }

      const accessToken = authHeader.substring(7);
      const profile = await this.spotifyService.getUserProfile(accessToken);

      res.json({
        success: true,
        profile
      });
    } catch (error) {
      this.logger.error('Error getting Spotify user profile:', error);
      res.status(500).json({ 
        error: 'Failed to get user profile' 
      });
    }
  };

  // PUT /api/spotify/transfer
  transferPlayback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId, play } = req.body;
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: 'Authorization token required' 
        });
        return;
      }

      if (!deviceId) {
        res.status(400).json({ 
          error: 'Device ID is required' 
        });
        return;
      }

      const accessToken = authHeader.substring(7);
      await this.spotifyService.transferPlayback(accessToken, deviceId, play);

      res.json({
        success: true,
        message: 'Playback transferred successfully'
      });
    } catch (error) {
      this.logger.error('Error transferring Spotify playback:', error);
      res.status(500).json({ 
        error: 'Failed to transfer playback' 
      });
    }
  };

  // POST /api/spotify/control
  controlPlayback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { action } = req.body;
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: 'Authorization token required' 
        });
        return;
      }

      if (!action || !['play', 'pause', 'next', 'previous'].includes(action)) {
        res.status(400).json({ 
          error: 'Valid action is required (play, pause, next, previous)' 
        });
        return;
      }

      const accessToken = authHeader.substring(7);
      await this.spotifyService.controlPlayback(accessToken, action);

      res.json({
        success: true,
        message: `Playback ${action} executed successfully`
      });
    } catch (error) {
      this.logger.error(`Error controlling Spotify playback (${req.body.action}):`, error);
      res.status(500).json({ 
        error: `Failed to ${req.body.action} playback` 
      });
    }
  };
}