# Buraco - Multiplayer Card Game

A real-time multiplayer Buraco card game built with Node.js, Socket.IO, and vanilla JavaScript.

![Buraco](https://img.shields.io/badge/Game-Buraco-green)
![Players](https://img.shields.io/badge/Players-2%2C4%2C6-blue)

## Features

- 🎴 Full Buraco game implementation with Brazilian rules
- 👥 Multiplayer support for 2, 4, or 6 players
- 🏠 Room-based matchmaking with unique codes
- 🎨 Classic casino-themed UI
- ⚡ Real-time gameplay with Socket.IO
- 📱 Responsive design

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm

### Running Locally

1. **Start the backend server:**

```bash
cd backend
npm install
npm run dev
```

The server will start on `http://localhost:3001`

2. **Start the frontend (in a new terminal):**

```bash
cd frontend
npm install
npm run dev
```

The frontend will open at `http://localhost:5173`

3. **Play the game:**
   - Enter a nickname
   - Create a room (select player count) OR join with a room code
   - Share the room code with friends
   - Start the game when everyone is ready!

## Deployment

### Frontend (Netlify)

1. Connect your GitHub repository to Netlify
2. Set build settings:
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
3. Add environment variable:
   - `VITE_BACKEND_URL`: Your backend URL (e.g., `https://your-app.onrender.com`)

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set configuration:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `node server.js`
4. Add environment variable:
   - `FRONTEND_URL`: Your Netlify URL (for CORS)

## Game Rules

Buraco is a rummy-style card game using two standard decks (108 cards).

### Objective
Form melds (sets or sequences) of cards and score points. First team to 2000 points wins.

### Melds
- **Set**: 3+ cards of the same rank (max 1 wild card)
- **Sequence**: 3+ consecutive cards of the same suit
- **Burraco**: A meld of 7+ cards (bonus points!)

### Turn Flow
1. **Draw**: Take from draw pile OR take entire discard pile
2. **Meld**: Optionally play melds or extend existing ones
3. **Discard**: Discard one card to end turn

### Special Rules
- Jokers and 2s are wild cards
- When your hand empties, pick up the pozzetto (bonus 11 cards)
- Must have a burraco to go out

### Scoring
- Cards in melds: Card values
- Cards in hand: Negative points
- Clean burraco (no wilds): +200
- Dirty burraco (with wild): +100
- Going out: +100

## Tech Stack

- **Frontend**: Vite, Vanilla JavaScript, CSS
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Netlify (frontend), Render (backend)

## License

MIT
