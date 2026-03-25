# Davi Training

A local-first workout tracker built with React Native and Expo. Create strength and cardio routines, execute training sessions with built-in timers, and review your history with visual muscle highlights — all stored on-device with zero cloud dependency.

---

## Features

**Workout Management**
- Create and organize strength exercises with sets, reps, rest times, and target muscles
- Add cardio exercises with configurable durations
- Build reusable presets (routines) combining both types with drag-to-reorder support

**Live Training Sessions**
- Execute presets with real-time rest timers and haptic feedback
- Track cardio with elapsed-time counters
- Add exercises on the fly mid-session
- Auto-loads your last used weights for each exercise

**History & Progress**
- Browse completed sessions with detailed breakdowns
- Visual muscle group highlights via interactive body diagram
- Weekly streak tracker on the home screen

**Privacy First**
- All data lives locally in SQLite on your device
- No accounts, no servers, no tracking

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Expo](https://expo.dev) SDK 54 · React Native 0.81 · React 19 |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| Database | [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) via expo-sqlite + [TypeORM](https://typeorm.io/) |
| Server State | [TanStack Query](https://tanstack.com/query) |
| Animations | [Reanimated](https://docs.swmansion.com/react-native-reanimated/) · Gesture Handler |
| UI | Ionicons · Body Highlighter · Draggable FlatList |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (used as the package manager and script runner)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio / Xcode for native builds, or Expo Go for development

### Install & Run

```bash
# Clone the repo
git clone https://github.com/<your-username>/davi-training.git
cd davi-training

# Install dependencies
bun install

# Start the dev server
bun start

# Run on a specific platform
bun run android
bun run ios
bun run web
```

---

## Project Structure

```
app/
├── (tabs)/              # Tab screens: Home, History, Profile
├── add-exercise.tsx     # Create/edit strength & cardio exercises
├── add-preset.tsx       # Create/edit training presets
├── manage-exercises.tsx # Browse and delete exercises
├── manage-presets.tsx   # Browse and delete presets
├── training-execution.tsx # Live session with timers
├── training-details.tsx # Read-only session review
└── _layout.tsx          # Root layout: DB init + providers

components/              # Shared UI (WeekTracker, MuscleHighlightBody, etc.)
entities/                # TypeORM entity classes (Exercise, Preset, Execution…)
hooks/query/             # React Query hooks wrapping repository calls
migrations/              # Versioned SQL migrations
data-source.ts           # TypeORM DataSource configuration
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun start` | Start the Expo dev server |
| `bun run android` | Build and run on Android |
| `bun run ios` | Build and run on iOS |
| `bun run web` | Start the web version |
| `bun run lint` | Run ESLint |

---

## License

This project is private and not currently published under an open-source license.
