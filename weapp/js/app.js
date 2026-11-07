
// =====================================================
// 1. CONFIGURACIÓN DE GEOSERVER
// =====================================================

const GEOSERVER_WMS = 'http://localhost:8080/geoserver/geoserver/wms';
const GEOSERVER_WFS = 'http://localhost:8080/geoserver/geoserver/ows';

const NOMBRE_CAPA = 'geoserver:departamentos';


// =====================================================
// 2. CREAR MAPA
// =====================================================

const map = L.map('map', {
    center: [4.5709, -74.2973],
    zoom: 6,
    minZoom: 4,
    maxZoom: 18
});


// =====================================================
// 3. MAPAS BASE
// =====================================================

// OpenStreetMap
const mapaBase = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }
);

// Imagen satelital Esri
const mapaSatelital = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
    }
);

// Mapa inicial
mapaBase.addTo(map);


// =====================================================
// 4. CAPA DEPARTAMENTOS WMS
// =====================================================

const departamentosWMS = L.tileLayer.wms(GEOSERVER_WMS, {
    layers: NOMBRE_CAPA,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: 'Fuente: GeoServer - IGAC'
});

// Mostrar capa
departamentosWMS.addTo(map);

// Detectar errores WMS
departamentosWMS.on('tileerror', function(error) {
    console.error('Error cargando teselas WMS:', error);
});


// =====================================================
// 5. GRUPO DE ETIQUETAS
// =====================================================

const etiquetasDepartamentos = L.layerGroup();


// =====================================================
// 6. FUNCIONES PARA LEER ATRIBUTOS
// =====================================================

function obtenerNombre(properties = {}) {

    return properties.dpto_cnmbr ||
           properties.nombre ||
           properties.NOMBRE ||
           properties.departamento ||
           properties.DEPARTAMENTO ||
           'Departamento sin nombre';
}


function obtenerCodigo(properties = {}) {

    return properties.dpto_ccdgo ||
           properties.codigo ||
           properties.CODIGO ||
           properties.cod_dpto ||
           'No disponible';
}


// =====================================================
// 7. CREAR ETIQUETAS
// =====================================================

function crearEtiquetas(data) {

    etiquetasDepartamentos.clearLayers();

    data.features.forEach(feature => {

        if (!feature.geometry) return;

        const poligono = L.geoJSON(feature);
        const bounds = poligono.getBounds();

        if (!bounds.isValid()) return;

        const nombre = obtenerNombre(feature.properties);

        const icono = L.divIcon({

            className: 'department-label-container',

            html: `<span class="department-label">${nombre}</span>`,

            iconSize: [140, 24],

            iconAnchor: [70, 12]

        });

        const marcador = L.marker(bounds.getCenter(), {

            icon: icono,

            interactive: false,

            keyboard: false,

            zIndexOffset: 1000

        });

        marcador.addTo(etiquetasDepartamentos);

    });

}


// =====================================================
// 8. CARGAR DEPARTAMENTOS DESDE WFS
// =====================================================

async function cargarDepartamentos() {

    const parametros = new URLSearchParams({

        service: 'WFS',

        version: '1.0.0',

        request: 'GetFeature',

        typeName: NOMBRE_CAPA,

        outputFormat: 'application/json'

    });

    const url = `${GEOSERVER_WFS}?${parametros.toString()}`;

    try {

        console.log('Consultando departamentos en GeoServer...');

        console.log('WFS:', url);

        const respuesta = await fetch(url);

        if (!respuesta.ok) {

            throw new Error(`Error HTTP ${respuesta.status}`);

        }

        const data = await respuesta.json();

        if (!data.features || data.features.length === 0) {

            throw new Error('GeoServer no devolvió departamentos.');

        }

        console.log(
            'Departamentos recibidos:',
            data.features.length
        );


        // Crear etiquetas
        crearEtiquetas(data);

        etiquetasDepartamentos.addTo(map);


        // =================================================
        // 9. POLÍGONOS INTERACTIVOS
        // =================================================

        const departamentosInteractivos = L.geoJSON(data, {

            style: {

                color: '#263238',

                weight: 1,

                opacity: 0,

                fillOpacity: 0

            },

            onEachFeature: function(feature, layer) {

                const nombre = obtenerNombre(feature.properties);

                const codigo = obtenerCodigo(feature.properties);

                layer.bindPopup(`

                    <div class="popup-title">
                        ${nombre}
                    </div>

                    <p>
                        <strong>Código:</strong> ${codigo}
                    </p>

                    <p>
                        <strong>Departamento:</strong> ${nombre}
                    </p>

                `);

            }

        });


        departamentosInteractivos.addTo(map);


        // =================================================
        // 10. AJUSTAR EXTENSIÓN DEL MAPA
        // =================================================

        const bounds = departamentosInteractivos.getBounds();

        if (bounds.isValid()) {

            map.fitBounds(bounds, {

                padding: [20, 20]

            });

        }

        console.log('Departamentos cargados correctamente.');

    } catch (error) {

        console.error('Error cargando departamentos:', error);

        alert(

            'Error al cargar departamentos:\n\n' +

            error.message +

            '\n\nConsulta la consola del navegador presionando F12.'

        );

    }

}


// =====================================================
// 11. CONTROL DE CAPAS
// =====================================================

const mapasBase = {

    'Mapa de calles': mapaBase,

    'Imagen satelital': mapaSatelital

};

const capasSuperpuestas = {

    'Departamentos': departamentosWMS,

    'Nombres de departamentos': etiquetasDepartamentos

};

L.control.layers(

    mapasBase,

    capasSuperpuestas,

    {

        position: 'topright',

        collapsed: false

    }

).addTo(map);


// =====================================================
// 12. CONTROL DE ESCALA
// =====================================================

L.control.scale({

    position: 'bottomleft',

    metric: true,

    imperial: false

}).addTo(map);


// =====================================================
// 13. INICIAR APLICACIÓN
// =====================================================

window.addEventListener('load', function() {

    console.log('====================================');

    console.log('COLOMBIA - DIVISIÓN ADMINISTRATIVA');

    console.log('====================================');

    console.log('GeoServer WMS:', GEOSERVER_WMS);

    console.log('GeoServer WFS:', GEOSERVER_WFS);

    console.log('Capa:', NOMBRE_CAPA);

    cargarDepartamentos();

});
