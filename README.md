# DIRIGERA Moodz - TRADFRI Music Sync

A web application that synchronizes IKEA TRADFRI smart lights with Spotify music playback in real-time. The lights change color and pulsate based on the music's rhythm, frequency characteristics, and energy levels.

## Features

- **Real-time Music Analysis**: Uses Web Audio API to analyze music frequency bands and detect beats
- **Smart Light Sync**: TRADFRI lights respond to bass, mids, and treble with different colors and effects
- **Spotify Integration**: Full integration with Spotify Web Playback SDK for premium users
- **WebSocket Communication**: Low-latency communication between frontend audio analysis and backend light control
- **DIRIGERA Hub Support**: Works with IKEA's DIRIGERA hub using reverse-engineered REST API
- **Advanced Effects**: Beat detection, song section recognition, and customizable sync settings
- **Visual Feedback**: Real-time audio visualization and light status monitoring

## Prerequisites

- **Spotify Premium Account**: Required for Spotify Web Playback SDK
- **IKEA DIRIGERA Hub**: Connected to your network with TRADFRI lights
- **Node.js**: Version 20.x or higher
- **Network Access**: All devices must be on the same local network

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd tradfri-music-sync

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

### 2. Configure Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app with these settings:
   - **Redirect URIs**: `http://localhost:3000/callback`
   - **Which API/SDKs are you planning to use**: Web Playback SDK
3. Note your Client ID and Client Secret

### 3. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration:
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# DIRIGERA configuration (leave empty for first-time setup)
DIRIGERA_ACCESS_TOKEN=
DIRIGERA_GATEWAY_IP=auto

# Server configuration (defaults usually work)
PORT=3001
WS_PORT=8080
```

### 4. First-Time DIRIGERA Setup

```bash
# Start the backend server
cd backend
npm run dev
```

**Important**: On first run without a DIRIGERA access token, the server will prompt you to press the action button on your DIRIGERA hub. You have 60 seconds to press it. The server will then display your access token - copy it to your `.env` file for future use.

### 5. Start the Application

```bash
# In one terminal - start backend
cd backend
npm run dev

# In another terminal - start frontend  
cd frontend
npm run dev
```

Visit `http://localhost:3000` to use the application.

## Usage

### Initial Setup

1. **Connect to Spotify**: Click "Connect with Spotify" and authorize the application
2. **Device Discovery**: The app will automatically discover TRADFRI lights on your network
3. **Start Music**: Play music on Spotify - the Web Playback SDK will transfer playback to the app
4. **Enjoy the Show**: Your lights will now sync with the music!

### Settings and Customization

Access settings by clicking the gear icon. You can adjust:

- **Sensitivity**: How responsive lights are to music changes
- **Color Mode**: Choose between frequency mapping, mood-based colors, or random colors
- **Effect Intensity**: Control the intensity of flashes and color changes
- **Smoothing**: Adjust transition smoothness between colors
- **Beat Detection Threshold**: Fine-tune beat detection sensitivity
- **Transition Speed**: Control how fast colors change

### Quick Presets

- **Party Mode**: High intensity with fast transitions
- **Ambient**: Subtle, smooth lighting changes
- **Balanced**: Default settings for most music types

## Architecture

The application consists of several key components:

### Backend (Node.js/TypeScript)
- **DIRIGERA Service**: Communicates with IKEA hub using REST API
- **Spotify Service**: Handles OAuth and playback state
- **Sync Engine**: Processes audio data and coordinates light changes
- **WebSocket Server**: Real-time communication with frontend
- **Rate Limiting**: Prevents overwhelming the DIRIGERA hub

### Frontend (React/TypeScript)
- **Audio Analyzer**: Web Audio API for real-time frequency analysis
- **Beat Detector**: Algorithm for detecting musical beats
- **Spotify Player**: Web Playback SDK integration
- **Visualization**: Real-time audio visualization
- **WebSocket Client**: Sends audio data to backend

### Key Technologies
- **Web Audio API**: Real-time audio processing
- **WebSocket**: Low-latency bi-directional communication
- **Meyda**: Advanced audio feature extraction
- **Spotify Web Playback SDK**: Music playback control
- **React**: Modern UI framework
- **Tailwind CSS**: Utility-first CSS framework

## API Endpoints

### Spotify Routes
- `GET /api/spotify/auth` - Get authorization URL
- `GET /api/spotify/callback` - Handle OAuth callback
- `POST /api/spotify/refresh` - Refresh access token
- `GET /api/spotify/playback` - Get current playback state
- `PUT /api/spotify/transfer` - Transfer playback to device
- `POST /api/spotify/control` - Control playback (play/pause/skip)

### Light Control Routes
- `GET /api/lights/status` - Get connection and device status
- `GET /api/lights/discover` - Discover TRADFRI devices
- `POST /api/lights/update` - Update light colors/brightness
- `POST /api/lights/command` - Execute light command (pulse, strobe)
- `GET /api/lights/sync/settings` - Get sync settings
- `PUT /api/lights/sync/settings` - Update sync settings
- `POST /api/lights/test` - Run light tests (rainbow, pulse, strobe)

### WebSocket Events
- `BEAT_DETECTED` - Beat detection data from frontend
- `FREQUENCY_UPDATE` - Audio frequency analysis data
- `SONG_SECTION` - Detected song section changes
- `PLAYBACK_STATE` - Current Spotify playback information
- `SETTINGS_UPDATE` - Sync settings changes

## Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev
```

### Production with Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

The application will be available at `http://localhost:3000`.

### Environment Variables for Production
```bash
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

**"DIRIGERA Hub Not Connected"**
- Ensure hub is powered on and connected to the same network
- Check that DIRIGERA_ACCESS_TOKEN is set in .env
- Try rediscovering devices from the UI

**"Spotify Authentication Failed"**
- Verify Client ID and Client Secret in .env
- Check redirect URI matches Spotify app configuration
- Ensure you have Spotify Premium

**"No Audio Analysis"**
- Check browser permissions for microphone access
- Ensure music is playing through the Spotify Web Player
- Try refreshing the page

**"WebSocket Connection Failed"**
- Check that backend server is running on correct port
- Verify WS_PORT in environment configuration
- Check firewall settings

### Performance Tips

- Close other audio applications to avoid conflicts
- Use Chrome or Firefox for best Web Audio API support
- Ensure stable network connection between all devices
- Limit number of connected lights for better performance

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

This will show detailed information about:
- Audio analysis data
- Beat detection results
- Light update commands
- WebSocket messages
- API requests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- IKEA for creating the TRADFRI ecosystem
- Spotify for their comprehensive Web APIs
- The reverse engineering community for DIRIGERA protocol documentation
- Contributors to open-source audio analysis libraries

## Disclaimer

This project uses reverse-engineered APIs for DIRIGERA hub communication. While it works reliably, it's not officially supported by IKEA. Use at your own risk and ensure you have backups of your light configurations.

The project is not affiliated with IKEA or Spotify.