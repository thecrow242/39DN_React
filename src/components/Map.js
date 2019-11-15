import React from 'react';
import L from 'leaflet';
import LayerItem from './LayerItem'

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
    state = {
        results: []
    }
    
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


    loadGeoJSON(lyrId, myMap, loadedCB, generateCB) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', layers[lyrId].url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.responseType = 'json';
        xhr.onload = function() {
            if (xhr.status === 200) {
                loadedCB(xhr.response, lyrId, generateCB, myMap);
            }
        };
        xhr.send();
    }

    loadedGeoJSON(data, lyrId, generateCB, myMap) {
        layers[lyrId].lyr = L.geoJSON(data, {
            style: function (feature) {
                return {color: layers[lyrId].color};
        }}).on('click', function(e) {
            var f = e.layer.feature.properties;
            generateCB(f, e.latlng, myMap);
        });

        layers[lyrId].lyr.addTo(myMap);
    }

    loadLayer = (layerId, event) => {
        if(event.target.checked) {
            this.loadGeoJSON(
                layerId,
                this.mainMap,
                this.loadedGeoJSON,
                this.generatePopup)
        }
        else {
            layers[layerId].lyr.remove();
        }
    }

    generatePopup(props, latlng, myMap) {
        // create the API URL to query the census.gov site
        let url = censusBaseUrl;
        url += 'get=' + censusGetFields;
        url += '&for=';

        let state = String(props.STATE);
        while(state.length < 2)
            state = '0' + state;
        // different URL setup for county vs state
        if(props.hasOwnProperty('COUNTY')) {
            let county = String(props.COUNTY);
            while(county.length < 3)
                county = '0' + county;
    
            url += 'county:' + county + '&in=state:' + state;
        }
        else {
            url += 'state:' + state;
        }

        url += '&key=' + censusToken;

        fetch(url)
            .then(function(response) {
                response.json()
                    .then(function(data) {
                        // simple results display
                        // column order: LAN7,LAN,EST,LANLABEL,NAME

                        const locName = data[1][4];
                        let html = '<table><tr><th colspan="2" style="text-align: center">' + locName + '</th></tr>';
                        for(let a = 1; a < data.length; a++)
                        {
                            // weird results, just requesting LAN7 omits spanish, so
                            //   include LAN and look for LAN7 1-7 or LAN 625
                            if( parseInt(data[a][0]) !== 0 || parseInt(data[a][1]) === 625 )
                                html += '<tr><td>' + data[a][3] + ':</td><td>' + data[a][2] + '</td></tr>';
                        }
                        html += '</table>';
                        
                        L.popup()
                            .setLatLng(latlng)
                            .setContent(html)
                            .openOn(myMap);
                    })
                    .catch(function(err) {
                        L.popup()
                            .setLatLng(latlng)
                            .setContent('<p>Error: No language data for the selected area</p>')
                            .openOn(myMap);
                    });
            });
    }

}


export default Map;