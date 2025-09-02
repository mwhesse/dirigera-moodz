# Changelog

All notable changes to Dirigera Moodz will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Background tab support for continuous audio analysis and light sync
- Tab visibility status indicator in AudioOnlyPlayer UI
- Light selection component for manual control of which lights participate in patterns
- Support for pattern-based lighting instead of all lights showing same color
- Enhanced device capability detection for better brightness/color support identification
- Rate limiting improvements for more responsive light updates (3s color, 0.8s beats)
- Visual feedback for tab background operation with pulsing indicators

### Changed
- Audio analysis now uses `setInterval` instead of `requestAnimationFrame` for background operation
- Rate limiting intervals reduced from 5 minutes to 3 seconds for color updates
- Beat detection rate limit reduced from 4 minutes to 0.8 seconds
- README updated to emphasize Spotify as optional, microphone mode highlighted
- Device state refresh implemented to get current ON/OFF status from DIRIGERA API
- Treble frequency detection amplified by 1.8x for better responsiveness

### Fixed
- Audio events no longer stop when browser tab becomes inactive
- Device capability detection now properly identifies brightness/color support
- Stale device cache issue causing incorrect ON/OFF status reporting
- Color saturation issues that were causing white/washed out colors
- Rate limiting race conditions that allowed thousands of events per second

### Technical Improvements
- Implemented proper pattern system with alternating, trio, wave, and quadrant patterns
- Added `updateSingleLight()` method for individual device control
- Enhanced audio frequency band analysis with better treble detection
- Improved WebSocket connection handling for background operation
- Added comprehensive status indicators for sync, microphone, and tab visibility

## [Previous Versions]

### Initial Release
- Basic DIRIGERA hub integration
- Spotify Web Playbook SDK support
- Real-time audio analysis with Web Audio API
- WebSocket communication between frontend and backend
- Beat detection and frequency analysis
- Basic light color and brightness synchronization