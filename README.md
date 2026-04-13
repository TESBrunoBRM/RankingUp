# 🏆 RankingUp

**RankingUp** is a comprehensive, gamified fitness and nutrition tracking React Native application. It helps users stay motivated by calculating their relative strength, BMI, and assigning them a global rank based on their fitness progress, while also providing robust workout and nutrition tracking capabilities.

## ✨ Features

*   **Gamified Fitness Tracking:** Earn XP for workouts. View your relative strength and rank (e.g., Hierro, Bronce) on a global leaderboard.
*   **Workout Management (CRUD):** Create custom workouts, add specific exercises, and log your sets, reps, and weights.
*   **Nutrition & Calorie Tracking:** 
    *   Mandatory onboarding for user metric acquisition (weight, height, goals).
    *   Automatic personalized daily calorie target calculations.
    *   Advanced food logging system.
*   **AI Camera Food Scanner:** Identify food items and automatically log their nutritional data simply by taking a picture (powered by AI and Expo Image integration).
*   **Secure Authentication:** User sign-up and login securely managed by Supabase Auth.
*   **Real-time Database:** Data is synchronized in real-time using Supabase Database, allowing offline support and rapid sync.

## 🛠️ Tech Stack

*   **Frontend:** React Native, Expo, TypeScript
*   **State Management:** Zustand
*   **Navigation:** React Navigation (Native Stack, Bottom Tabs)
*   **Backend & Auth:** Supabase (PostgreSQL, Realtime, Storage)
*   **APIs:** Integrations with FatSecret API for nutrition data and AI APIs for food image analysis.
*   **Local Storage:** AsyncStorage (for auth persistence)

## 📁 Folder Structure

```
proyecto/
├── assets/                 # Images, icons, and fonts (e.g., rank badges)
├── src/
│   ├── components/         # Reusable UI components (Button, Input, etc.)
│   ├── lib/                # Library configurations (Supabase client setup)
│   ├── navigation/         # React Navigation stacks and tab coordinators
│   ├── screens/            # Full-screen components (Home, Login, Nutrition, etc.)
│   ├── services/           # External API calls, Database operations, AI services
│   ├── store/              # Zustand global state management
│   └── types/              # TypeScript interfaces and type definitions
├── App.tsx                 # Main application entry point
└── app.json                # Expo configuration
```

## 🚀 Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or yarn
*   [Expo CLI / Expo Go App](https://expo.dev/) (for running on a physical device)
*   A [Supabase](https://supabase.com/) project

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/TESBrunoBRM/RankingUp.git
    cd RankingUp
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables setup**

    Create a `.env` file in the root directory and copy the contents from `.env.example`:

    ```bash
    cp .env.example .env
    ```

    Fill in your specific API keys and Database URLs in the new `.env` file:
    *   `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
    *   `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key.
    *   *(Include below any other variables like FATSECRET API keys or AI service keys used in the app)*

4.  **Database Setup (Supabase)**
    Ensure you have the following tables created in your Supabase project (refer to `db-check.js` or backend files for schema specifics):
    *   `profiles`
    *   `workouts`
    *   `exercises`
    *   `workout_exercises`
    *   `workout_logs`
    *   `nutrition_logs`

5.  **Run the application**

    Start the Expo development server:

    ```bash
    npm start
    # or
    npx expo start
    ```

6.  **Open the app**
    *   Scan the QR code printed in the terminal using the **Expo Go** app on your physical iOS or Android device.
    *   Press `a` to run on an Android emulator (requires Android Studio).
    *   Press `i` to run on an iOS simulator (requires Xcode - Mac only).

## 🛡️ License

This project is licensed under the MIT License.
