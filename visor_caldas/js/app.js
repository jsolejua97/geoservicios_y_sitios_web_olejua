
// ======================================================
// 1. CONFIGURACIÓN INICIAL DEL MAPA
// ======================================================

const map = L.map('map').setView([5.30, -75.30], 9);

// ======================================================
// 2. MAPAS BASE
// ======================================================

const osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }
);

const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    }
);

const baseMaps = {
    "OpenStreetMap": osm,
    "Satélite": satellite
};

osm.addTo(map);

// ======================================================
// 3. SERVICIO WMS DEL DANE
// ======================================================

const geoserverUrl =
    'https://portalgis.dane.gov.co/mparcgis/services/MGN2024/Serv_CapasMGN_2024/MapServer/WMSServer';

const departamentosWMS = L.tileLayer.wms(geoserverUrl, {
    layers: '8',
    styles: 'default',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: 'DANE - MGN 2024'
}).addTo(map);

const municipiosWMS = L.tileLayer.wms(geoserverUrl, {
    layers: '7',
    styles: 'default',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: 'DANE - MGN 2024'
});

// ======================================================
// 4. ESTILOS DE LAS CAPAS GEOJSON
// ======================================================

const estilos = {

    Bosque: {
        color: '#176B35',
        weight: 2,
        fillColor: '#39A852',
        fillOpacity: 0.55
    },

    Isla: {
        color: '#1677A8',
        weight: 1.5,
        fillColor: '#69C6E8',
        fillOpacity: 0.65
    },

    Curva_Nivel: {
        color: '#A87942',
        weight: 1.3,
        opacity: 0.85
    },

    Drenaje_Sencillo: {
        color: '#168BD2',
        weight: 2,
        opacity: 0.85
    },

    Via: {
        color: '#E56B35',
        weight: 2,
        opacity: 0.9
    }
};

// ======================================================
// 5. CREAR CAPAS GEOJSON
// ======================================================

const rutaDatos = 'datos/17_CALDAS/';

const capas = {};

const nombresCapas = {
    Administrativo_P: 'Divisiones administrativas',
    Bosque: 'Bosques',
    Construccion_P: 'Construcciones',
    Curva_Nivel: 'Curvas de nivel',
    Drenaje_Sencillo: 'Drenaje sencillo',
    Isla: 'Islas',
    Orografia: 'Orografía',
    Via: 'Vías'
};

// Crear capas vacías antes de cargar los archivos
Object.keys(nombresCapas).forEach(nombre => {
    capas[nombre] = L.geoJSON(null, {
        style: function () {
            return estilos[nombre] || {};
        },

        pointToLayer: function (feature, latlng) {

            let color = '#7952A0';

            if (nombre === 'Administrativo_P') {
                color = '#D62828';
            }

            if (nombre === 'Construccion_P') {
                color = '#E69A22';
            }

            if (nombre === 'Orografia') {
                color = '#654321';
            }

            return L.circleMarker(latlng, {
                radius: 6,
                color: '#333333',
                weight: 1,
                fillColor: color,
                fillOpacity: 0.9
            });
        },

        onEachFeature: onEachFeature
    });
});

// ======================================================
// 6. POPUPS Y RESALTADO
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function onEachFeature(feature, layer) {

    if (feature.properties) {

        let contenido = `
            <div style="min-width:200px;max-width:300px">
                <h3>Información geográfica</h3>
                <hr>
                <table>
        `;

        Object.entries(feature.properties).forEach(([campo, valor]) => {

            if (valor !== null && valor !== '') {
                contenido += `
                    <tr>
                        <td><strong>${escaparHTML(campo)}</strong></td>
                        <td>${escaparHTML(valor)}</td>
                    </tr>
                `;
            }
        });

        contenido += `
                </table>
            </div>
        `;

        layer.bindPopup(contenido);
    }

    if (layer.setStyle) {
        layer._estiloOriginal = { ...layer.options };
    }

    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

function highlightFeature(e) {

    const layer = e.target;

    if (layer.setStyle) {
        layer.setStyle({
            color: '#FFFF00',
            weight: 4,
            fillOpacity: 0.8
        });

        if (layer.bringToFront) {
            layer.bringToFront();
        }
    }
}

function resetHighlight(e) {

    const layer = e.target;

    if (layer.setStyle && layer._estiloOriginal) {
        layer.setStyle(layer._estiloOriginal);
    }
}

function zoomToFeature(e) {

    const layer = e.target;

    if (layer.getBounds) {
        map.fitBounds(layer.getBounds(), {
            padding: [30, 30],
            maxZoom: 16
        });
    }
}

// ======================================================
// 7. CARGAR LOS OCHO ARCHIVOS GEOJSON
// ======================================================

const promesasCarga = Object.keys(nombresCapas).map(nombre => {

    const archivo = rutaDatos + nombre + '.geojson';

    return fetch(archivo)
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    `No se pudo cargar ${archivo}: ${response.status}`
                );
            }

            return response.json();
        })
        .then(data => {

            capas[nombre].addData(data);

            console.log(
                `${nombre}: ${data.features.length} elementos cargados`
            );

        })
        .catch(error => {
            console.error(error);
        });
});

// ======================================================
// 8. CONTROL DE CAPAS
// ======================================================

const overlayMaps = {
    "Departamentos - DANE": departamentosWMS,
    "Municipios - DANE": municipiosWMS,

    "Divisiones administrativas": capas.Administrativo_P,
    "Bosques": capas.Bosque,
    "Construcciones": capas.Construccion_P,
    "Curvas de nivel": capas.Curva_Nivel,
    "Drenaje sencillo": capas.Drenaje_Sencillo,
    "Islas": capas.Isla,
    "Orografía": capas.Orografia,
    "Vías": capas.Via
};

const controlLayer = L.control.layers(
    baseMaps,
    overlayMaps,
    {
        collapsed: false
    }
).addTo(map);

// ======================================================
// 9. CARGA Y AJUSTE DE EXTENSIÓN
// ======================================================

Promise.all(promesasCarga).then(() => {

    // Mostrar inicialmente las capas temáticas
    Object.values(capas).forEach(capa => {
        capa.addTo(map);
    });

    // Ajustar el mapa a los datos de Caldas
    let bounds = null;

    Object.values(capas).forEach(capa => {

        if (capa.getLayers().length > 0) {

            const capaBounds = capa.getBounds();

            if (capaBounds.isValid()) {
                if (bounds === null) {
                    bounds = capaBounds;
                } else {
                    bounds.extend(capaBounds);
                }
            }
        }
    });

    if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
            padding: [20, 20]
        });
    }
});

// ======================================================
// 10. CONTROL DE ESCALA
// ======================================================

L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false
}).addTo(map);

// ======================================================
// 11. PANEL DE INFORMACIÓN
// ======================================================

const info = L.control({
    position: 'topleft'
});

info.onAdd = function () {

    this._div = L.DomUtil.create('div', 'info');

    this._div.innerHTML = `
        <h4>Visor Geográfico de Caldas</h4>
        <p>Cartografía temática y administrativa</p>
        <p><small>Datos: DANE y GeoJSON</small></p>
    `;

    return this._div;
};

info.addTo(map);

// ======================================================
// 12. BUSCADOR DE ELEMENTOS GEOGRÁFICOS
// ======================================================

const searchControl = L.control({
    position: 'topright'
});

searchControl.onAdd = function () {

    const div = L.DomUtil.create('div', 'search-control');

    div.innerHTML = `
        <input
            type="text"
            id="search-input"
            placeholder="Buscar lugar..."
        >
        <button id="search-button">Buscar</button>
    `;

    L.DomEvent.disableClickPropagation(div);

    return div;
};

searchControl.addTo(map);

// Buscar en las capas que tienen el campo NOMBRE_GEO
function buscarElemento() {

    const searchInput = document.getElementById('search-input');

    const texto = searchInput.value.trim().toLowerCase();

    if (!texto) {
        return;
    }

    let encontrado = null;

    const capasBusqueda = [
        capas.Administrativo_P,
        capas.Construccion_P,
        capas.Orografia,
        capas.Drenaje_Sencillo,
        capas.Via,
        capas.Isla
    ];

    capasBusqueda.forEach(capa => {

        capa.eachLayer(layer => {

            const propiedades = layer.feature.properties;

            const nombre = propiedades.NOMBRE_GEO || '';

            if (!encontrado && nombre.toLowerCase().includes(texto)) {
                encontrado = layer;
            }
        });
    });

    if (encontrado) {

        map.fitBounds(encontrado.getBounds(), {
            padding: [30, 30],
            maxZoom: 16
        });

        encontrado.openPopup();

    } else {

        alert('No se encontró el elemento: ' + searchInput.value);
    }
}

document.getElementById('search-button')
    .addEventListener('click', buscarElemento);

document.getElementById('search-input')
    .addEventListener('keydown', function (e) {

        if (e.key === 'Enter') {
            buscarElemento();
        }
    });
