import { Component } from '@angular/core';
import ol from 'openlayers';
import { Geolocation, GeolocationOptions, Geoposition, PositionError } from '@ionic-native/geolocation';
import { StationPage } from '../station/station';
import { NavController } from 'ionic-angular';
import 'rxjs/add/observable/interval';
import { Observable } from 'rxjs/Observable';

import * as Popup from 'ol-popup';

import { StationsServiceProvider } from '../../providers/stations-service/stations-service';
import { PistesServiceProvider } from '../../providers/pistes-service/pistes-service'

@Component({
  selector: 'page-accueil',
  templateUrl: 'accueil.html'
})

export class AccueilPage {
  stations;
  map:              ol.Map;
  features:         ol.Feature[];

  pistes;
  layerPistes:      ol.layer.Vector;
  pistesVisibles:   boolean = false;
  boutonPisteActif: boolean = false;

  position:         ol.Feature = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([4.835658999999964, 45.764043])) });
  options:          GeolocationOptions;
  currentPos:       Geoposition;

  constructor(public stationsService: StationsServiceProvider, public navCtrl: NavController, public pistesService: PistesServiceProvider, private geolocation: Geolocation) {
  }

  ionViewDidEnter() {
    this.getPosition();
  }

  ionViewDidLoad() {
    this.position.setStyle(new ol.style.Style({
      image: new ol.style.Icon(/** @type {olx.style.IconOptions} */({
        src: 'assets/icon/geolocation_marker.png'
      }))
    }));
    this.createMap();
    this.getStations();
    this.createPopups();

    Observable.interval(30000).subscribe(() => this.updateStations());
    Observable.interval(5000).subscribe(() => this.updatePosition());
  }

  createMap() {
    this.map = new ol.Map({
      target: "map",
      layers: [
        new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: "https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}/?access_token=pk.eyJ1IjoibWVsYW5pZWxlYSIsImEiOiJjamFkczVuMmgwbm5vMzJvaTY4ZmU2YnhuIn0.SfQ-NCHeu7WgeehCuqMjvA"
          })
        })
      ],
      view: new ol.View({
        center: ol.proj.transform([4.835658999999964, 45.764043], 'EPSG:4326', 'EPSG:3857'),
        zoom: 15,
        enableRotation: false,
      }),
      controls: []
    });
  }

  createPopups() {
    let popup = new Popup();
    this.map.addOverlay(popup);
    this.map.on('click', (evt) => {

      let feature: ol.Feature = this.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        return feature;
      }, { hitTolerance: 10 }); //15 trop grand

      if (feature) {

        //Size > 1 => regroupement de stations
        let size = feature.get('features').length;
        if (size == 1) {

          let clickedFeature = feature.get('features')[0];
          //Vérification station en travaux
          let travaux = clickedFeature.get('available_bike_stands') + clickedFeature.get('available_bikes');
          let status = clickedFeature.get('status');
          //Elements HTML
          let popupContent = document.getElementById('popup');
          let nameStation = document.getElementById('name_station');
          let availableBikes = document.getElementById('avalaible_bikes');
          let availableStands = document.getElementById('available_bikes_stands');
          let stationClosed = document.getElementById('popup-content-closed');
          let stationOpened = document.getElementById('popup-content');

          stationClosed.style.display = 'none';
          stationOpened.style.display = 'inline';

          nameStation.innerHTML = clickedFeature.get('name');
          popupContent.onclick = evt => {
            this.gotoStation(clickedFeature);
          }
          if (travaux > 0 && status == "OPEN") {
            availableBikes.innerHTML = clickedFeature.get('available_bikes');
            availableStands.innerHTML = clickedFeature.get('available_bike_stands');
          } else {
            stationClosed.style.display = 'inline';
            stationOpened.style.display = 'none';
          }

          popupContent.style.display = 'inline';
          popup.show(evt.coordinate, popupContent);
        }
      }
    });

    //Popup cachée lors du dézoom
    this.map.on('moveend', function (evt) {
      if (this.getView().getZoom() < 15) {
        popup.hide();
      }
    });
    this.getPistes();
  }

  gotoStation(station) {
    console.log('go to station');
    this.navCtrl.push(StationPage, { station: station.getProperties() });
  }

  getStations() {
    this.stationsService.getStations().then(data => {
      this.stations = data;

      this.features = (new ol.format.GeoJSON()).readFeatures(this.stations, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      let textFill = new ol.style.Fill({
        color: '#fff'
      });
      let textStroke = new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.6)',
        width: 3
      });

      function createStationStyle(feature) {
        let img: ol.style.Icon;
        let nbTotVelo = feature.get('available_bike_stands') + feature.get('available_bikes');
        let nbVeloDispo = feature.get('available_bikes');

        if (nbVeloDispo == 0) {
          img = new ol.style.Icon(({
            src: 'assets/imgs/icon_vide.png',
            scale: 0.4
          }))
        }
        else if (nbVeloDispo <= Math.trunc(nbTotVelo / 3)) {
          img = new ol.style.Icon(({
            src: 'assets/imgs/icon_presque_vide.png',
            scale: 0.4
          }))
        }
        else if (nbVeloDispo <= 2 * Math.trunc(nbTotVelo / 3)) {
          img = new ol.style.Icon(({
            src: 'assets/imgs/icon_semi_plein.png',
            scale: 0.4
          }))
        }
        else if (nbVeloDispo <= 3 * Math.trunc(nbTotVelo / 3)) {
          img = new ol.style.Icon(({
            src: 'assets/imgs/icon_presque_plein.png',
            scale: 0.4
          }))
        }
        else {
          img = new ol.style.Icon(({
            src: 'assets/imgs/icon_plein.png',
            scale: 0.4
          }))
        }

        return new ol.style.Style({
          geometry: feature.getGeometry(),
          image: img,
        });
      }

      let maxFeatureCount, vector;
      function calculateClusterInfo(resolution) {
        maxFeatureCount = 0;
        let features = vector.getSource().getFeatures();
        let feature, radius;
        for (let i = features.length - 1; i >= 0; --i) {
          feature = features[i];
          let originalFeatures = feature.get('features');
          let extent = ol.extent.createEmpty();
          let j, jj;
          for (j = 0, jj = originalFeatures.length; j < jj; ++j) {
            ol.extent.extend(extent, originalFeatures[j].getGeometry().getExtent());
          }
          maxFeatureCount = Math.max(maxFeatureCount, jj);
          radius = Math.max(10, 0.15 * (ol.extent.getWidth(extent) + ol.extent.getHeight(extent)) /
            resolution);
          feature.set('radius', radius);
        }
      }

      let currentResolution;
      function styleFunction(feature, resolution) {
        if (resolution != currentResolution) {
          calculateClusterInfo(resolution);
          currentResolution = resolution;
        }
        let style;
        let size = feature.get('features').length;
        if (size > 1) {
          style = new ol.style.Style({
            image: new ol.style.Circle({
              radius: feature.get('radius'),
              fill: new ol.style.Fill({
                color: [1, 49, 180, Math.min(0.8, 0.4 + (size / maxFeatureCount))]
              })
            }),
            text: new ol.style.Text({
              text: size.toString(),
              fill: textFill,
              stroke: textStroke
            })
          });
        } else {
          let originalFeature = feature.get('features')[0];
          style = createStationStyle(originalFeature);
        }
        return style;
      }

      vector = new ol.layer.Vector({
        source: new ol.source.Cluster({
          distance: 40,
          source: new ol.source.Vector({
            features: this.features
          })
        }),
        style: styleFunction
      });

      vector.set('name', 'vectorStation');

      this.map.addLayer(vector);
    });
  }

  getPistes() {
    this.pistesService.getPistes().then(data => {
      let pistes = data;

      let vectorSource = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(pistes, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
      });

      this.layerPistes = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#6D071A',
            width: 2
          })
        }),
        opacity: 0.7
      });

      this.map.addLayer(this.layerPistes);
      this.layerPistes.setVisible(false);
      this.boutonPisteActif = true;
    });
  }

  visible() {
    if (this.pistesVisibles) {
      this.layerPistes.setVisible(true);
    }
    else {
      this.layerPistes.setVisible(false);
    }
  }

  getPosition() {
    this.options = {
      enableHighAccuracy: false
    };
    this.geolocation.getCurrentPosition(this.options).then((pos: Geoposition) => {
      this.currentPos = pos;
      this.addMarkerPosition(pos);
      this.map.getView().centerOn(ol.proj.transform([this.currentPos.coords.longitude, this.currentPos.coords.latitude], 'EPSG:4326', 'EPSG:3857'), this.map.getSize(), [document.body.clientWidth / 2, document.body.clientHeight / 2]);
    }, (err: PositionError) => {
      console.log("error : " + err.message);
    });
  }

  updatePosition() {
    this.options = {
      enableHighAccuracy: false
    };
    this.geolocation.getCurrentPosition(this.options).then((pos: Geoposition) => {
      this.currentPos = pos;
      this.addMarkerPosition(pos);
    }, (err: PositionError) => {
      console.log("error : " + err.message);
    });
  }

  updateStations() {
      this.map.getLayers().forEach(function (layer: ol.layer.Vector) {
        if (layer.get('name') == 'vectorStation') {
          layer.getSource().clear();
        }
      })
      this.getStations();
  }

  addMarkerPosition(position: Geoposition) {
    this.position.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude])));

    let vectorSource = new ol.layer.Vector({
      map: this.map,
      source: new ol.source.Vector({
        features: [this.position]
      })
    });
    console.log(this.map.getLayers().getLength())
  };
}


