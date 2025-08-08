# Kraków Public Transport Live Departures 🚌🚊

A Progressive Web Application (PWA) that displays real-time public transportation in Kraków using GTFS (General Transit Feed Specification) data. Track buses and trams live on an interactive map with departure times and vehicle information.

## 🌐 Live Demo

**Try the app: [https://live-departures.pages.dev/](https://live-departures.pages.dev/)**

![App Demo](demo.gif)

## 🌟 Features

- **Real-time vehicle tracking** - Live positions of buses and trams
- **Interactive map** - Powered by Leaflet with custom vehicle icons
- **Stop information** - Detailed departure times and route information
- **Progressive Web App** - Install on mobile devices for native-like experience
- **Vehicle photos** - Visual identification of different vehicle types
- **GTFS compatible** - Ready for any city that provides GTFS data

## 🌍 GTFS Compatibility

This application is designed to work with any city that provides GTFS (General Transit Feed Specification) data. While currently configured for Kraków's MPK system, it can be easily adapted for other cities by updating the GTFS data source.

## 🚀 Getting Started

### Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Testing
- Run `ng test` to execute unit tests via [Karma](https://karma-runner.github.io)
- Run `cypress:run` for end-to-end tests

## 🛠 Technology Stack

- **Angular 18** - Frontend framework
- **Leaflet** - Interactive maps
- **Service Worker** - PWA functionality
- **TypeScript** - Type-safe development
- **Cypress** - End-to-end testing

## 📱 PWA Features

- Offline capability
- Install prompt for mobile devices
- App-like experience
- Responsive design

---

*Built with Angular CLI version 17.3.17*
