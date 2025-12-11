# RouteSim - Interactive Network Routing Simulator

**RouteSim** is an advanced educational tool designed to visualize complex network routing algorithms. It combines the power of **D3.js** for dynamic graph rendering with **Google Gemini AI** for procedural network topology generation. The application simulates the behavior of packets traversing a network, demonstrating how routing tables evolve using **Dijkstra’s Algorithm** (Link State) and **Bellman-Ford** (Distance Vector).

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Folder Structure](#folder-structure)
6. [Usage Guide](#usage-guide)
7. [Deployment](#deployment)
8. [Documentation: Web Architecture](#documentation-web-architecture)
9. [Documentation: Computer Networks Concepts](#documentation-computer-networks-concepts)
10. [References](#references)
11. [License](#license)

---

## 🚀 Project Overview

In the field of Computer Networks, understanding how routers make decisions is fundamental. Static diagrams often fail to convey the dynamic nature of convergence, link failures, and packet propagation.

**RouteSim** bridges this gap by providing:
1.  **Visual execution** of algorithms step-by-step.
2.  **Real-time traffic simulation** where packets physically move across the graph based on calculated routes.
3.  **Generative capability**, allowing users to describe a network (e.g., "A hub-and-spoke network with 10 nodes") and have AI build it instantly.
4.  **Performance Benchmarking**, allowing comparison of algorithm execution time and efficiency.

---

## ✨ Key Features

-   **Dual Algorithm Support:** Switch seamlessly between **Dijkstra** (Shortest Path First) and **Bellman-Ford**.
-   **Targeted Pathfinding:**
    -   **Start Node:** Click any node to set it as the source.
    -   **End Node:** **Shift + Click** any node to set it as the destination.
    -   **Visual Path:** The specific shortest path is highlighted in neon purple.
-   **Performance Metrics:**
    -   **Compute Time:** Precise measurement (in ms) of the raw algorithm execution time.
    -   **Operations:** Track the total number of logical steps required for convergence.
-   **AI-Powered Topology:** Integration with Google Gemini (`gemini-2.5-flash`) to generate complex JSON graph structures from natural language prompts.
-   **Interactive Graph:** Drag nodes to rearrange the topology.
-   **Failure Simulation (Edit Mode):**
    -   Disable/Enable Nodes to simulate hardware failure.
    -   Sever Links to simulate cable cuts.
    -   Modify Link Weights dynamically to test cost changes.
-   **Traffic Layer:** Visual data packets traverse the network. Packets are "lost" if links fail mid-transit, or rerouted if the table updates.
-   **Live Routing Table:** A dynamic dashboard showing distances, previous hops, and active algorithm states.

---

## 🛠 Technology Stack

### Frontend
-   **React 19:** Component-based UI architecture.
-   **TypeScript:** Type safety for complex graph data structures.
-   **Tailwind CSS:** Utility-first styling for a modern, dark-mode aesthetic.
-   **Lucide React:** Iconography.

### Visualization & Simulation
-   **D3.js (Data-Driven Documents):** Handles the force-directed graph physics, SVG rendering, and coordinate systems.
-   **HTML5 Canvas / SVG:** Used for high-performance rendering of nodes, links, and packet animations.

### AI & Services
-   **Google GenAI SDK:** Direct integration with the Gemini API for natural language processing.

---

## 📥 Installation & Setup

Follow these steps to get the project running locally.

### Prerequisites
-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   A **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com))

### Step-by-Step Guide

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/routesim.git
    cd routesim
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # OR
    yarn install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory.
    ```env
    # .env
    REACT_APP_API_KEY=your_google_gemini_api_key_here
    # If using Vite: VITE_API_KEY=...
    # If using Webpack (standard):
    API_KEY=your_google_gemini_api_key_here
    ```
    *Note: The application expects `process.env.API_KEY` to be available at runtime or build time.*

4.  **Run the Development Server**
    ```bash
    npm start
    ```

5.  **Access the Application**
    Open your browser and navigate to `http://localhost:3000`.

---

## 📂 Folder Structure

```text
/
├── index.html              # Entry HTML (Tailwind CDN included here)
├── index.tsx               # React Application Entry Point
├── App.tsx                 # Main Controller & State Manager
├── types.ts                # TypeScript Interfaces (Graph, Packet, SimStep)
├── constants.ts            # Initial Graph Data & Config
├── metadata.json           # App Metadata (Permissions)
├── components/
│   ├── NetworkGraph.tsx    # D3.js Visualization Component
│   ├── RoutingTable.tsx    # Data Table Display
│   └── ControlPanel.tsx    # UI Controls (Play/Pause, Inputs)
├── services/
│   └── geminiService.ts    # Google AI API Interaction
└── utils/
    └── algorithms.ts       # Dijkstra & Bellman-Ford Implementations
```

---

## 🎮 Usage Guide

1.  **Simulation Mode (Default):**
    -   **Set Start Node:** Simply Click on any node.
    -   **Set Target Node:** Hold **Shift** and Click on any node.
    -   **Controls:** Use Play/Pause/Next/Prev to watch the algorithm explore the graph step-by-step.
    -   **Metrics:** Check the right sidebar for "Compute Time" to see how fast the algorithm ran.

2.  **Edit Mode:**
    -   Click the **Settings/Edit Graph** button.
    -   **Click a Node:** Toggles it ON/OFF (simulates crash).
    -   **Click a Link Weight:** Opens a prompt to change the cost (weight).
    -   **Click a Link Line:** Toggles it active/inactive.

3.  **Traffic Simulation:**
    -   Click **Send Traffic**.
    -   Cyan packets will spawn and attempt to route from random sources to random destinations using the *current* routing table.
    -   If you break a link while a packet is on it, the packet becomes "Lost".

4.  **AI Generation:**
    -   Click **Generate New Topology**.
    -   Type a prompt (e.g., *"A ring topology with 8 nodes"*).
    -   The system will replace the current graph with the AI-generated one.

---

## 🌐 Deployment

This application is a client-side Single Page Application (SPA). It can be deployed to any static host.

**Build for Production:**
```bash
npm run build
```

**Deploy to Vercel/Netlify:**
1.  Push code to GitHub.
2.  Import project into your hosting provider.
3.  **Crucial:** Add your `API_KEY` in the Environment Variables settings of the host dashboard.

---

# 📘 Documentation: Web Architecture

### 1. Architectural Pattern
RouteSim follows a **Component-Based Architecture** using the React library, adhering to the principles of **Unidirectional Data Flow**.

*   **Model (State):** `App.tsx` holds the "truth" of the application: the Graph Data (`nodes`, `links`), the Algorithm Steps, and the Packet positions.
*   **View (Components):** `NetworkGraph.tsx` and `RoutingTable.tsx` are pure presentation components that render based on the props passed down from the state.
*   **Controller (Logic):** `utils/algorithms.ts` contains the pure logic for pathfinding. `App.tsx` orchestrates the timing loops (`setInterval` for algorithms, `requestAnimationFrame` for traffic).

### 2. Runtime Flow Diagram

```ascii
[User Interaction] 
       |
       v
[ControlPanel Component] --> (Events: Play, Edit, Generate)
       |
       v
[App.tsx (State Container)]
       |-------------------------------------------------------|
       | 1. Algorithm Engine                                   | 2. Physics Engine
       v                                                       v
[utils/algorithms.ts]                                   [Packet Update Loop]
(Calculates Steps: { d: {}, p: {} })                    (requestAnimationFrame)
       |                                                       |
       | Update State                                          | Update Coords
       v                                                       v
[React State Update] -----------------------------------> [NetworkGraph.tsx]
       |                                                 (D3 Force Simulation)
       v                                                 (SVG Rendering)
[RoutingTable.tsx]
```

### 3. Traffic Simulation Layer
The traffic system operates on a separate time loop from the routing algorithm to simulate the difference between Control Plane (Routing Protocols) and Data Plane (Packet Forwarding).

*   **The Packet Object:** Defined in `types.ts`, it contains `source`, `target`, `currentEdge`, and `progress` (0.0 to 1.0).
*   **Forwarding Logic:**
    1.  A packet arrives at a node.
    2.  It queries the **Routing Table** (derived from the Algorithm State).
    3.  It determines the `nextHop`.
    4.  It enters the link connecting `currentNode` to `nextHop`.
    5.  Visual interpolation is handled via D3 coordinates.

### 4. API Integration (Gemini)
The application uses a **Serverless Client-Side** approach.
*   **Flow:** Client -> Google GenAI Endpoint -> Client.
*   **Prompt Engineering:** The prompt in `geminiService.ts` strictly enforces a JSON Schema response (`responseMimeType: "application/json"`) to ensure the returned topology can be parsed by the application without errors.

---

# 📡 Documentation: Computer Networks Concepts

RouteSim is a direct implementation of core Layer 3 (Network Layer) concepts defined in the **OSI Model**.

### 1. OSI Layer 3: The Network Layer
The application visualizes the primary responsibility of the Network Layer: **Path Determination**.
*   **Routers (Nodes):** Devices that make forwarding decisions.
*   **Links:** The physical or logical connections between routers with associated costs (bandwidth/latency/delay).

### 2. Routing Protocols Implemented

#### A. Link State Routing (Dijkstra's Algorithm)
Used in protocols like **OSPF** (Open Shortest Path First) and **IS-IS**.
*   **Concept:** Every node has a complete map of the network (the Graph).
*   **Process:**
    1.  **Flooding:** Link states are shared with all nodes.
    2.  **Calculation:** Each node independently runs Dijkstra to find the Shortest Path Tree (SPT) to every other node.
    3.  **Visualization:** In RouteSim, visited nodes turn Green, and the active frontier turns Yellow. The system calculates the full tree from the `startNode` perspective.

#### B. Distance Vector Routing (Bellman-Ford Algorithm)
Used in protocols like **RIP** (Routing Information Protocol).
*   **Concept:** Nodes only know about their immediate neighbors and what their neighbors tell them.
*   **Process:**
    1.  **Exchange:** Nodes send their distance vectors to neighbors.
    2.  **Relaxation:** If a neighbor offers a shorter path to a destination, the node updates its table.
    3.  **Visualization:** The simulation shows the iterative "relaxation" of edges (Loop `|V|-1` times). You can observe the "counting to infinity" problem if a link weight is set to a high value during convergence.

### 3. Convergence & Failure Handling
*   **Convergence:** The state where all routers agree on optimal paths. In the app, this is when the Step Index reaches the end.
*   **Route Flapping:** Simulated in "Edit Mode" by toggling a link on and off repeatedly while packets are moving.
*   **Packet Loss:** In the simulation, if a link is disabled (`active: false`) while a packet is `progress: 0.5` (halfway), the packet status changes to `lost`. This mimics physical layer failure where electrical signals are interrupted.

---

# 📚 References

1.  **Dijkstra's Algorithm:** E. W. Dijkstra, "A note on two problems in connexion with graphs," *Numerische Mathematik*, vol. 1, no. 1, pp. 269–271, Dec. 1959.
2.  **Bellman-Ford:** R. Bellman, "On a routing problem," *Quarterly of Applied Mathematics*, vol. 16, no. 1, pp. 87–90, 1958.
3.  **OSPF Protocol:** J. Moy, "OSPF Version 2," RFC 2328, IETF, Apr. 1998.
4.  **D3.js Visualization:** M. Bostock, V. Ogievetsky, and J. Heer, "D³ Data-Driven Documents," *IEEE Transactions on Visualization and Computer Graphics*, vol. 17, no. 12, pp. 2301–2309, Dec. 2011.
5.  **React Architecture:** A. Banks and E. Porcello, *Learning React: Modern Patterns for Developing React Apps*. O'Reilly Media, 2020.

---

## ⚖️ License

Distributed under the MIT License.