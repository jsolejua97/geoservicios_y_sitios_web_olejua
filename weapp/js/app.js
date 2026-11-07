/**
 * Aplicación de Visualización de Departamentos y Municipios de Colombia
 * Curso de Servicios Web Geográficos
 */

// ============================================
// Configuración Global
// ============================================

// URL de GeoServer (cambiar según tu configuración)
const GEOSERVER_URL = 'http://localhost:8080/geoserver/taller/wms';
const WFS_URL = 'http://localhost:8080/geoserver/taller/wfs';

// Configuración del mapa
const MAP_CONFIG = {
    center: [4.5709, -74.2973], // Centro de Colombia
    zoom: 6,
    minZoom: 5,
    maxZoom: 18
};

// ============================================
// Inicialización del Mapa
// ============================================

// Crear el mapa
const map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true
});

// ============================================
// Capas Base
// ============================================

const baseLayers = {
    'Mapa base (OSM)': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }),

    'Satélite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
    }),

    'Calles (CartoDB)': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    })
};

// Agregar capa base por defecto
baseLayers['Mapa base (OSM)'].addTo(map);

// ============================================
// Capas WMS de GeoServer
// ============================================

const departamentosWMS = L.tileLayer.wms(GEOSERVER_URL, {
    layers: 'taller:departamentos',
    format: 'image/png',
    transparent: true,
    attribution: 'IGAC - Instituto Geográfico Agustín Codazzi',
    styles: ''
});

const municipiosWMS = L.tileLayer.wms(GEOSERVER_URL, {
    layers: 'taller:municipios',
    format: 'image/png',
    transparent: true,
    attribution: 'IGAC',
    styles: ''
});

// Agregar departamentos por defecto
departamentosWMS.addTo(map);

// ============================================
// Capa WFS (GeoJSON) para Interactividad
// ============================================

let departamentosGeoJSON = null;
let departamentosData = null;

// Función para cargar departamentos desde WFS
function loadDepartamentosWFS() {
    const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=taller:departamentos&outputFormat=application/json`;

    fetch(wfsUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar datos WFS');
            }
            return response.json();
        })
        .then(data => {
            departamentosData = data;

            // Crear capa GeoJSON con estilo y eventos
            departamentosGeoJSON = L.geoJSON(data, {
                style: featureStyle,
                onEachFeature: onEachFeature
            }).addTo(map);

            // Ajustar vista al extent de los datos
            map.fitBounds(departamentosGeoJSON.getBounds());

            console.log('Departamentos cargados:', data.features.length);
        })
        .catch(error => {
            console.error('Error cargando WFS:', error);
            alert('No se pudieron cargar los datos de departamentos. Verifica que GeoServer esté ejecutándose en ' + WFS_URL);
        });
}

// Estilo de las features
function featureStyle(feature) {
    return {
        fillColor: '#e8f881',
        weight: 2,
        opacity: 0.8,
        color: '#232323',
        fillOpacity: 0.4
    };
}

// Estilo al pasar el mouse (highlight)
function highlightStyle() {
    return {
        weight: 4,
        color: '#667eea',
        fillOpacity: 0.7
    };
}

// ============================================
// Interactividad de Features
// ============================================

function onEachFeature(feature, layer) {
    // Crear popup con información
    if (feature.properties) {
        const props = feature.properties;
        const popupContent = `
            <div class="popup-title">${props.dpto_cnmbr || 'Sin nombre'}</div>
            <div class="popup-divider"></div>
            <div class="popup-info"><strong>Código:</strong> ${props.dpto_ccdgo || 'N/A'}</div>
        `;
        layer.bindPopup(popupContent);
    }

    // Eventos del mouse
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: clickFeature
    });
}

// Highlight al pasar el mouse
function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle(highlightStyle());
    layer.bringToFront();

    // Actualizar panel de información
    if (layer.feature.properties) {
        updateInfoControl(layer.feature.properties);
    }
}

// Resetear estilo al salir
function resetHighlight(e) {
    const layer = e.target;

    if (departamentosGeoJSON) {
        departamentosGeoJSON.resetStyle(layer);
    }

    // Resetear panel de información
    updateInfoControl();
}

// Click en feature
function clickFeature(e) {
    const layer = e.target;
    map.fitBounds(layer.getBounds());
    layer.openPopup();
}

// ============================================
// Control de Capas
// ============================================

const overlayLayers = {
    'Departamentos (WMS)': departamentosWMS,
    'Municipios (WMS)': municipiosWMS,
    'Departamentos Interactivos (WFS)': departamentosGeoJSON
};

const layerControl = L.control.layers(baseLayers, overlayLayers, {
    position: 'topright',
    collapsed: false
}).addTo(map);

// ============================================
// Control de Información
// ============================================

const infoControl = L.control({position: 'topleft'});

infoControl.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info-control');
    this.update();
    return this._div;
};

infoControl.update = function (props) {
    this._div.innerHTML = '<h4>Información del Departamento</h4>' +
        (props ?
            '<p class="highlight">' + props.dpto_cnmbr + '</p>' +
            '<p><strong>Código:</strong> ' + props.dpto_ccdgo + '</p>'
            : '<p>Pasa el cursor sobre un departamento</p>');
};

infoControl.addTo(map);

// Función auxiliar para actualizar el control
function updateInfoControl(props) {
    infoControl.update(props);
}

// ============================================
// Control de Escala
// ============================================

L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 200
}).addTo(map);

// ============================================
// Búsqueda de Departamentos
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (searchButton && searchInput) {
        // Búsqueda al hacer clic
        searchButton.addEventListener('click', performSearch);

        // Búsqueda al presionar Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();

        if (!searchTerm) {
            searchResults.innerHTML = '<p class="info-text">Por favor ingresa un nombre de departamento</p>';
            return;
        }

        if (!departamentosData || !departamentosData.features) {
            searchResults.innerHTML = '<p class="info-text">Los datos aún no se han cargado. Espera un momento.</p>';
            return;
        }

        // Buscar departamentos que coincidan
        const matches = departamentosData.features.filter(feature => {
            const nombre = feature.properties.dpto_cnmbr || '';
            return nombre.toLowerCase().includes(searchTerm);
        });

        // Mostrar resultados
        if (matches.length === 0) {
            searchResults.innerHTML = '<p class="info-text">No se encontraron resultados</p>';
        } else {
            let html = '<h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Resultados (' + matches.length + '):</h3>';

            matches.forEach(feature => {
                const nombre = feature.properties.dpto_cnmbr;
                const codigo = feature.properties.dpto_ccdgo;

                html += `
                    <div class="search-result-item" data-codigo="${codigo}">
                        <strong>${nombre}</strong><br>
                        <small>Código: ${codigo}</small>
                    </div>
                `;
            });

            searchResults.innerHTML = html;

            // Agregar evento click a los resultados
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', function() {
                    const codigo = this.getAttribute('data-codigo');
                    zoomToDepartamento(codigo);
                });
            });
        }
    }

    function zoomToDepartamento(codigo) {
        if (!departamentosGeoJSON) return;

        departamentosGeoJSON.eachLayer(function(layer) {
            if (layer.feature.properties.dpto_ccdgo === codigo) {
                map.fitBounds(layer.getBounds());
                layer.openPopup();

                // Highlight temporal
                layer.setStyle(highlightStyle());
                setTimeout(() => {
                    departamentosGeoJSON.resetStyle(layer);
                }, 2000);
            }
        });
    }
});

// ============================================
// Inicialización
// ============================================

// Cargar datos WFS al cargar la página
window.addEventListener('load', function() {
    console.log('Iniciando aplicación...');
    loadDepartamentosWFS();
});

// ============================================
// Manejo de Errores de Red
// ============================================

window.addEventListener('online', function() {
    console.log('Conexión restaurada');
});

window.addEventListener('offline', function() {
    console.log('Conexión perdida');
    alert('No hay conexión a internet. Algunas funcionalidades pueden no estar disponibles.');
});

// ============================================
// Mensajes de consola
// ============================================

console.log('%c🗺️ Aplicación de Servicios Web Geográficos', 'color: #667eea; font-size: 16px; font-weight: bold');
console.log('%cConfiguración:', 'color: #764ba2; font-weight: bold');
console.log('- GeoServer WMS:', GEOSERVER_URL);
console.log('- GeoServer WFS:', WFS_URL);
console.log('- Centro del mapa:', MAP_CONFIG.center);
console.log('- Zoom inicial:', MAP_CONFIG.zoom);