# Riwaq Invest - Skeleton File (v1.0)

## 1. Context & Strategic Goal
- **Project Name:** Riwaq Invest (رواق إنفست)
- **Sector:** Fintech / Real Estate Crowdfunding (Algeria market)
- **Strategic Goal:** Deliver a high-quality, secure MVP for iOS & Android, enabling users to invest in fractional real estate projects.

## 2. Platform & Tech Stack
- **IDE:** Cursor
- **Framework:** React Native (Expo v51+ using managed workflow)
- **UI Framework:** NativeWind v4 (Tailwind CSS for React Native)
- **Language:** TypeScript
- **Backend/Database:** Supabase (Auth, DB, Storage)
- **Core Dependencies (Planning):**
  - `expo-router` (File-based navigation)
  - `@rneui/themed` or `react-native-paper` (Optional for base components, priority to custom NativeWind)
  - `react-native-svg` (For Figma icon imports)
  - `i18next` / `react-i18next` (Multi-language support: AR, FR, EN)
  - `react-native-chart-kit` or `victory-native` (For Portfolio graphs)
  - `react-native-pdf` / `expo-print` (For downloading investment statements)
  - `react-native-image-picker` (For KYC document upload)

## 3. Localization
- **Default Language:** Arabic (RTL)
- **Supported Languages:** French, English.

## 4. Features & User Flow (MVP)
- **Onboarding:** Language selection -> Tutorial screens (image_1.png, image_2.png, image_3.png) -> Login/Signup (image_5.png, image_6.png).
- **Authentication:** Supabase Auth (Email/Password).
- **Dashboard:** (image_7.png) Overview of balance, active investments, ROI, quick actions (Explore, Portfolio).
- **Real Estate Listings:** (image_8.png) Grid/List view of projects with funding progress, location, ROI %, risk level.
- **Investment Simulator:** (image_10.png) Interactive calculator for ROI based on amount, duration, and risk level.
- **Portfolio Management:** (image_9.png) Chart of asset distribution, list of active/completed investments, download statements.
- **Payment Integration (Backend concept):** Placeholder for Bank Transfer / CCP upload flow (MVP will likely not include direct API payment).
- **KYC & Security:** User profile setup with ID upload placeholder.

## 5. Folder Structure (Standard Expo Router)
```text
/RiwaqInvest
├── /app                # Expo Router files (Screens/Routes)
│   ├── (auth)          # Group: login, signup
│   ├── (tabs)          # Group: home, explore, portfolio, profile
│   └── _layout.tsx     # Root layout & Providers
├── /assets             # Images, Fonts, Icons (imported from Figma)
│   ├── /fonts
│   ├── /icons
│   └── /images
├── /components         # Reusable UI components (NativeWind styled)
│   ├── /ui             # Basic components (Button, Input, Card)
│   └── /charts         # Portfolio charts
├── /constants          # App-wide constants (colors, layout)
│   └── Colors.ts
├── /docs               # Project documentation
│   └── SKELETON.md     # -> THIS FILE (Source of Truth)
├── /hooks              # Custom React hooks
├── /localization       # i18n configuration (AR, FR, EN)
├── /services           # API/Supabase client logic
├── /utils              # Helper functions
├── /types              # TypeScript declarations
├── app.json            # Expo config
├── babel.config.js     # Babel config (NativeWind plugin)
├── tailwind.config.js  # NativeWind config
├── tsconfig.json       # TypeScript config
└── package.json
```
