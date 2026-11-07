
// ============================================
// COLOMBIA - DIVISIÓN ADMINISTRATIVA
// Leaflet + GeoServer WMS
// ============================================

const GEOSERVER_URL = 'http://localhost:8081/geoserver/taller/wms';

// Inicializar mapa
const map = L.map('map', {
    center: [4.5709, -74.2973],
    zoom: 6,
    minZoom: 5,
    maxZoom: 18
});

// ============================================
// MAPAS BASE
// ============================================

const osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }
);

const satelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Esri',
        maxZoom: 18
    }
);

const carto = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }
);

// Activar mapa base
osm.addTo(map);

// ============================================
// CAPAS WMS
// ============================================

const departamentos = L.tileLayer.wms(GEOSERVER_URL, {
    layers: 'taller:departamentos',
    format: 'image/png',
    transparent: true,
    version: '1.1.1'
});

// Mostrar departamentos inicialmente
departamentos.addTo(map);

// ============================================
// CAPAS DISPONIBLES
// ============================================

const mapasBase = {
    'OpenStreetMap': osm,
    'Satélite Esri': satelite,
    'Calles CartoDB': carto
};

const capas = {
    'Departamentos': departamentos,
    
};

// Control de capas
L.control.layers(
    mapasBase,
    capas,
    {
        position: 'topright',
        collapsed: false
    }
).addTo(map);

// ============================================
// ESCALA
// ============================================

L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false
}).addTo(map);

// ============================================
// MENSAJES DE CONSOLA
// ============================================

console.log('Aplicación Colombia iniciada.');
console.log('GeoServer:', GEOSERVER_URL);
