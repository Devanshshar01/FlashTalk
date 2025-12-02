
# ⚡ FlashTalk

> **The Zero-Latency, Voice-First AI Assistant.**  
> *Powered by Google Gemini Live API & React 19.*

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-v19-cyan)
![Gemini](https://img.shields.io/badge/Powered%20by-Gemini-8E75B2)

**FlashTalk** is a next-generation voice assistant designed to eliminate the robotic "pause-and-think" delay found in traditional AI. By leveraging the **Gemini Live API** with bidirectional WebSocket streaming, FlashTalk processes audio in real-time, allowing for fluid, interruptible, and human-like conversations.

---

## 🌟 Key Features

### 🎙️ Immersive Voice Experience
*   **Zero-Latency Response**: Uses raw PCM audio streaming for instant feedback.
*   **Real-time Visualizer**: A futuristic "Orb" interface that reacts dynamically to audio frequencies and volume.
*   **Live Transcription**: See the conversation unfold in real-time with auto-scrolling captions.
*   **Interruptible**: Speak over the AI to change topics instantly, just like a real conversation.
*   **Voice Personalization**: Choose from 5 distinct voices (Puck, Charon, Kore, Fenrir, Zephyr) to match your preference.

### 🎭 Adaptive Personas
Switch between specialized modes tailored to your needs:
*   **⚡ Velocity Assistant**: A general-purpose, ultra-fast helper for hands-free tasks.
*   **🎓 Language Tutor**: A strict pronunciation coach that provides instant feedback on your speaking.
*   **💼 Hard Negotiator**: A high-pressure business simulator to practice deal-making.

### 🛠️ Smart Tools Suite
Beyond voice, FlashTalk includes a powerful suite of multimodal tools:

| Tool | Icon | Description | Model |
| :--- | :---: | :--- | :--- |
| **Chat** | 💬 | Intelligent chatbot for complex conversations. | `gemini-3-pro-preview` |
| **Planner** | 📅 | Generates interactive, Notion-style study tables with editable cells and checkboxes. | `gemini-2.5-flash` |
| **Vision** | 👁️ | Analyze uploaded images and ask questions about them. | `gemini-3-pro-preview` |
| **Thinking** | 🧠 | Deep reasoning for complex math and logic puzzles. | `gemini-3-pro-preview` |
| **Search** | 🌍 | Real-time web results grounded in Google Search. | `gemini-2.5-flash` |
| **Maps** | 📍 | Location-aware queries (restaurants, places) grounded in Google Maps. | `gemini-2.5-flash` |
| **Flash** | ⚡ | Instant text answers for everyday queries. | `gemini-flash-lite` |

---

## 🎨 UI & UX Design

*   **Glassmorphism**: A sleek, dark-themed UI with translucent layers, blur effects, and neon accents.
*   **Interactive History**: Sidebar history saves your chats, tables, and images to `localStorage`.
*   **Responsive**: Fully optimized for desktop and mobile touch interfaces.
*   **Animations**: Smooth transitions, pulsing microphones, and organic particle effects.

---

## 🏗️ Technical Architecture

FlashTalk operates entirely client-side using modern Web APIs:

1.  **Audio Pipeline**: 
    *   **Input**: `MediaStream` -> `AudioContext` -> `ScriptProcessor` (PCM Conversion) -> WebSocket.
    *   **Output**: WebSocket -> Base64 Decode -> `AudioBuffer` -> `AudioContext` destination.
2.  **State Management**: React Hooks (`useLiveGemini`, `useState`) manage the complex connection lifecycle.
3.  **Grounding**: Integrates Google Search and Maps tools via the GenAI SDK.

### Tech Stack
*   **Frontend Library**: [React 19](https://react.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **AI SDK**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`@google/genai`)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Build Tooling**: Vite (Recommended for local dev)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A Google Cloud Project with the **Gemini API** enabled.
*   A paid/billing-enabled API key (required for Gemini Live & Pro models).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Devanshshar01/FlashTalk.git
    cd FlashTalk
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```bash
    VITE_API_KEY=your_actual_api_key_here
    ```
    *(Note: Ensure your code references `import.meta.env.VITE_API_KEY` or `process.env.API_KEY` depending on your bundler configuration).*

4.  **Run the App**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Navigate to `http://localhost:5173` (or the port shown in your terminal).

---

## 📝 Usage Guide

### Using the Live Assistant
1.  Click the large **Microphone** button at the bottom.
2.  Allow microphone permissions when prompted.
3.  Start speaking! The Orb will pulse when it hears you.
4.  Tap the **Settings** (gear icon) to change the persona (e.g., to "Language Tutor") or select a **Voice**.

### Using Smart Tools
1.  Click the **Keyboard** icon (bottom left) to switch to Tools mode.
2.  Select a tool from the top pill menu (e.g., **Plan**).
3.  Type a request like *"Create a study plan for Biology finals"* and hit enter.
4.  Interact with the generated table (edit cells, check boxes, add rows).
5.  Click the **History** (clock icon) to view past queries.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by Devansh Sharma and Yamiy Dalal
</p>
