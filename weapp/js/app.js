
/**
 * COLOMBIA - DIVISIÓN ADMINISTRATIVA
 * Visualización de departamentos y municipios
 * Leaflet + GeoServer WMS/WFS
 */

// =====================================================
// 1. CONFIGURACIÓN
// =====================================================

const GEOSERVER_URL = 'http://localhost:8080/geoserver/taller/wms';
const WFS_URL = 'http://localhost:8080/geoserver/taller/wfs';

const MAP_CONFIG = {
    center: [4.5709, -74.2973],
    zoom: 6,
    minZoom: 5,
    maxZoom: 18
};

// =====================================================
// 2. INICIALIZACIÓN DEL MAPA
// =====================================================

const map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true
});

// =====================================================
// 3. CAPAS BASE
// =====================================================

const baseLayers = {

    'Mapa base (OpenStreetMap)': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    ),

    'Satélite (Esri)': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 18
        }
    ),

    'Calles (CartoDB)': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }
    )
};

// Mapa base predeterminado
baseLayers['Mapa base (OpenStreetMap)'].addTo(map);

// =====================================================
// 4. CAPAS WMS DE GEOSERVER
// =====================================================

const departamentosWMS = L.tileLayer.wms(GEOSERVER_URL, {
    layers: 'taller:departamentos',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: 'IGAC - Instituto Geográfico Agustín Codazzi'
});

const municipiosWMS = L.tileLayer.wms(GEOSERVER_URL, {
    layers: 'taller:municipios',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: 'IGAC - Instituto Geográfico Agustín Codazzi'
});

// Departamentos visibles inicialmente
departamentosWMS.addTo(map);

// =====================================================
// 5. VARIABLES WFS Y ETIQUETAS
// =====================================================

let departamentosGeoJSON = null;
let departamentosData = null;

// Grupo de etiquetas independientes
const etiquetasDepartamentos = L.layerGroup();

// =====================================================
// 6. ESTILOS DE LOS DEPARTAMENTOS
// =====================================================

function featureStyle() {
    return {
        color: '#263238',
        weight: 1.5,
        opacity: 0.9,
        fillColor: '#e8f881',
        fillOpacity: 0.18
    };
}

function highlightStyle() {
    return {
        color: '#1565c0',
        weight: 3,
        fillColor: '#90caf9',
        fillOpacity: 0.45
    };
}

// =====================================================
// 7. FUNCIONES AUXILIARES
// =====================================================

function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getDepartmentName(properties) {
    return properties?.dpto_cnmbr ||
        properties?.nombre ||
        properties?.NOMBRE ||
        'Departamento sin nombre';
}

function getDepartmentCode(properties) {
    return properties?.dpto_ccdgo ||
        properties?.codigo ||
        properties?.CODIGO ||
        'No disponible';
}

// =====================================================
// 8. CREAR ETIQUETAS DE DEPARTAMENTOS
// =====================================================

// Las etiquetas se generan a partir de los datos WFS.
// No requieren un estilo adicional en GeoServer.

function createDepartmentLabels(data) {

    etiquetasDepartamentos.clearLayers();

    data.features.forEach(feature => {

        if (!feature.geometry) return;

        const temporaryLayer = L.geoJSON(feature);
        const bounds = temporaryLayer.getBounds();

        if (!bounds.isValid()) return;

        const name = getDepartmentName(feature.properties);

        const labelIcon = L.divIcon({

            className: 'department-label-container',

            html: `<span class="department-label">${escapeHTML(name)}</span>`,

            iconSize: [140, 24],

            iconAnchor: [70, 12]

        });

        L.marker(bounds.getCenter(), {

            icon: labelIcon,

            interactive: false,

            keyboard: false,

            zIndexOffset: 1000

        }).addTo(etiquetasDepartamentos);

    });

}

// =====================================================
// 9. CONTROL DE INFORMACIÓN
// =====================================================

const infoControl = L.control({
    position: 'topleft'
});

infoControl.onAdd = function () {

    this._div = L.DomUtil.create('div', 'info-control');

    this.update();

    return this._div;

};

infoControl.update = function (properties) {

    const content = properties

        ? `<h4>Información del departamento</h4>
           <p class="highlight">${escapeHTML(getDepartmentName(properties))}</p>
           <p><strong>Código:</strong> ${escapeHTML(getDepartmentCode(properties))}</p>`

        : '<h4>Información del departamento</h4><p>Pasa el cursor sobre un departamento.</p>';

    this._div.innerHTML = content;

};

infoControl.addTo(map);

function updateInfoControl(properties) {

    infoControl.update(properties);

}

// =====================================================
// 10. INTERACTIVIDAD DE LOS DEPARTAMENTOS
// =====================================================

function onEachFeature(feature, layer) {

    const properties = feature.properties || {};

    const name = escapeHTML(getDepartmentName(properties));

    const code = escapeHTML(getDepartmentCode(properties));

    // Ventana emergente
    layer.bindPopup(

        `<div class="popup-title">${name}</div>
         <div class="popup-divider"></div>
         <div class="popup-info"><strong>Código:</strong> ${code}</div>`

    );

    // Eventos del mouse
    layer.on({

        mouseover: function (event) {

            event.target.setStyle(highlightStyle());

            event.target.bringToFront();

            updateInfoControl(properties);

        },

        mouseout: function (event) {

            if (departamentosGeoJSON) {

                departamentosGeoJSON.resetStyle(event.target);

            }

            updateInfoControl();

        },

        click: function (event) {

            map.fitBounds(event.target.getBounds());

            event.target.openPopup();

        }

    });

}

// =====================================================
// 11. CARGAR DEPARTAMENTOS DESDE WFS
// =====================================================

async function loadDepartamentosWFS() {

    const params = new URLSearchParams({

        service: 'WFS',

        version: '2.0.0',

        request: 'GetFeature',

        typeNames: 'taller:departamentos',

        outputFormat: 'application/json',

        srsName: 'EPSG:4326'

    });

    const url = `${WFS_URL}?${params.toString()}`;

    try {

        console.log('Consultando departamentos WFS...');

        const response = await fetch(url);

        if (!response.ok) {

            throw new Error(
                `GeoServer respondió con HTTP ${response.status}`
            );

        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {

            throw new Error(
                'El servicio WFS no devolvió departamentos.'
            );

        }

        departamentosData = data;

        // Crear capa interactiva
        if (departamentosGeoJSON) {

            map.removeLayer(departamentosGeoJSON);

        }

        departamentosGeoJSON = L.geoJSON(data, {

            style: featureStyle,

            onEachFeature: onEachFeature

        });

        console.log(
            `Departamentos cargados: ${data.features.length}`
        );

        // Crear etiquetas
        createDepartmentLabels(data);

        updateInfoControl();

        // Incorporar capa WFS al control
        layerControl.addOverlay(
            departamentosGeoJSON,
            'Departamentos interactivos (WFS)'
        );

        // Ajustar vista
        const bounds = departamentosGeoJSON.getBounds();

        if (bounds.isValid()) {

            map.fitBounds(bounds, {
                padding: [15, 15]
            });

        }

    } catch (error) {

        console.error('Error al cargar WFS:', error);

        updateInfoControl();

        showStatusMessage(
            'No fue posible cargar los departamentos WFS. Verifica GeoServer y el servicio WFS.'
        );

    }

}

// =====================================================
// 12. CONTROL DE CAPAS
// =====================================================

const overlayLayers = {

    'Departamentos (WMS)': departamentosWMS,

    'Departamentos con etiquetas': etiquetasDepartamentos,

    'Municipios (WMS)': municipiosWMS

};

const layerControl = L.control.layers(

    baseLayers,

    overlayLayers,

    {
        position: 'topright',
        collapsed: false
    }

).addTo(map);

// =====================================================
// 13. CONTROL DE ESCALA
// =====================================================

L.control.scale({

    position: 'bottomleft',

    metric: true,

    imperial: false,

    maxWidth: 200

}).addTo(map);

// =====================================================
// 14. MENSAJES DE ESTADO
// =====================================================

function showStatusMessage(message) {

    console.warn(message);

    const results = document.getElementById('search-results');

    if (results) {

        results.innerHTML =
            `<p class="info-text">${escapeHTML(message)}</p>`;

    }

}

// =====================================================
// 15. BÚSQUEDA DE DEPARTAMENTOS
// =====================================================

function initializeSearch() {

    const searchButton = document.getElementById('search-button');

    const searchInput = document.getElementById('search-input');

    const searchResults = document.getElementById('search-results');

    if (!searchButton || !searchInput || !searchResults) {

        console.warn(
            'No se encontraron los elementos HTML de búsqueda.'
        );

        return;

    }

    // Ejecutar búsqueda
    function performSearch() {

        const searchTerm = searchInput.value.trim().toLocaleLowerCase('es');

        if (!searchTerm) {

            searchResults.innerHTML =
                '<p class="info-text">Escribe el nombre de un departamento.</p>';

            return;

        }

        if (!departamentosData?.features) {

            searchResults.innerHTML =
                '<p class="info-text">Los departamentos aún se están cargando.</p>';

            return;

        }

        const matches = departamentosData.features.filter(feature =>

            getDepartmentName(feature.properties)
                .toLocaleLowerCase('es')
                .includes(searchTerm)

        );

        if (matches.length === 0) {

            searchResults.innerHTML =
                '<p class="info-text">No se encontraron departamentos.</p>';

            return;

        }

        searchResults.innerHTML =

            `<h3 style="font-size:0.9rem; margin-bottom:0.5rem;">
                Resultados (${matches.length})
            </h3>` +

            matches.map(feature => {

                const name = escapeHTML(
                    getDepartmentName(feature.properties)
                );

                const code = escapeHTML(
                    getDepartmentCode(feature.properties)
                );

                return `

                    <div class="search-result-item" data-code="${code}">

                        <strong>${name}</strong><br>

                        <small>Código: ${code}</small>

                    </div>

                `;

            }).join('');

        // Eventos de los resultados
        searchResults
            .querySelectorAll('.search-result-item')
            .forEach(item => {

                item.addEventListener('click', function () {

                    zoomToDepartment(this.dataset.code);

                });

            });

    }

    // Acercar al departamento seleccionado
    function zoomToDepartment(code) {

        if (!departamentosGeoJSON) return;

        departamentosGeoJSON.eachLayer(layer => {

            if (
                String(getDepartmentCode(layer.feature.properties)) ===
                String(code)
            ) {

                if (!map.hasLayer(departamentosGeoJSON)) {

                    departamentosGeoJSON.addTo(map);

                }

                map.fitBounds(layer.getBounds());

                layer.openPopup();

                layer.setStyle(highlightStyle());

                window.setTimeout(() => {

                    departamentosGeoJSON?.resetStyle(layer);

                }, 1800);

            }

        });

    }

    // Eventos de búsqueda
    searchButton.addEventListener('click', performSearch);

    searchInput.addEventListener('keydown', function (event) {

        if (event.key === 'Enter') {

            performSearch();

        }

    });

}

// =====================================================
// 16. INICIALIZACIÓN DE LA APLICACIÓN
// =====================================================

document.addEventListener('DOMContentLoaded', initializeSearch);

window.addEventListener('load', function () {

    console.log(
        'Aplicación de división administrativa de Colombia iniciada.'
    );

    console.log('GeoServer WMS:', GEOSERVER_URL);

    console.log('GeoServer WFS:', WFS_URL);

    loadDepartamentosWFS();

});

// =====================================================
// 17. ESTADO DE CONEXIÓN
// =====================================================

window.addEventListener('online', function () {

    console.log('Conexión restaurada.');

});

window.addEventListener('offline', function () {

    showStatusMessage(
        'Sin conexión a internet. Los mapas base externos pueden no estar disponibles.'
    );

});

// =====================================================
// 18. MENSAJES DE CONSOLA
// =====================================================

console.log(
    '%cAplicación de Servicios Web Geográficos',
    'color: #667eea; font-size: 16px; font-weight: bold'
);

console.log('Centro del mapa:', MAP_CONFIG.center);

console.log('Zoom inicial:', MAP_CONFIG.zoom);
