/**
 * Reference Disclaimer:
 * This JavaScript file was developed by the project team as part of the DECO1800 course at The University of Queensland.
 *
 * The core logic and implementation — including interactive functionality, DOM manipulation,
 * filtering, and integration with map APIs — were written by the student team.
 *
 * AI tools such as ChatGPT and Codex (OpenAI, 2025) were used to assist in refining code structure,
 * simplifying logic, and improving syntax. All AI-assisted content was carefully reviewed, modified,
 * and integrated by the team to ensure correctness and project relevance.
 *
 * External tools and references:
 * - Google. (2025). Google Maps JavaScript API [Computer software]. Google Maps Platform.
 *   https://developers.google.com/maps/documentation/javascript/overview
 * - Runoob Tutorial. Google Maps API Tutorial: https://www.runoob.com/googleapi/googleapi-tutorial.html
 * - JS tutorial from Runoob: https://www.runoob.com/js/js-tutorial.html
 */

const DEFAULT_LOCATION = { lat: -27.4698, lng: 153.0251 };
const PARK_LIMIT = 20;
const STORAGE_KEYS = {
  user: 'currentUser',
  favorites: 'park-favorites'
};
const FILTER_KEYS = ['nightLighting', 'fenced', 'offLeash', 'smallDogEnclosure', 'agility'];

let currentUser = null;
let selectedPark = null;
let userLocation = null;
let allParks = [];
let currentFilters = {};
let map = null;
let markers = [];
let infoWindow = null;
let geocoder = null;
let directionsService = null;
let directionsRenderer = null;
let userLocationMarker = null;
let confirmResolve = null;

const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4a90e2"/><stop offset="100%" stop-color="#6fb1ff"/></linearGradient></defs>
     <rect width="40" height="40" rx="8" fill="url(#g)"/>
     <circle cx="14" cy="16" r="4" fill="#fff"/>
     <circle cx="26" cy="16" r="4" fill="#fff"/>
     <path d="M10 28c4-3 16-3 20 0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
   </svg>`
);

const BRISBANE_BOUNDS = {
  south: -27.7,
  north: -27.2,
  west: 152.8,
  east: 153.3
};

// --- Initialisation -------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupConfirmModal();
});

window.initGoogleMaps = function initGoogleMaps() {
  if (document.getElementById('mapPage')?.classList.contains('active')) {
    initializeMap();
  }
};

function initializeApp() {
  getUserLocation();
  loadParkData();
  restoreUser();
  setupEventListeners();
  syncTopFilterButtons();
}

function setupEventListeners() {
  const searchInput = document.getElementById('addressSearch');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    searchInput.dataset.originalPlaceholder = searchInput.dataset.originalPlaceholder || searchInput.placeholder || '';
    searchInput.addEventListener('focus', () => clearInputError(searchInput));
    searchInput.addEventListener('input', () => {
      clearInputError(searchInput);
      toggleClearButton(clearBtn, searchInput.value);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchLocation();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearSearch);
  }

  toggleClearButton(clearBtn, searchInput ? searchInput.value : '');

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
  });
}

// --- Input helpers --------------------------------------------------------

function applyInputError(input, message) {
  if (!input) return;
  input.dataset.originalPlaceholder = input.dataset.originalPlaceholder || input.placeholder || '';
  input.classList.add('input-error');
  input.placeholder = message;
  input.value = '';
  input.setAttribute('aria-invalid', 'true');
}

function clearInputError(input) {
  if (!input || !input.classList.contains('input-error')) return;
  input.classList.remove('input-error');
  if (input.dataset.originalPlaceholder !== undefined) {
    input.placeholder = input.dataset.originalPlaceholder;
  }
  input.removeAttribute('aria-invalid');
}

function toggleClearButton(button, value) {
  if (!button) return;
  button.classList.toggle('hidden', !value || !value.trim());
}

function clearSearch(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('addressSearch');
  if (!input) return;
  clearInputError(input);
  input.value = '';
  input.focus();
  toggleClearButton(document.getElementById('clearSearchBtn'), '');
}

// --- Location handling ----------------------------------------------------

function getUserLocation() {
  if (!navigator.geolocation) {
    userLocation = { ...DEFAULT_LOCATION };
    showNotification('Geolocation unavailable, using Brisbane CBD');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      showNotification('Location detected');
    },
    () => {
      userLocation = { ...DEFAULT_LOCATION };
      showNotification('Using Brisbane CBD as a starting point');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function useCurrentLocation() {
  const btn = document.querySelector('.current-location-btn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';

  const done = () => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location';
  };

  if (!navigator.geolocation) {
    showNotification('Geolocation not supported on this browser');
    focusMapOn(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
    done();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (!isWithinBrisbane(lat, lng)) {
        showNotification('Outside Brisbane area — centering on CBD instead');
        focusMapOn(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      } else {
        focusMapOn(lat, lng);
        updateAddressFieldFromLocation();
        showNotification('Using your current location');
      }
      showMapView();
      done();
    },
    () => {
      showNotification('Unable to access location, falling back to Brisbane CBD');
      focusMapOn(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      showMapView();
      done();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function updateAddressFieldFromLocation() {
  if (!geocoder || !userLocation) return;
  geocoder.geocode({ location: userLocation }, (results, status) => {
    if (status === 'OK' && results?.[0]) {
      const input = document.getElementById('addressSearch');
      if (input) {
        clearInputError(input);
        input.value = results[0].formatted_address;
        toggleClearButton(document.getElementById('clearSearchBtn'), input.value);
      }
    }
  });
}

function searchLocation() {
  const input = document.getElementById('addressSearch');
  if (!input) return;

  clearInputError(input);
  const address = input.value.trim();
  if (!address) {
    applyInputError(input, 'Enter an address to search');
    toggleClearButton(document.getElementById('clearSearchBtn'), input.value);
    return;
  }

  const searchBtn = document.querySelector('.search-btn');
  if (!searchBtn) return;

  const originalLabel = searchBtn.innerHTML;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  searchBtn.disabled = true;

  showMapView();

  setTimeout(() => {
    performGeocodingSearch(address, searchBtn, originalLabel);
  }, 600);
}

function performGeocodingSearch(address, button, label) {
  if (!ensureGeocoder()) {
    showNotification('Map services are still loading, try again in a moment');
    restoreSearchButton(button, label);
    return;
  }

  const lower = address.toLowerCase();
  const query = lower.includes('brisbane') || lower.includes('qld')
    ? address
    : `${address}, Brisbane, Queensland, Australia`;

  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(BRISBANE_BOUNDS.south, BRISBANE_BOUNDS.west),
    new google.maps.LatLng(BRISBANE_BOUNDS.north, BRISBANE_BOUNDS.east)
  );

  geocoder.geocode(
    {
      address: query,
      bounds,
      componentRestrictions: { country: 'AU', administrativeArea: 'Queensland', locality: 'Brisbane' },
      region: 'AU'
    },
    (results, status) => {
      restoreSearchButton(button, label);
      if (status !== 'OK' || !results?.length) {
        showNotification('Location not found within Brisbane');
        return;
      }

      const match = results.find((result) => {
        const loc = result.geometry.location;
        return isWithinBrisbane(loc.lat(), loc.lng());
      }) || results[0];

      const loc = match.geometry.location;
      focusMapOn(loc.lat(), loc.lng());

      const input = document.getElementById('addressSearch');
      if (input) {
        input.value = match.formatted_address;
        toggleClearButton(document.getElementById('clearSearchBtn'), input.value);
      }

      showNotification(`Found: ${match.formatted_address}`);
      applyFiltersNear({ lat: loc.lat(), lng: loc.lng() });
    }
  );
}

function ensureGeocoder() {
  if (!geocoder && window.google) {
    geocoder = new google.maps.Geocoder();
  }
  return geocoder;
}

function restoreSearchButton(button, label) {
  if (!button) return;
  button.innerHTML = label;
  button.disabled = false;
}

function focusMapOn(lat, lng) {
  if (isNaN(lat) || isNaN(lng)) return;
  userLocation = { lat, lng };

  if (map) {
    const position = new google.maps.LatLng(lat, lng);
    map.setCenter(position);
    map.setZoom(16);
  }

  updateUserLocationMarker();
  displayParksOnMap();
}

function applyFiltersNear(origin) {
  if (!Object.values(currentFilters).some(Boolean)) return;
  const filtered = getFilteredParks();
  const nearby = nearestByPoint(filtered, origin, PARK_LIMIT);
  if (!nearby.length) {
    showNotification('No parks match those filters near that spot');
    return;
  }
  renderMarkers(nearby, origin);
  const activeNames = getActiveFilterLabels();
  const summary = activeNames.length ? activeNames.join(', ') : 'filters';
  showNotification(`Found ${nearby.length} parks with ${summary}`);
}

function getActiveFilterLabels() {
  const labels = [];
  if (currentFilters.nightLighting) labels.push('night lighting');
  if (currentFilters.fenced) labels.push('fencing');
  if (currentFilters.offLeash) labels.push('off-leash access');
  if (currentFilters.smallDogEnclosure) labels.push('small dog areas');
  if (currentFilters.agility) labels.push('dog agility equipment');
  return labels;
}

// --- Map handling ---------------------------------------------------------

function initializeMap() {
  if (!window.google) return;
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  if (map) {
    google.maps.event.trigger(map, 'resize');
    displayParksOnMap();
    updateUserLocationMarker();
    return;
  }

  map = new google.maps.Map(mapElement, {
    zoom: userLocation ? 15 : 12,
    center: userLocation || DEFAULT_LOCATION,
    fullscreenControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    styles: [{
      featureType: 'poi.park',
      elementType: 'geometry.fill',
      stylers: [{ color: '#a5d6a7' }]
    }]
  });

  infoWindow = new google.maps.InfoWindow();
  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  updateUserLocationMarker();
  displayParksOnMap();
}

function updateUserLocationMarker() {
  if (!map || !userLocation) return;

  if (userLocationMarker) {
    userLocationMarker.setMap(null);
  }

  userLocationMarker = new google.maps.Marker({
    position: userLocation,
    map,
    title: 'Your Location',
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      scaledSize: new google.maps.Size(32, 32)
    },
    zIndex: 1000
  });
}

function displayParksOnMap() {
  if (!map || !allParks.length) return;
  const parks = nearestByPoint(getFilteredParks(), userLocation, PARK_LIMIT);
  renderMarkers(parks, userLocation);
}

function renderMarkers(parks, origin) {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  const navBtn = document.getElementById('navigationBtn');
  if (navBtn) navBtn.classList.add('hidden');
  selectedPark = null;

  parks.forEach((park, index) => {
    const lat = park.coordinates[1];
    const lng = park.coordinates[0];
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: park.name,
      icon: {
        url: park.isOffLeash
          ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
          : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
      }
    });

    const distance = park.distance ?? (origin ? calculateDistance(origin, { lat, lng }) : null);
    const content = createInfoWindowContent(park, distance, lat, lng, index);

    marker.addListener('click', () => {
      infoWindow?.setContent(content);
      infoWindow?.open(map, marker);
      selectedPark = { name: park.name, lat, lng };
      if (navBtn) navBtn.classList.remove('hidden');
    });

    markers.push(marker);
  });
}

function createInfoWindowContent(park, distance, lat, lng) {
  const facilitiesHTML = (park.facilities || []).map((facility) =>
    `<span style="background:#e3f2fd;color:#1976d2;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:4px;margin-bottom:4px;display:inline-block;">${facility}</span>`
  ).join('');

  const offLeashBadge = park.isOffLeash
    ? '<span style="background:#e8f5e8;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:4px;">Off-Leash</span>'
    : '';

  const packed = base64EncodeUnicode(JSON.stringify({
    id: park.id || park.name,
    name: park.name,
    address: park.address || '',
    suburb: park.suburb || '',
    lat,
    lng,
    facilities: park.facilities || [],
    photo: park.photo || ''
  }));

  return `
    <div style="max-width:280px;">
      <h3 style="margin:0 0 10px;color:#333;">${park.name}</h3>
      <p style="margin:0 0 8px;color:#666;font-size:12px;">
        ${park.suburb ? `${park.suburb} • ` : ''}${distance ? `${Number(distance).toFixed(1)} km away` : ''}
      </p>
      <div style="margin-bottom:10px;">
        ${facilitiesHTML}${offLeashBadge}
      </div>
      <div style="margin-top:15px;">
        <button onclick="window.location.href='Full_Details.html?park=${packed}'"
                style="background:#4a90e2;color:white;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;margin-right:10px;font-size:12px;">
          Details
        </button>
        <button onclick="getDirectionsFromMap(${lat}, ${lng}, '${park.name.replace(/'/g, "\\'")}')"
                style="background:#28a745;color:white;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;font-size:12px;">
          Directions
        </button>
      </div>
    </div>
  `;
}

// --- Data fetching --------------------------------------------------------

async function loadParkData() {
  try {
    showNotification('Loading park data...');
    const [parksRaw, offLeashRaw] = await Promise.all([
      fetchAPIData('https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/park-locations/records?limit=100'),
      fetchAPIData('https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/park-dog-off-leash-areas/records?limit=100')
    ]);

    const parks = parksRaw
      .map((record, index) => buildPark(record, index, false))
      .filter(Boolean);
    const offLeash = offLeashRaw
      .map((record, index) => buildPark(record, index, true))
      .filter(Boolean);

    allParks = [...parks, ...offLeash];
    if (allParks.length) {
      showNotification(`Loaded ${allParks.length} parks from the council dataset`);
    } else {
      showNotification('No park data returned from the API');
    }
    updateDisplays();
  } catch (error) {
    console.error('Error loading park data', error);
    showNotification('Unable to load park information right now');
  }
}

async function fetchAPIData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const data = await response.json();
  return data.records || data.results || data.data || (Array.isArray(data) ? data : []);
}

function buildPark(item, index, isOffLeash) {
  const fields = item?.record?.fields || item?.fields || item;
  if (!fields) return null;

  const coords = extractCoordinates(fields);
  if (!coords) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || !isWithinBrisbane(lat, lng)) return null;

  const name = fields.park_name || fields.name || fields.facility_name || fields.site_name || fields.title || `Park ${index + 1}`;
  const baseFacilities = extractFacilities(fields);

  const facilities = new Set(baseFacilities);
  if (isTruthy(fields.LIGHTING || fields.lighting)) facilities.add('Night Lighting');
  const fencingValue = (fields.FENCING || fields.fencing || '').toString().trim().toLowerCase();
  if (fencingValue === 'fully fenced') facilities.add('Fencing');
  if (isTruthy(fields.SMALL_DOG_ENCLOSURE || fields.small_dog_enclosure)) facilities.add('SMALL DOG ENCLOSURE');
  if (isTruthy(fields.DOG_AGILITY_EQUIPMENT || fields.dog_agility_equipment)) facilities.add('DOG AGILITY EQUIPMENT');

  return {
    id: fields.global_id || fields.cartodb_id || fields.id || `${name}-${lat}-${lng}`,
    name,
    coordinates: [lng, lat],
    suburb: fields.suburb || fields.locality || fields.district || '',
    address: fields.address || fields.street_address || fields.full_address || '',
    facilities: Array.from(facilities),
    isOffLeash,
    hours: fields.opening_hours || fields.hours || '',
    restrictions: fields.restrictions || fields.rules || '',
    photo: fields.photo || ''
  };
}

function extractCoordinates(fields) {
  if (!fields) return null;

  if (Array.isArray(fields.geopoint) && fields.geopoint.length >= 2) {
    return [fields.geopoint[1], fields.geopoint[0]];
  }
  if (fields.geo_shape?.type === 'Point' && Array.isArray(fields.geo_shape.coordinates)) {
    return fields.geo_shape.coordinates;
  }
  if (fields.geometry?.type === 'Point' && Array.isArray(fields.geometry.coordinates)) {
    return fields.geometry.coordinates;
  }
  if (fields.location?.coordinates) {
    return fields.location.coordinates;
  }
  if (fields.lat && fields.long) {
    return [fields.long, fields.lat];
  }
  if (fields.latitude && fields.longitude) {
    return [fields.longitude, fields.latitude];
  }
  if (fields.lat && fields.lng) {
    return [fields.lng, fields.lat];
  }
  if (Array.isArray(fields.coordinates) && fields.coordinates.length >= 2) {
    return fields.coordinates;
  }
  return null;
}

function extractFacilities() {
  return ['Dog Friendly'];
}

function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return ['y', 'yes', 'true', '1'].includes(trimmed);
  }
  return false;
}

// --- Filtering ------------------------------------------------------------

function toggleTopFilter(key, btn) {
  if (!FILTER_KEYS.includes(key)) return;
  FILTER_KEYS.forEach((filterKey) => {
    if (currentFilters[filterKey] === undefined) currentFilters[filterKey] = false;
  });
  currentFilters[key] = !currentFilters[key];
  if (btn) {
    btn.classList.toggle('active', currentFilters[key]);
  }
  updateDisplays();
}

window.toggleTopFilter = toggleTopFilter;

function getFilteredParks() {
  if (!allParks.length) return [];
  return allParks.filter((park) => {
    if (currentFilters.nightLighting && !park.facilities.includes('Night Lighting')) return false;
    if (currentFilters.fenced && !park.facilities.includes('Fencing')) return false;
    if (currentFilters.offLeash && !park.isOffLeash) return false;
    if (currentFilters.smallDogEnclosure && !park.facilities.includes('SMALL DOG ENCLOSURE')) return false;
    if (currentFilters.agility && !park.facilities.includes('DOG AGILITY EQUIPMENT')) return false;
    return true;
  });
}

function nearestByPoint(parks, origin, limit = PARK_LIMIT) {
  if (!parks.length) return [];
  if (!origin || Number.isNaN(origin.lat) || Number.isNaN(origin.lng)) {
    return parks.slice(0, limit);
  }
  return parks
    .map((park) => {
      const lat = park.coordinates[1];
      const lng = park.coordinates[0];
      const distance = Number(calculateDistance(origin, { lat, lng }));
      return { ...park, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function calculateDistance(pos1, pos2) {
  const R = 6371;
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

function updateDisplays() {
  if (document.getElementById('mapPage')?.classList.contains('active')) {
    displayParksOnMap();
  }
  if (document.getElementById('listPage')?.classList.contains('active')) {
    loadParksList();
  }
  syncTopFilterButtons();
}

function syncTopFilterButtons() {
  document.querySelectorAll('.filter-btn[data-filter-key]').forEach((btn) => {
    const key = btn.getAttribute('data-filter-key');
    btn.classList.toggle('active', !!currentFilters[key]);
  });
}

function toggleFloatingFilter() {
  const panel = document.querySelector('.floating-filter-content');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    syncTopFilterButtons();
  }
}

function showFilterPopup(filterType) {
  const popup = document.getElementById('filterPopup');
  const title = document.getElementById('filterTitle');
  const content = document.getElementById('filterContent');
  if (!popup || !title || !content) return;

  const config = {
    lighting: {
      title: 'Night Lighting Options',
      markup: '<div class="filter-option"><label><input type="checkbox" id="hasLighting"> Has night lighting</label></div>'
    },
    leash: {
      title: 'Leash Requirements',
      markup: '<div class="filter-option"><label><input type="checkbox" id="offLeashAllowed"> Off-leash allowed</label></div>'
    }
  }[filterType];

  if (!config) return;
  title.textContent = config.title;
  content.innerHTML = config.markup;
  popup.classList.add('active');
}

function applyFilter() {
  const title = document.getElementById('filterTitle')?.textContent || '';
  const hasLighting = document.getElementById('hasLighting');
  const offLeashAllowed = document.getElementById('offLeashAllowed');

  if (title.includes('Lighting')) {
    currentFilters.nightLighting = !!(hasLighting && hasLighting.checked);
  }
  if (title.includes('Leash')) {
    currentFilters.offLeash = !!(offLeashAllowed && offLeashAllowed.checked);
  }

  closeModal('filterPopup');
  updateDisplays();
  showNotification('Filter applied');
}

// --- Page navigation ------------------------------------------------------

function showHomePage() {
  showPage('homePage');
}

function showMapView() {
  showPage('mapPage');
  setTimeout(() => initializeMap(), 100);
}

function showListView() {
  showPage('listPage');
  loadParksList();
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}

// --- List view ------------------------------------------------------------

function loadParksList() {
  const container = document.getElementById('parksList');
  if (!container) return;

  if (!allParks.length) {
    container.innerHTML = createLoadingHTML();
    return;
  }

  const parks = nearestByPoint(getFilteredParks(), userLocation, PARK_LIMIT);
  if (!parks.length) {
    container.innerHTML = createNoResultsHTML();
    return;
  }

  container.innerHTML = parks.map(createParkCardHTML).join('');
}

function createLoadingHTML() {
  return `
    <div style="text-align:center;padding:50px;color:#666;">
      <i class="fas fa-tree" style="font-size:48px;margin-bottom:20px;"></i>
      <h3>Loading Parks...</h3>
      <p>Please wait while we find nearby dog-friendly parks</p>
    </div>
  `;
}

function createNoResultsHTML() {
  return `
    <div style="text-align:center;padding:50px;color:#666;">
      <i class="fas fa-search" style="font-size:48px;margin-bottom:20px;"></i>
      <h3>No Parks Found</h3>
      <p>Try adjusting your filters or search location</p>
    </div>
  `;
}

function createParkCardHTML(park) {
  const distanceText = park.distance !== undefined ? `${park.distance.toFixed(1)} km away` : 'Distance unknown';
  const facilitiesHTML = (park.facilities || []).map((facility) => `<span class="feature-tag">${facility}</span>`).join('');
  const offLeashHTML = park.isOffLeash ? '<span class="feature-tag off-leash">Off-Leash Area</span>' : '';
  const packed = base64EncodeUnicode(JSON.stringify({
    id: park.id || park.name,
    name: park.name,
    address: park.address || '',
    suburb: park.suburb || '',
    lat: park.coordinates[1],
    lng: park.coordinates[0],
    facilities: park.facilities || []
  }));

  return `
    <div class="park-card">
      <h3>${park.name}</h3>
      <div class="park-distance">${distanceText}${park.suburb ? ` • ${park.suburb}` : ''}</div>
      <div class="park-features">${facilitiesHTML}${offLeashHTML}</div>
      ${park.address ? `<div class="park-address">${park.address}</div>` : ''}
      <div class="park-actions">
        <button class="view-details-btn" onclick="window.location.href='Full_Details.html?park=${packed}'">View Details</button>
        <button class="get-directions-btn" onclick="getDirections(${park.coordinates[1]}, ${park.coordinates[0]}, '${park.name.replace(/'/g, "\\'")}')">Get Directions</button>
      </div>
    </div>
  `;
}

// --- Guided search --------------------------------------------------------

function openGuidedSearch() {
  const modal = document.getElementById('guidedModal');
  if (!modal) return;

  resetGuidedForm();
  modal.classList.add('active');
}

function resetGuidedForm() {
  document.getElementById('guidedStep1')?.classList.remove('hidden');
  document.getElementById('guidedStepSpecific')?.classList.add('hidden');
  document.getElementById('guidedBackBtn')?.classList.add('hidden');
  document.getElementById('guidedApplyBtn')?.classList.add('hidden');

  ['g_size', 'g_time', 'g_offLeash', 'g_fenced', 'g_agility'].forEach((name) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = false;
    });
  });
}

function startGuidedQuickNearby() {
  currentFilters = {};
  syncTopFilterButtons();
  closeModal('guidedModal');
  showListView();
  updateDisplays();
  showNotification('Showing nearby parks without filters');
}

function showGuidedSpecific() {
  document.getElementById('guidedStep1')?.classList.add('hidden');
  document.getElementById('guidedStepSpecific')?.classList.remove('hidden');
  document.getElementById('guidedBackBtn')?.classList.remove('hidden');
  document.getElementById('guidedApplyBtn')?.classList.remove('hidden');
}

function backGuidedToStart() {
  resetGuidedForm();
}

function applyGuidedFilters() {
  const readRadio = (name) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
  };

  const timeChoice = readRadio('g_time');
  const sizeChoice = readRadio('g_size');

  currentFilters = {
    nightLighting: timeChoice === 'Night',
    fenced: readRadio('g_fenced') === 'Yes',
    offLeash: readRadio('g_offLeash') === 'Yes',
    smallDogEnclosure: sizeChoice === 'Small',
    agility: readRadio('g_agility') === 'Yes'
  };

  syncTopFilterButtons();
  closeModal('guidedModal');
  showListView();
  updateDisplays();

  const summary = getActiveFilterLabels();
  showNotification(`Showing nearby parks ${summary.length ? `with ${summary.join(', ')}` : 'with no specific filters'}`);
}

window.openGuidedSearch = openGuidedSearch;
window.startGuidedQuickNearby = startGuidedQuickNearby;
window.showGuidedSpecific = showGuidedSpecific;
window.backGuidedToStart = backGuidedToStart;
window.applyGuidedFilters = applyGuidedFilters;

// --- Map navigation -------------------------------------------------------

function openNavigation() {
  if (!selectedPark) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPark.lat},${selectedPark.lng}`;
  window.open(url, '_blank');
  showNotification(`Opening navigation to ${selectedPark.name}`);
}

function getDirections(lat, lng, parkName) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
  showNotification(`Opening directions to ${parkName}`);
}

function getDirectionsFromMap(lat, lng, parkName) {
  if (!userLocation || !map) {
    getDirections(lat, lng, parkName);
    return;
  }

  if (!directionsService || !directionsRenderer) {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
  }

  directionsService.route(
    {
      origin: userLocation,
      destination: { lat, lng },
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        showNotification(`Directions to ${parkName} displayed on the map`);
      } else {
        getDirections(lat, lng, parkName);
      }
    }
  );
}

window.openNavigation = openNavigation;
window.getDirections = getDirections;
window.getDirectionsFromMap = getDirectionsFromMap;

// --- Authentication -------------------------------------------------------

function showLogin() {
  document.getElementById('loginModal')?.classList.add('active');
}

function login() {
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  if (!email || !password) {
    showNotification('Please enter both email and password');
    return;
  }

  currentUser = {
    email,
    name: email.split('@')[0],
    avatar: FALLBACK_AVATAR
  };

  try {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
  } catch (error) {
    console.warn('Unable to persist user session', error);
  }

  updateLoginStatus();
  closeModal('loginModal');
  showNotification('Login successful');
}

function logout() {
  currentUser = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch (error) {
    console.warn('Unable to clear user session', error);
  }
  updateLoginStatus();
  showNotification('Logged out');
}

function restoreUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.user);
    if (stored) {
      currentUser = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Unable to read stored user', error);
  }
  updateLoginStatus();
}

function updateLoginStatus() {
  const loginBtn = document.querySelector('.login-btn');
  const userProfile = document.getElementById('userProfile');
  if (!loginBtn || !userProfile) return;

  if (currentUser) {
    loginBtn.classList.add('hidden');
    userProfile.classList.remove('hidden');
    const img = userProfile.querySelector('.profile-avatar');
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = FALLBACK_AVATAR;
      };
      img.src = currentUser.avatar || FALLBACK_AVATAR;
    }
  } else {
    loginBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

function showProfile() {
  window.location.href = 'profile.html';
}

window.showLogin = showLogin;
window.login = login;
window.logout = logout;
window.showProfile = showProfile;

// --- Preferences ----------------------------------------------------------

function showPreferences() {
  const modal = document.getElementById('preferencesModal');
  if (!modal) return;

  const list = document.getElementById('savedPreferences');
  if (!list) return;

  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]');
  } catch (error) {
    favorites = [];
  }

  if (!favorites.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:20px;color:#666;">
        <i class="fas fa-heart" style="font-size:48px;margin-bottom:20px;"></i>
        <h3>No Saved Preferences Yet</h3>
        <p>Use "Add to Favorites" on a park to store it here.</p>
      </div>
    `;
  } else {
    list.innerHTML = favorites.map((park, index) => renderFavoriteRow(park, index)).join('');
  }

  modal.classList.add('active');
}

function renderFavoriteRow(favorite, index) {
  const facilities = Array.isArray(favorite.facilities) ? favorite.facilities : [];
  const tags = facilities.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
         ${facilities.map((facility) => `<span style="background:#e3f2fd;color:#1976d2;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap;">${escapeHtml(facility)}</span>`).join('')}
       </div>`
    : '';

  const packed = base64EncodeUnicode(JSON.stringify(favorite));

  return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eee;">
      <div style="flex:1;">
        <strong>${escapeHtml(favorite.name || favorite.id || 'Park')}</strong>
        <div style="font-size:12px;color:#666;">${escapeHtml(favorite.suburb || '')}${favorite.address ? ` • ${escapeHtml(favorite.address)}` : ''}</div>
        ${tags}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="primary-btn" style="padding:8px 16px;font-size:14px;" onclick="window.location.href='Full_Details.html?park=${packed}'">View</button>
        <button class="icon-btn" style="padding:6px 8px;border-radius:8px;border:0;background:transparent;cursor:pointer;" title="Remove from favorites" onclick="deleteFavorite(${index})">🗑</button>
      </div>
    </div>
  `;
}

function deleteFavorite(index) {
  openConfirm('Remove this park from favorites? This cannot be undone.').then((confirmed) => {
    if (!confirmed) return;
    let favorites = [];
    try {
      favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]');
    } catch (error) {
      favorites = [];
    }
    favorites.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    showPreferences();
  });
}

window.showPreferences = showPreferences;
window.deleteFavorite = deleteFavorite;

// --- Modals ---------------------------------------------------------------

function showAbout() {
  document.getElementById('aboutModal')?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function showNotification(message) {
  if (!message) return;
  console.log(message);
  const banner = document.getElementById('appNotification');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.add('visible');
  clearTimeout(showNotification.timer);
  showNotification.timer = setTimeout(() => banner.classList.remove('visible'), 4000);
}

function base64EncodeUnicode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    return btoa(str);
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

function isWithinBrisbane(lat, lng) {
  return lat >= BRISBANE_BOUNDS.south && lat <= BRISBANE_BOUNDS.north &&
         lng >= BRISBANE_BOUNDS.west && lng <= BRISBANE_BOUNDS.east;
}

// --- Confirm modal --------------------------------------------------------

function setupConfirmModal() {
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');
  if (confirmYes) {
    confirmYes.addEventListener('click', () => {
      if (confirmResolve) confirmResolve(true);
      confirmResolve = null;
      closeConfirm();
    });
  }
  if (confirmNo) {
    confirmNo.addEventListener('click', () => {
      if (confirmResolve) confirmResolve(false);
      confirmResolve = null;
      closeConfirm();
    });
  }
}

function openConfirm(text) {
  const modal = document.getElementById('confirm');
  const message = document.getElementById('confirmText');
  if (message) {
    message.textContent = text || 'Are you sure?';
  }
  modal?.classList.remove('hidden');
  modal?.classList.add('active');
  modal?.setAttribute('aria-hidden', 'false');
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function closeConfirm() {
  const modal = document.getElementById('confirm');
  modal?.classList.add('hidden');
  modal?.classList.remove('active');
  modal?.setAttribute('aria-hidden', 'true');
  if (confirmResolve) {
    confirmResolve(false);
    confirmResolve = null;
  }
}

function expandParkDetails() {
  showNotification('Opening full park details...');
  closeModal('parkDetailsPopup');
}

window.showAbout = showAbout;
window.closeModal = closeModal;
window.openConfirm = openConfirm;
window.closeConfirm = closeConfirm;
window.showHomePage = showHomePage;
window.showMapView = showMapView;
window.showListView = showListView;
window.useCurrentLocation = useCurrentLocation;
window.searchLocation = searchLocation;
window.clearSearch = clearSearch;
window.openNavigation = openNavigation;
window.toggleFloatingFilter = toggleFloatingFilter;
window.showFilterPopup = showFilterPopup;
window.applyFilter = applyFilter;
window.expandParkDetails = expandParkDetails;
