import React from 'react';
import L from 'leaflet';
import LayerItem from './LayerItem';

const mapboxURL = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
const mapboxToken = 'pk.eyJ1IjoiY2hyaXNodXNzZXkiLCJhIjoiY2syejV5ejkwMDk0OTNjcWkxNDdrbmQweSJ9.3SCs_HzklNJpvd9mJi004w';
const attrStatement = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

const censusBaseUrl = 'https://api.census.gov/data/2013/language?';
const censusGetFields = 'LAN7,LAN,EST,LANLABEL,NAME';
const censusToken = '9b82d5cb0d6e1347ed4d7934ba97f0f9175b3c64';

const layers = [
    { url: '/data/gz_2010_us_outline_20m.json', text: 'US Country Border', color: '#ff0000', enableLookup: false, lyr: null },
    { url: '/data/gz_2010_us_040_00_20m.json', text: 'US State Borders', color: '#00ff00', enableLookup: true, lyr: null },
    { url: '/data/gz_2010_us_050_00_20m.json', text: 'Counties', color: '#6666ff', enableLookup: true, lyr: null },
    { url: '/data/gz_2010_us_500_11_5m.json', text: 'Congressional Districts', color: '#B500B5', enableLookup: false, lyr: null }
];


class Map extends React.Component {
    mainMap = {};

    componentDidMount() {
        // create the toggle-able mapbox base display layers
        var streetMap = this.generateMapboxLayer('mapbox.streets');
        var satelliteMap = this.generateMapboxLayer('mapbox.satellite');

        // create the mapbox view, default location and zoom is center of US
        this.mainMap = L.map('map', {
            center: [39.82, -98.58],
            zoom: 4,
            layers: [
                streetMap,
                satelliteMap
            ]
        });

        // add the toggle-able layers to the default control
        var baseMaps = {
            "Satellite": satelliteMap,
            "Streetview": streetMap
        };

        L.control.layers(baseMaps, null).addTo(this.mainMap);

    }

    render() {
        return (
            <div>
                <div id="map"></div>
                <table id="layerList">
                    <tbody>
                        {layers.map((layer, i) => (
                        <LayerItem
                            key={i}
                            chkId={i}
                            chkText={layers[i].text}
                            fontColor={layers[i].color}
                            handleClick={(event) => {this.loadLayer(i, event) }}
                        />
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    generateMapboxLayer(layerID) {
        return L.tileLayer(mapboxURL, {
            attribution: attrStatement,
            maxZoom: 18,
            id: layerID,
            accessToken: mapboxToken
        });
    }

    loadAndBindLayer(lyrId) {
        fetch(layers[lyrId].url)
            .then(data => data.json())
            .then(mapjson => this.createLeafletLayer(lyrId, mapjson));
    }

    createLeafletLayer(lyrId, data) {
        // create the layer with the color from that layer's setting
        layers[lyrId].lyr = L.geoJSON(data, {
            style: {color: layers[lyrId].color}
        });

        // only perform the census lookup on certain layers
        if(layers[lyrId].enableLookup) {
            layers[lyrId].lyr.on({
                click: this.censusLookup.bind(this)
            });
        }

        layers[lyrId].lyr.addTo(this.mainMap);
    }

    loadLayer = (layerId, event) => {
        if(event.target.checked) {
            this.loadAndBindLayer(
                layerId,
                this.mainMap);
        }
        else {
            layers[layerId].lyr.remove();
        }
    }

    censusLookup(e) {
        const props = e.layer.feature.properties;
        const latlng = e.latlng;

        const url = this.generateCensusUrl(props);
        fetch(url)
            .then(data => data.json())
            .then(censusjson => this.readCensusData(latlng, censusjson))
            .catch(err => this.noDataError(latlng));
    }

    noDataError(latlng) {
        L.popup()
        .setLatLng(latlng)
        .setContent('<p>Error: No language data for the selected area</p>')
        .openOn(this.mainMap);
    }

    readCensusData(latlng, data) {
        // simple results display
        // column order: LAN7,LAN,EST,LANLABEL,NAME

        const locName = data[1][4];
        let html = '<table><tr><th colspan="2" style="text-align: center">' + locName + '</th></tr>';
        // 1st result item is column names, start on 2nd result item
        for(let a = 1; a < data.length; a++)
        {
            // weird results, just requesting LAN7 omits spanish, so
            //   include LAN and look for LAN7=1-7 or LAN=625
            if( parseInt(data[a][0]) !== 0 || parseInt(data[a][1]) === 625 )
                html += '<tr><td>' + data[a][3] + ':</td><td>' + data[a][2] + '</td></tr>';
        }
        html += '</table>';

        // create the leaflet popup
        L.popup()
            .setLatLng(latlng)
            .setContent(html)
            .openOn(this.mainMap);
    }

    generateCensusUrl(props) {
        let url = censusBaseUrl;
        url += 'get=' + censusGetFields;
        url += '&for=';

        let state = this.padZeroes(String(props.STATE), 2);
        // different URL setup for county vs state
        if(props.hasOwnProperty('COUNTY')) {
            let county = this.padZeroes(String(props.COUNTY), 3);
            url += 'county:' + county + '&in=state:' + state;
        }
        else {
            url += 'state:' + state;
        }

        url += '&key=' + censusToken;
        return url;
    }

    padZeroes(val, len) {
        while(val.length < len)
            val = '0' + val
        return val;
    }
}


export default Map;