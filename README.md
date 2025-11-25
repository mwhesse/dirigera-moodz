# Dirigera Moodz

A real-time light synchronization app for IKEA Dirigera Hub. 
This application captures audio from your browser (tab audio or microphone) and synchronizes your IKEA smart lights to the music in real-time.

## Features

*   **Real-time Audio Visualization**: Uses Web Audio API to analyze frequency bands (Bass, Mids, Treble).
*   **IKEA Dirigera Integration**: Direct local control of your smart lights for minimal latency.
*   **Customizable Effects**: Adjust sensitivity, color modes, and intensity.
*   **Browser-based Audio Capture**: Works with any audio source (Spotify, YouTube, Apple Music, etc.) played in your browser.

## Getting Started

### Prerequisites

*   Node.js 18+
*   IKEA Dirigera Hub
*   IKEA Smart Lights (Color or Dimmable) connected to the hub

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd dirigera-moodz
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Connect your Hub

1.  Click the **Settings** (gear icon) in the top right corner.
2.  In the "Hub Connection" section, click **Connect Hub**.
3.  Press the physical **Action Button** on your Dirigera Hub when prompted.
4.  Once connected, the app will save your access token locally for future sessions.

### 2. Start Audio Sync

1.  Click **"Start Audio Sync"**.
2.  Select **"Tab Audio"** (recommended) or "Microphone" in the browser permission dialog.
    *   *Note: For best results, use "Tab Audio" and select the tab playing your music (e.g., Spotify Web Player).*
3.  Your lights should now react to the music!

### 3. Customize

Use the **Light Controller** sidebar to select which lights to sync.
Use the **Settings** menu to tweak:
*   **Sensitivity**: How reactive the lights are.
*   **Color Mode**: Choose between Frequency mapping, Mood-based, or Random.
*   **Intensity**: Brightness of effects.

## Architecture

This app uses a hybrid architecture:
*   **Frontend (Next.js/React)**: Handles audio capture (via `Meyda`), visualization, and user interface.
*   **Backend (Node.js/Express)**: Acts as a bridge to the Dirigera Hub to avoid CORS issues and manage persistent connections.
*   **Communication**: WebSocket connection between frontend and backend for low-latency light commands.

## License

[MIT](LICENSE)