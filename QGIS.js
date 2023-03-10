const USERS_API = 'https://script.google.com/macros/s/AKfycbzQ22U0LCoA4zyoDM3Fn8j92r2ICf-m4lNm02dtRqaxlB_YryJhyokj3GggrIpvgYCw/exec';

const getJson = async (url) => {
    try {
        const res = await fetch(url);
        const list = await res.json();
        createGeojson(list);
    } catch (error) {
        console.log(error.message);
    } finally {
    }
};

const createGeojson = (list) => {
    const geojsonData = {
        type: 'FeatureCollection',
        features: [],
    };
    list.forEach((data, i) => {
        const featuresData = data.centerPint.map((feature) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: feature.coordinates,
            },
            properties: {
                name: feature.centerName,
                attendees: data.attendees,
                hoge: data.name,
            },
        }));
        geojsonData.features.push(...featuresData);
    });

    map.addSource('qgis', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'qgis',
        filter: ['has', 'point_count'],
        paint: {
            // Use step expressions (https://maplibre.org/maplibre-gl-js-docs/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 50, '#f28cb1'],
            'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        },
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'qgis',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
        },
    });

    map.addLayer({
        id: 'qgisPoint',
        type: 'circle',
        source: 'qgis',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#11b4da',
            'circle-radius': 4,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
        },
    });

    // map.addLayer({
    //     id: 'qgisSymbol',
    //     type: 'symbol',
    //     source: 'qgis',
    //     layout: {
    //         // get the title name from the source's "title" property
    //         'text-field': ['get', 'hoge'],
    //         'text-offset': [0, 1.25],
    //         'text-anchor': 'top',
    //     },
    // });

    map.on('click', 'qgisPoint', (e) => {
        const coordinates = e.features[0].geometry.coordinates;
        const description = e.features[0].properties.attendees;

        new maplibregl.Popup().setLngLat(coordinates).setHTML(`<h1>${description}</h1>`).addTo(map);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'qgisPoint', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'qgisPoint', () => {
        map.getCanvas().style.cursor = '';
    });
};

map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            'raster-tiles': {
                type: 'raster',
                tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: "地図の出典：<a href='https://www.gsi.go.jp/' target='_blank'>国土地理院</a>",
            },
        },
        layers: [
            {
                id: 'simple-tiles',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 0,
                maxzoom: 24,
                paint: {
                    // 'raster-brightness-max': 0,
                    // 'raster-brightness-min': 1,
                },
            },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    },
    center: [138.410568, 36.206088],
    zoom: 2,
    pitch: 60,
    bearing: 0,
});

map.on('load', () => {
    getJson(USERS_API);
});
