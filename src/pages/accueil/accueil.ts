import { Component } from '@angular/core';
import ol, { Feature } from 'openlayers';

import * as Popup from 'ol-popup';

import { StationsServiceProvider } from '../../providers/stations-service/stations-service';
import { PistesServiceProvider } from '../../providers/pistes-service/pistes-service'

@Component({
  selector: 'page-accueil',
  templateUrl: 'accueil.html'
})

export class AccueilPage {
  stations;
  map;
  features;
  pistes;
  layerPistes: ol.layer.Vector;
  pistesVisibles: boolean = false;
  boutonPisteActif = false;

  constructor(public stationsService: StationsServiceProvider, public pistesService: PistesServiceProvider) {
    this.getPistes();
  }

  ionViewDidLoad() {
    
    //creation de la map
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
        center: ol.proj.transform([4.868345, 45.779324], 'EPSG:4326', 'EPSG:3857'),
        zoom: 15
      }),
      controls: []
    });

    this.getStations();
    this.createPopups();
  }

  createPopups(){
    let popup = new Popup();
    this.map.addOverlay(popup);

    this.map.on('click', function(evt) {

      let feature:ol.Feature = this.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
          return feature;
        });        
        if(feature){
          let clickedFeature = feature.get('features')[0]; 
          //Vérification station en travaux
          let travaux = clickedFeature.get('available_bike_stands') + clickedFeature.get('available_bikes');
          let status = clickedFeature.get('status');
          let informations = "<a href='" + clickedFeature.get('gid') + "'>" + clickedFeature.get('name') + "</a></br><br>";
          if (travaux > 0 && status=="OPEN") {
            informations += "<p> " + clickedFeature.get('available_bikes') + "</p><img src='../../assets/imgs/Bike-icon.png'></br>";
            informations += "<p> " + clickedFeature.get('available_bike_stands') + "</p><img src='../../assets/imgs/Bike-parking.png'>";
          } else {
            informations += "<img src='../../assets/imgs/under_construction.png'>";
          }
          

          popup.show(evt.coordinate, informations);
        }  
        
    });

    this.map.on('moveend', function(evt){
      if (this.getView().getZoom()<15) {
        popup.hide();        
      }
    });
    this.getPistes();
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
        let img : ol.style.Icon;
        let nbTotVelo = feature.get('available_bike_stands')+feature.get('available_bikes');
        let nbVeloDispo  = feature.get('available_bikes');

        if (nbVeloDispo == 0){
          img = new ol.style.Icon(({
            src: '../../assets/imgs/icon_vide.png',
            scale: 0.4}))
        }
        else if (nbVeloDispo <= Math.trunc(nbTotVelo/3)){
          img = new ol.style.Icon(({
            src: '../../assets/imgs/icon_presque_vide.png',
            scale: 0.4}))
        }
        else if (nbVeloDispo <= 2*Math.trunc(nbTotVelo/3)){
          img = new ol.style.Icon(({
            src: '../../assets/imgs/icon_semi_plein.png',
            scale: 0.4}))
        }
        else if (nbVeloDispo <= 3*Math.trunc(nbTotVelo/3)){
          img = new ol.style.Icon(({
            src: '../../assets/imgs/icon_presque_plein.png',
            scale: 0.4}))
        }
        else {
          img = new ol.style.Icon(({
            src: '../../assets/imgs/icon_plein.png',
            scale: 0.4}))
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
          radius = Math.max(10 , 0.15 * (ol.extent.getWidth(extent) + ol.extent.getHeight(extent)) /
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
          distance: 70,
          source: new ol.source.Vector({
            features: this.features
          })
        }),
        style: styleFunction
      });
      
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

  visible(){
    if (this.pistesVisibles){
      this.layerPistes.setVisible(true);
    }
    else{
      this.layerPistes.setVisible(false);
    }
  }
}
