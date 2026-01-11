# Buraco - Multiplayer Card Game

A real-time multiplayer Buraco card game built with Node.js, Socket.IO, and vanilla JavaScript.

![Buraco](https://img.shields.io/badge/Game-Buraco-green)
![Players](https://img.shields.io/badge/Players-2%2C4%2C6-blue)

## Features

- 🎴 Full Buraco game implementation (Indian variant)
- 👥 Multiplayer support for 2, 4, or 6 players (team-based)
- 🏠 Room-based matchmaking with unique codes
- ⏱️ Configurable turn timer (30s, 60s, 90s, or off)
- � Configurable deck count (2-4 decks) and jokers per deck
- � Classic casino-themed UI with team color coding
- ⚡ Real-time gameplay with Socket.IO
- 📱 Responsive design
- 🎯 Avatar selection and player customization

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm

### Running Locally

**Option 1: Use the start script (recommended)**

```bash
./start.sh
```

This starts both backend and frontend automatically.

**Option 2: Manual start**

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
   - Choose your avatar and enter a nickname
   - Create a room (select player count and options) OR join with a room code
   - Share the room code with friends
   - Start the game when everyone is ready!

## Deployment (Render - Free)

### Static Site + Web Service (Recommended)

1. **Deploy Backend:**
   - Create a **Web Service** on Render
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: `NODE_ENV=production`

2. **Deploy Frontend:**
   - Create a **Static Site** on Render
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build && cp config.js dist/ && cp -r assets dist/`
   - Publish Directory: `dist`

3. **Update Frontend Config:**
   - Edit `frontend/config.js` with your backend URL
   - Push to GitHub for auto-deploy

See `DEPLOY.md` for detailed instructions.

## Game Rules

Buraco is a rummy-style card game using configurable decks (default: 2 decks = 108 cards).

### Teams
- **2 players**: 1v1
- **4 players**: 2v2 (Team A vs Team B)
- **6 players**: 3v3 (Team A vs Team B)

Team members are color-coded:
- 🔵 **Blue**: Teammates
- 🔴 **Red**: Opponents

### Objective
Form melds (sets or sequences) of cards and score points. Empty your hand and pick up the pozzetto to continue playing.

### Melds
- **Set**: 3+ cards of the same rank (max 1 Joker wild card)
- **Sequence**: 3+ consecutive cards of the same suit (max 1 Joker wild card)
- **Burraco**: A meld of 7+ cards (bonus points!)

### Wild Cards
- **Only Jokers are wild cards**
- 2s are treated as normal cards (not wild)
- Maximum 1 wild card per meld

### Turn Flow
1. **Draw**: Take from draw pile OR take entire discard pile
2. **Meld**: Optionally play melds or extend existing team melds
3. **Discard**: Discard one card to end turn

### Pozzetto
- When your hand empties, you automatically pick up a pozzetto (11 bonus cards)
- There are 2 pozzetti shared between all players
- Once both pozzetti are taken, the next player to empty their hand wins!

### Turn Timer
- Configurable: 30s, 60s, 90s, or disabled
- If timer expires:
  - Auto-draws if in draw phase
  - Auto-discards a random card if in meld/discard phase

### How to Win

The game ends when a player **goes out** (empties their hand after all pozzetti are taken).

**Winning team** = Team with the highest total score

---

### Scoring - Point Calculation

#### Step 1: Calculate Card Values

| Card | Points |
|------|--------|
| Joker | 50 |
| Ace | 20 |
| 2 | 20 |
| K, Q, J, 10, 9, 8 | 10 each |
| 7, 6, 5, 4, 3 | 5 each |

#### Step 2: Add Meld Points (Positive)

Add the point value of **every card in your team's melds**.

**Example**: A meld of `3♠ 4♠ 5♠ 6♠` = 5 + 5 + 5 + 5 = **20 points**

#### Step 3: Add Bonus Points

| Bonus | Points |
|-------|--------|
| **Clean Burraco** (7+ cards, no Joker) | +200 |
| **Dirty Burraco** (7+ cards, has Joker) | +100 |
| **Going Out** (player who closes) | +100 |
| **Pozzetto Taken** (per pozzetto) | +50 |

#### Step 4: Subtract Hand Penalties (Negative)

Subtract the point value of **every card left in your team's hands**.

**Example**: If you have `K♠ Q♥ 3♦` left = -(10 + 10 + 5) = **-25 points**

---

### Final Score Formula

```
Team Score = (Sum of all meld card values)
           + (Burraco bonuses)
           + (Pozzetto bonuses: +50 each)
           + (Going out bonus: +100 if applicable)
           - (Sum of cards left in team's hands)
```

---

### Example Score Calculation

**Team A at end of game:**
- Melds: 
  - Set of 3 Aces = 20 + 20 + 20 = 60
  - Sequence 5♠-6♠-7♠-8♠-9♠-10♠-J♠ (Clean Burraco) = 5+5+5+10+10+10+10 = 55 + **200 bonus**
- Took 1 pozzetto = +50
- Went out = +100
- Cards in hands = 0

**Team A Total**: 60 + 55 + 200 + 50 + 100 - 0 = **465 points** ✅

**Team B at end of game:**
- Melds:
  - Set of 4 Kings = 10 + 10 + 10 + 10 = 40
  - Sequence 3♥-4♥-5♥-JOKER-7♥-8♥-9♥ (Dirty Burraco) = 5+5+5+50+5+10+10 = 90 + **100 bonus**
- Took 1 pozzetto = +50
- Cards in hands: Q♠, 5♦ = -(10 + 5) = -15

**Team B Total**: 40 + 90 + 100 + 50 - 15 = **265 points**

**Winner: Team A** 🏆

## Room Configuration

When creating a room, you can configure:
- **Turn Timer**: 0 (off), 30, 60, or 90 seconds
- **Deck Count**: 2, 3, or 4 decks
- **Jokers per Deck**: 0, 2, or 4 jokers

## Tech Stack

- **Frontend**: Vite, Vanilla JavaScript, CSS
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Render (static site + web service)

## Project Structure

```
buraco_indian_version/
├── backend/
│   ├── game/
│   │   ├── Deck.js          # Card deck management
│   │   ├── GameState.js     # Core game logic
│   │   ├── MeldValidator.js # Meld validation rules
│   │   ├── Room.js          # Room management
│   │   └── Scoring.js       # Score calculation
│   └── server.js            # Express + Socket.IO server
├── frontend/
│   ├── src/
│   │   ├── game/
│   │   │   ├── CardRenderer.js  # Card UI rendering
│   │   │   └── GameClient.js    # Socket.IO client
│   │   ├── styles/
│   │   │   ├── cards.css        # Card styling
│   │   │   ├── main.css         # Global styles
│   │   │   └── table.css        # Game table layout
│   │   └── ui/
│   │       ├── CharacterSelection.js
│   │       ├── GameTable.js     # Main game UI
│   │       └── Lobby.js         # Room lobby
│   ├── assets/avatars/          # Player avatars
│   ├── config.js                # Backend URL config
│   └── index.html
├── start.sh                     # Dev startup script
├── render.yaml                  # Render deployment config
└── DEPLOY.md                    # Deployment guide
```

## License

MIT
