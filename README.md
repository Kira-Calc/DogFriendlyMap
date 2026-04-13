# Dog Friendly Map

> Discover dog-friendly parks and off-leash areas across Brisbane — built for dog owners who want the best walking spots near them.

<p align="center">
  <img src="images/logo.svg" alt="Dog Friendly Map Logo" width="120">
</p>

## About

**Dog Friendly Map** is an interactive web application that helps dog owners in Brisbane find nearby parks, off-leash areas, and dog-friendly facilities. The app pulls real-time data from Brisbane City Council's open data portal and displays it on an interactive Google Maps interface with rich filtering, guided search, and detailed park information.

This project was developed as part of the **DECO1800 — Design Computing Studio 1** course at **The University of Queensland** (Semester 1, 2025).

## Features

### Interactive Map
- Full Google Maps integration with custom markers (green for off-leash, red for regular parks, blue for user location)
- Automatic geolocation detection with fallback to Brisbane CBD
- Address search with geocoding (auto-scoped to Brisbane region)
- Get directions to any park via Google Maps navigation

### Smart Filtering
- **Off-Leash Areas** — Find parks where dogs can roam free
- **Fencing** — Filter for fully fenced parks for extra safety
- **Night Lighting** — Locate parks suitable for evening walks
- **Small Dog Enclosure** — Dedicated spaces for smaller breeds
- **Dog Agility Equipment** — Parks with agility training facilities
- Filters work across both map and list views

### Guided Search ("Help me find a park")
A step-by-step wizard that asks about your walking habits and dog's needs, then automatically applies the right filters:
- Walking time preference (day vs. night)
- Off-leash requirement
- Fencing needs
- Dog size
- Agility equipment interest

### Park Details Page
- Comprehensive park information: hours, dog rules, amenities, facilities
- Embedded Leaflet/OpenStreetMap preview with precise location
- One-click Google Maps directions
- Favorite/bookmark parks (persisted in localStorage)
- **Community Reviews** — star ratings, written reviews, photo attachments, like/delete functionality
- Reviews are stored locally in the browser per park

### User Profile System
- Customizable profile with avatar upload, display name, and user handle
- Dog details card (name, breed, age, notes)
- Walking preferences (morning/evening, dog size, experience level)
- Saved locations (favorites) management with direct links to park details
- Profile data persists across sessions via localStorage
- User tags (e.g. "Morning walker", "Small dog owner") automatically appear on reviews

### Saved Preferences
- Bookmark favorite parks from the details page
- Access all saved parks from the home screen via "My Saved Preferences"

## Data Sources

All park data is sourced live from the [Brisbane City Council Open Data Portal](https://www.data.brisbane.qld.gov.au/):

| Dataset | Description |
|---------|-------------|
| [Park Locations](https://data.brisbane.qld.gov.au/explore/dataset/park-locations/information/) | General park locations across Brisbane |
| [Park Dog Off-Leash Areas](https://data.brisbane.qld.gov.au/explore/dataset/park-dog-off-leash-areas/information/) | Designated off-leash dog areas |

Data is fetched at runtime via the council's public REST API — no backend server required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Map (main) | [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) |
| Map (details) | [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) |
| Icons | [Font Awesome 6](https://fontawesome.com/) |
| Data | Brisbane City Council Open Data REST API |
| Storage | Browser localStorage (profiles, reviews, favorites) |
| Design | [Figma](https://www.figma.com/) (original wireframes and mockups) |

## Project Structure

```
DogFriendlyMap/
├── index.html            # Main app — home page, map view, list view, modals
├── full_details.html      # Park details page with reviews and Leaflet map
├── profile.html           # User profile management page
├── script.js              # Core app logic — map, filters, data fetching, navigation
├── profile.js             # Profile page logic — localStorage persistence, UI
├── css/
│   ├── styles.css         # Global styles, responsive design, all page components
│   └── profile.css        # Profile page specific styles
└── images/
    └── logo.svg           # App logo (map pin + dog paw)
```

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools, Node.js, or backend server required

### Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kira-Calc/DogFriendlyMap.git
   cd DogFriendlyMap
   ```

2. **Start a local server** (required for API calls)
   ```bash
   # Python 3
   python3 -m http.server 8080

   # Or Node.js
   npx serve .
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

> **Note:** The app requires an internet connection to load park data from Brisbane City Council's API and to render Google Maps.

## Team

This project was developed by a team of five students at The University of Queensland:

- **Xinnuo Li**
- **Wenze Ou**
- **Chengquan Jiang**
- **Anton Wey Lam Lee**
- **Yajie Han**

## Acknowledgements

- [Brisbane City Council](https://www.brisbane.qld.gov.au/) — Open data portal for park datasets
- [Google Maps Platform](https://developers.google.com/maps) — Maps JavaScript API
- [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) — Detail page map
- [Font Awesome](https://fontawesome.com/) — Icon library
- [Anima](https://www.animaapp.com/) — Design assistant and icon set
- [Figma](https://www.figma.com/) — UI/UX design tool
- AI tools (ChatGPT, Codex by OpenAI) were used to assist with ideation, code simplification, and troubleshooting. All AI-generated content was critically reviewed and adapted by the team.

## License

This project was created for academic purposes as part of DECO1800 at UQ. All rights reserved by the authors.
