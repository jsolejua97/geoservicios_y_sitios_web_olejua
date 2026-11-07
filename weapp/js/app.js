
/**
 * Aplicación de visualización de Departamentos y Municipios de Colombia
 * Fuente oficial: DANE - Marco Geoestadístico Nacional MGN2024
 * Tecnologías: Leaflet, WMS y REST Identify
 */

// =====================================================
// 1. CONFIGURACIÓN DEL SERVICIO DANE
// =====================================================

// Servicio WMS oficial del DANE
const DANE_WMS_URL =
    'https://portalgis.dane.gov.co/mparcgis/services/MGN2024/Serv_CapasMGN_2024/MapServer/WMSServer';

// Servicio REST oficial del DANE
const DANE_REST_URL =
    'https://portalgis.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/MapServer';

// Identificadores WMS
const LAYER_DEPARTAMENTOS = '8';
const LAYER_MUNICIPIOS = '7';

// Identificadores REST
const REST_DEPARTAMENTOS = 319;
const REST_MUNICIPIOS = 317;

// Configuración inicial del mapa
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
// 3. MAPAS BASE
// =====================================================

const baseLayers = {

    'Mapa base - OpenStreetMap': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    ),

    'Satélite - Esri': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 18
        }
    ),

    'Calles - CartoDB': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }
    )

};

// Mapa base inicial
baseLayers['Mapa base - OpenStreetMap'].addTo(map);

// =====================================================
// 4. CAPA WMS DE DEPARTAMENTOS
// =====================================================

const departamentosWMS = L.tileLayer.wms(
    DANE_WMS_URL,
    {
        layers: LAYER_DEPARTAMENTOS,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        attribution: 'DANE - MGN2024',
        opacity: 0.75
    }
);

// =====================================================
// 5. CAPA WMS DE MUNICIPIOS
// =====================================================

const municipiosWMS = L.tileLayer.wms(
    DANE_WMS_URL,
    {
        layers: LAYER_MUNICIPIOS,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        attribution: 'DANE - MGN2024',
        opacity: 0.95
    }
);

// Departamentos visibles inicialmente
departamentosWMS.addTo(map);

// =====================================================
// 6. CONTROL DE CAPAS
// =====================================================

const overlayLayers = {
    'Departamentos - DANE MGN2024': departamentosWMS,
    'Municipios - DANE MGN2024': municipiosWMS
};

L.control.layers(
    baseLayers,
    overlayLayers,
    {
        position: 'topright',
        collapsed: false
    }
).addTo(map);

// =====================================================
// 7. CONTROL DE ESCALA
// =====================================================

L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 200
}).addTo(map);

// =====================================================
// 8. CONSULTA DE INFORMACIÓN AL HACER CLIC
//    Servicio REST IDENTIFY del DANE
// =====================================================


// =====================================================
// 8. CONSULTA DE TODOS LOS ATRIBUTOS DE LAS CAPAS DANE
// =====================================================

// Evitar que los atributos se interpreten como código HTML
function escaparHTML(valor) {
    return String(valor ?? 'Sin información')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Nombres descriptivos para los campos conocidos
const nombresCampos = {
    OBJECTID: 'Identificador del objeto',
    dpto_ccdgo: 'Código del departamento',
    dpto_cnmbr: 'Nombre del departamento',
    dpto_narea: 'Área del departamento',
    dpto_nano: 'Año de referencia',
    mpio_ccdgo: 'Código del municipio',
    mpio_cdpmp: 'Código DANE del municipio',
    mpio_cnmbr: 'Nombre del municipio',
    mpio_crslc: 'Código de clasificación',
    mpio_tipo: 'Tipo de municipio',
    mpio_narea: 'Área del municipio',
    mpio_nano: 'Año de referencia'
};

// Crear tabla con TODOS los atributos recibidos
function crearTablaAtributos(atributos) {

    if (!atributos || Object.keys(atributos).length === 0) {
        return '<p>No hay atributos disponibles.</p>';
    }

    let html = `
        <div style="max-height:350px; overflow-y:auto;">
        <table style="
            width:100%;
            border-collapse:collapse;
            font-family:Arial;
            font-size:12px;
        ">
        <thead>
            <tr style="background:#e8edf0;">
                <th style="padding:8px; border:1px solid #ccc; text-align:left;">
                    Campo
                </th>
                <th style="padding:8px; border:1px solid #ccc; text-align:left;">
                    Información
                </th>
            </tr>
        </thead>
        <tbody>
    `;

    for (const [campo, valor] of Object.entries(atributos)) {

        const nombre = nombresCampos[campo] || campo;

        let valorMostrar = valor;

        if (valorMostrar === null || valorMostrar === undefined || valorMostrar === '') {
            valorMostrar = 'Sin información';
        }

        if (typeof valorMostrar === 'object') {
            valorMostrar = JSON.stringify(valorMostrar);
        }

        html += `
            <tr>
                <td style="
                    padding:7px;
                    border:1px solid #ccc;
                    font-weight:bold;
                    vertical-align:top;
                ">
                    ${escaparHTML(nombre)}
                    <br>
                    <small style="color:#777;">
                        ${escaparHTML(campo)}
                    </small>
                </td>
                <td style="
                    padding:7px;
                    border:1px solid #ccc;
                    vertical-align:top;
                ">
                    ${escaparHTML(valorMostrar)}
                </td>
            </tr>
        `;
    }

    html += `
        </tbody>
        </table>
        </div>
        <p style="font-size:11px;color:#666;">
            Total de campos: ${Object.keys(atributos).length}
        </p>
    `;

    return html;
}

// Consultar información al hacer clic en el mapa
async function consultarInformacion(e) {

    const capasActivas = [];

    if (map.hasLayer(departamentosWMS)) {
        capasActivas.push(REST_DEPARTAMENTOS);
    }

    if (map.hasLayer(municipiosWMS)) {
        capasActivas.push(REST_MUNICIPIOS);
    }

    if (capasActivas.length === 0) {
        return;
    }

    const punto = e.latlng;
    const limites = map.getBounds();
    const tamano = map.getSize();

    const parametros = new URLSearchParams({
        f: 'json',
        geometry: `${punto.lng},${punto.lat}`,
        geometryType: 'esriGeometryPoint',
        sr: '4326',
        layers: `all:${capasActivas.join(',')}`,
        tolerance: '8',
        mapExtent: [
            limites.getWest(),
            limites.getSouth(),
            limites.getEast(),
            limites.getNorth()
        ].join(','),
        imageDisplay: `${tamano.x},${tamano.y},96`,
        returnGeometry: 'false'
    });

    const url = `${DANE_REST_URL}/identify?${parametros.toString()}`;

    const popup = L.popup({
        maxWidth: 420,
        minWidth: 300
    })
    .setLatLng(punto)
    .setContent('Consultando todos los atributos del DANE...')
    .openOn(map);

    try {

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (datos.error) {
            throw new Error(
                datos.error.message || 'Error en la consulta'
            );
        }

        if (!datos.results || datos.results.length === 0) {
            popup.setContent(
                'No se encontraron entidades en este punto. ' +
                'Intenta hacer clic dentro de un departamento o municipio.'
            );
            return;
        }

        let contenido = `
            <div style="font-family:Arial,sans-serif;">
                <h3 style="margin:5px 0 10px;">
                    Información geográfica DANE
                </h3>
        `;

        datos.results.forEach((resultado, indice) => {

            const atributos = resultado.attributes || {};
            const nombreCapa = resultado.layerName || 'Capa DANE';

            contenido += `
                <div style="
                    margin-bottom:12px;
                    padding:8px;
                    background:#f2f5f7;
                    border-radius:5px;
                ">
                    <strong>
                        ${escaparHTML(nombreCapa)}
                    </strong>
                    <br>
                    <small>
                        Entidad ${indice + 1}
                    </small>
                </div>
            `;

            contenido += crearTablaAtributos(atributos);
        });

        contenido += `
            <p style="
                font-size:11px;
                color:#666;
                margin-top:10px;
            ">
                Fuente: DANE - Marco Geoestadístico Nacional MGN2024
            </p>
            </div>
        `;

        popup.setContent(contenido);

    } catch (error) {

        console.error('Error consultando atributos:', error);

        popup.setContent(
            'No fue posible obtener los atributos. ' +
            'Revisa la conexión y la consola del navegador.'
        );
    }
}

// Activar consulta mediante clic en el mapa
map.off('click', consultarInformacion);
map.on('click', consultarInformacion);


// Activar consulta con clic sobre el mapa
map.on('click', consultarInformacion);

// =====================================================
// 9. MANEJO DE ERRORES DE LAS CAPAS WMS
// =====================================================

departamentosWMS.on('tileerror', function(error) {
    console.error('Error cargando departamentos WMS:', error);
});

municipiosWMS.on('tileerror', function(error) {
    console.error('Error cargando municipios WMS:', error);
});

// =====================================================
// 10. MANEJO DE CONEXIÓN
// =====================================================

window.addEventListener('online', function() {
    console.log('Conexión a internet restaurada.');
});

window.addEventListener('offline', function() {
    console.warn('Se perdió la conexión a internet.');
});

// =====================================================
// 11. INICIALIZACIÓN FINAL
// =====================================================

window.addEventListener('load', function() {

    console.log('Aplicación SIG iniciada.');

    console.log('Servicio WMS DANE:', DANE_WMS_URL);

    console.log('Servicio REST DANE:', DANE_REST_URL);

    console.log('Capa departamentos WMS:', LAYER_DEPARTAMENTOS);

    console.log('Capa municipios WMS:', LAYER_MUNICIPIOS);

    console.log('Mapa listo para visualizar Colombia.');

    // Ajustar el tamaño del mapa
    setTimeout(function() {
        map.invalidateSize();
    }, 300);

});

// =====================================================
// FIN DE LA APLICACIÓN
// =====================================================
