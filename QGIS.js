const USERS_API = 'https://script.google.com/macros/s/AKfycbzQ22U0LCoA4zyoDM3Fn8j92r2ICf-m4lNm02dtRqaxlB_YryJhyokj3GggrIpvgYCw/exec';

const callApi = async (url) => {
    try {
        const res = await fetch(url);
        const list = await res.json();

        list.forEach((data, i) => {
            const geojsonData = {
                type: 'FeatureCollection',
                features: [],
            };

            const featuresData = data.centerPint.map((feature) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: feature.coordinates,
                },
                properties: {
                    name: feature.centerName,
                },
            }));
            geojsonData.features.push(...featuresData);

            map.addSource(data.name, {
                type: 'geojson',
                data: geojsonData,
            });

            map.addLayer({
                id: data.name,
                type: 'circle',
                source: data.name,
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#B42222',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#FFFFFF',
                },
            });

            map.addLayer({
                id: data.name + 'symbol',
                type: 'symbol',
                source: data.name,
                layout: {
                    // get the title name from the source's "title" property
                    'text-field': ['get', 'name'],
                    'text-offset': [0, 1.25],
                    'text-anchor': 'top',
                },
            });

            map.on('click', data.name, (e) => {
                // Copy coordinates array.
                const coordinates = e.features[0].geometry.coordinates;
                const description = e.features[0].properties.name;

                new maplibregl.Popup().setLngLat(coordinates).setHTML(`<h1>${description}</h1>`).addTo(map);
            });

            // Change the cursor to a pointer when the mouse is over the places layer.
            map.on('mouseenter', data.name, () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // Change it back to a pointer when it leaves.
            map.on('mouseleave', data.name, () => {
                map.getCanvas().style.cursor = '';
            });
        });
    } catch (error) {
        console.log(error.message);
    } finally {
    }
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
    callApi(USERS_API);
});
