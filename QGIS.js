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

// filters for classifying earthquakes into five categories based on magnitude
var mag1 = ['<', ['get', 'attendees'], 10];
var mag5 = ['>=', ['get', 'attendees'], 10];

// colors to use for the categories
var colors = ['#fed976', '#e31a1c'];
let totalA = 0;
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
        totalA += data.attendees;
    });

    console.log(totalA);

    map.addSource('qgis', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterRadius: 80,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterProperties: {
            // keep separate counts for each magnitude category in a cluster
            mag1: ['+', ['case', mag1, 1, 0]],
            mag5: ['+', ['case', mag5, 1, 0]],
        },
    });

    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'qgis',
        filter: ['!=', 'cluster', true],
        paint: {
            'circle-color': ['case', mag1, colors[0], colors[4]],
            'circle-opacity': 0.6,
            'circle-radius': 12,
        },
    });

    // map.addLayer({
    //     id: 'cluster-count',
    //     type: 'symbol',
    //     source: 'qgis',
    //     filter: ['!=', 'cluster', true],
    //     layout: {
    //         'text-field': ['number-format', ['get', 'attendees'], { 'min-fraction-digits': 1, 'max-fraction-digits': 1 }],
    //         'text-size': 12,
    //     },
    //     paint: {
    //         'text-color': ['case', ['<', ['get', 'attendees'], 3], 'black', 'white'],
    //     },
    // });

    // 最大値
    let endValue = 0;

    // 開始時間
    let startTime = 0;

    //イージング関数
    const easeOutSine = (x) => {
        return Math.sin((x * Math.PI) / 2);
    };

    const anime = () => {
        progress = Math.min(1, (Date.now() - startTime) / 1200);

        let moveValue = endValue * easeOutSine(progress);

        document
            .querySelector('.chart .mapboxgl-popup-tip')
            .style.setProperty('--value', `conic-gradient(rgb(192, 250, 0) 0%, rgb(192, 250, 0) ` + moveValue + '%, transparent ' + moveValue + '%, transparent 100%)');
        document.querySelector('.chart .mapboxgl-popup-content').innerHTML = `${moveValue.toFixed(0)}%`;

        // 処理を止める
        if (progress < 1) {
            requestAnimationFrame(anime);
        }
    };

    // objects for caching and keeping track of HTML marker objects (for performance)
    var markers = {};
    var markersOnScreen = {};

    function updateMarkers() {
        var newMarkers = {};
        var features = map.querySourceFeatures('qgis');

        // for every cluster on the screen, create an HTML marker for it (if we didn't yet),
        // and add it to the map if it's not there already
        for (var i = 0; i < features.length; i++) {
            var coords = features[i].geometry.coordinates;
            var props = features[i].properties;
            if (!props.cluster) continue;
            var id = props.cluster_id;

            var marker = markers[id];
            if (!marker) {
                var el = createDonutChart(props);
                marker = markers[id] = new maplibregl.Marker({
                    element: el,
                }).setLngLat(coords);
            }
            newMarkers[id] = marker;

            if (!markersOnScreen[id]) marker.addTo(map);
        }
        // for every marker we've added previously, remove those that are no longer visible
        for (id in markersOnScreen) {
            if (!newMarkers[id]) markersOnScreen[id].remove();
        }
        markersOnScreen = newMarkers;
        //   endValue = e.features[0].properties.value;

        //   startTime = Date.now();
        //   anime();
    }

    // after the GeoJSON data is loaded, update markers on the screen and do so on every map move/moveend
    map.on('data', function (e) {
        if (e.sourceId !== 'qgis' || !e.isSourceLoaded) return;

        map.on('move', updateMarkers);
        map.on('moveend', updateMarkers);
        updateMarkers();
    });

    // code for creating an SVG donut chart from feature properties
    function createDonutChart(props) {
        var offsets = [];
        var counts = [props.mag1, props.mag5];
        var total = 0;
        for (var i = 0; i < counts.length; i++) {
            offsets.push(total);
            total += counts[i];
        }
        var fontSize = total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
        var r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
        var r0 = Math.round(r * 0.6);
        var w = r * 2;

        var html = '<div><svg width="' + w + '" height="' + w + '" viewbox="0 0 ' + w + ' ' + w + '" text-anchor="middle" style="font: ' + fontSize + 'px sans-serif; display: block">';

        for (i = 0; i < counts.length; i++) {
            html += donutSegment(offsets[i] / total, (offsets[i] + counts[i]) / total, r, r0, colors[i]);
        }
        html +=
            '<circle cx="' +
            r +
            '" cy="' +
            r +
            '" r="' +
            r0 +
            '" fill="white" /><text dominant-baseline="central" transform="translate(' +
            r +
            ', ' +
            r +
            ')">' +
            total.toLocaleString() +
            '</text></svg></div>';

        var el = document.createElement('div');
        el.innerHTML = html;
        return el.firstChild;
    }

    function donutSegment(start, end, r, r0, color) {
        if (end - start === 1) end -= 0.00001;
        var a0 = 2 * Math.PI * (start - 0.25);
        var a1 = 2 * Math.PI * (end - 0.25);
        var x0 = Math.cos(a0),
            y0 = Math.sin(a0);
        var x1 = Math.cos(a1),
            y1 = Math.sin(a1);
        var largeArc = end - start > 0.5 ? 1 : 0;

        return [
            '<path d="M',
            r + r0 * x0,
            r + r0 * y0,
            'L',
            r + r * x0,
            r + r * y0,
            'A',
            r,
            r,
            0,
            largeArc,
            1,
            r + r * x1,
            r + r * y1,
            'L',
            r + r0 * x1,
            r + r0 * y1,
            'A',
            r0,
            r0,
            0,
            largeArc,
            0,
            r + r0 * x0,
            r + r0 * y0,
            '" fill="' + color + '" />',
        ].join(' ');
    }

    map.addLayer({
        id: 'qgisPoint',
        type: 'circle',
        source: 'qgis',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#e31a1c',
            'circle-radius': 4,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
        },
    });

    map.addLayer({
        id: 'qgisSymbol',
        type: 'symbol',
        source: 'qgis',
        layout: {
            // get the title name from the source's "title" property
            'text-field': ['get', 'hoge'],
            'text-offset': [0, 1.25],
            'text-anchor': 'top',
        },
    });

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
