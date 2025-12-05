# Dirigera Moodz

A real-time light synchronization app for IKEA Dirigera Hub. 
This application captures audio from your browser (tab audio or microphone) and synchronizes your IKEA smart lights to the music in real-time.

## Features

*   **Real-time Audio Visualization**: Uses Web Audio API to analyze frequency bands (Bass, Mids, Treble).
*   **IKEA Dirigera Integration**: Direct local control of your smart lights for minimal latency.
*   **Customizable Effects**: Adjust sensitivity, color modes, and intensity.
*   **Dynamic Mood Scenes**: Choose from a variety of preset scenes like "Savanna Sunset", "Arctic Aurora", "Bangkok Morning", "Sukhumvit Nights", and more, to instantly set the ambiance with themed light effects and gradients.
*   **2D Room Layout Editor**: Visually position your lights on an interactive canvas, add virtual walls to define your room layout, toggle light labels, and control light participation in scenes directly from the map.
*   **Spatial Dynamic Scenes**: Leverage the 2D room layout to create advanced lighting effects. Experience linear waves (e.g., "Deep Ocean"), radial pulses, or gradients (e.g., "Savanna Sunset") that travel across your physical lights based on their mapped positions.
*   **Real-time Scene Visualizer**: A dynamic canvas that animates your light positions and colors in real-time. Automatically appears as a full-screen modal when a scene is playing, providing an immersive overview of your lighting effects.
*   **Multi-Client Sync & Remote Access**: Connect multiple devices (e.g., PC, iPad, phone) to the dev server simultaneously. All clients remain synchronized, displaying live updates. Supports remote connections from devices on the same network.
*   **Browser-based Audio Capture**: Works with any audio source (Spotify, YouTube, Apple Music, etc.) played in your browser.

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4, Shadcn UI, Lucide Icons
*   **Backend**: Node.js, Express (Custom Server)
*   **Real-time Communication**: WebSocket (`ws`)
*   **Audio Analysis**: Meyda
*   **State Management**: Zustand
*   **Hardware Integration**: `dirigera` library

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

3.  **(Optional) Configuration**:
    Create a `.env` file in the root directory if you wish to pre-configure the connection (the app also supports UI-based pairing).
    ```env
    # Optional: Pre-configured Hub Access
    DIRIGERA_ACCESS_TOKEN=your_token_here
    DIRIGERA_GATEWAY_IP=your_gateway_ip_here
    
    # Server Configuration
    PORT=3000
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser. For remote access from other devices on your local network, use `http://<YOUR_PC_IP>:3000`.

## Usage

### 1. Connect your Hub

1.  Click the **Settings** (gear icon) in the top right corner.
2.  In the "Hub Connection" section, click **Connect Hub**.
3.  Press the physical **Action Button** on your Dirigera Hub when prompted.
4.  Once connected, the app will save your access token locally for future sessions.

### 2. Manage Lights & Layout

1.  Click the **Layout Grid icon** in the top right corner to access the **Light Management** page.
2.  In the **"Room Layout"** tab, drag your lights to their physical positions on the canvas.
3.  Use "Add Wall" to define room boundaries.
4.  Click the red/green dot on a light to toggle its participation in scenes.
5.  Use the "Show Labels" toggle to display/hide light names.
6.  Click **"Save Layout"** to persist your room configuration.

### 3. Start Audio Sync

1.  Click **"Start Audio Sync"**.
2.  Select **"Tab Audio"** (recommended) or "Microphone" in the browser permission dialog.
    *   *Note: For best results, use "Tab Audio" and select the tab playing your music (e.g., Spotify Web Player).*
3.  Your lights should now react to the music!

### 4. Customize

Use the **Settings** menu to tweak:
*   **Sensitivity**: How reactive the lights are.
*   **Color Mode**: Choose between Frequency mapping, Mood-based, or Random.
*   **Intensity**: Brightness of effects.

### Switching Between Audio Sync and Scenes

The application allows you to switch between Audio Sync mode and Dynamic Scenes mode.

1.  On the main screen, locate the **Mode Switcher** (tabs) at the top.
2.  Click on the **"Scenes"** tab to browse available mood scenes.
3.  Click on any scene card (e.g., "Bangkok Morning", "L.A. Sunset") to activate it. The lights connected to your Dirigera Hub will transition to the selected scene's colors and effects.
4.  To stop a scene, click the "Stop Scene" button at the top of the Scenes section.
5.  To view the real-time visualization of the scene, either click the **"Visualizer"** button next to "Stop Scene", or click on the **active scene card** again. The visualizer will also open automatically when a new scene is started.
6.  To return to Audio Sync, click the **"Audio Sync"** tab.

## Architecture

This app uses a **Custom Next.js Server** architecture to seamlessly integrate the backend control logic with the frontend UI.

*   **`server.ts`**: The entry point. It initializes an Express application that handles both API routes (`/api/*`) and the Next.js request handler for page rendering.
*   **`src/app`**: Next.js App Router pages and layouts (Frontend).
*   **`src/components`**: React UI components (built with Shadcn UI and Tailwind).
*   **`src/server`**: Backend services and controllers.
    *   **`DirigeraService`**: Manages communication with the IKEA Hub.
    *   **`SceneEngine`**: Handles the logic for dynamic scenes (drifting colors, transitions), now enhanced with spatial awareness.
    *   **`SyncEngine`**: processes audio data and syncs lights in real-time.
    *   **`LayoutService`**: Manages the persistence of light position and room layout data.
*   **`src/lib`**: Client-side utilities and state management (Zustand).
*   **Communication**: A WebSocket connection is established between the client (for audio data transmission) and the server (for light control commands) to ensure low latency.

## License

[MIT](LICENSE)

