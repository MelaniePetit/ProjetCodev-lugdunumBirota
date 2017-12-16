import { Component } from '@angular/core';
import ol from 'openlayers';
import { Http } from '@angular/http'
import 'rxjs/add/operator/map';

import { Station } from '../../model/station'


@Component({
  selector: 'page-accueil',
  templateUrl: 'accueil.html'
})

export class AccueilPage {
  stations : Station[] = [];
  map;
  markers = [];

  constructor(public http: Http) {
    this.http.get('https://download.data.grandlyon.com/ws/rdata/jcd_jcdecaux.jcdvelov/all.json').map(res => res.json()).subscribe(data => {
      this.stations = data.values;  
      this.createMap()      
      
    });
  }

  createMap() {
  // Tuto : http://openlayers.org/en/latest/examples/earthquake-clusters.html 
  /*for(let i = 0; i < this.stations.length ; i++){
      let marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([+this.stations[i].lng, +this.stations[i].lat]))
      });
      this.markers.push(marker);
    }

  let emptyStyle = new ol.style.Style({
      image: new ol.style.Icon(({
        src: '../../assets/imgs/icon_vide.png',
        scale: 0.5
      }))
    });

    let fullStyle = new ol.style.Style({
      image: new ol.style.Icon(({
        src: '../../assets/imgs/icon_plein.png',
        scale: 0.5
      }))
    });

    function createStationStyle(feature) {
      let name = feature.get('name');

      let bikes = feature.get('available_bikes');
      console.log('bikes'+bikes);
      if (bikes < 3){
        return emptyStyle;
      }
      else {
        return fullStyle;
      }
    }

    let maxFeatureCount, vector;
    function calculateClusterInfo(resolution) {
      maxFeatureCount = 0;
      let features = vectorLayer.getSource().getFeatures();
      let feature, radius;
      for (var i = features.length - 1; i >= 0; --i) {
        feature = features[i];
        var originalFeatures = feature.get('features');
        var extent = ol.extent.createEmpty();
        var j, jj;
        for (j = 0, jj = originalFeatures.length; j < jj; ++j) {
          ol.extent.extend(extent, originalFeatures[j].getGeometry().getExtent());
        }
        maxFeatureCount = Math.max(maxFeatureCount, jj);
        radius = 0.25 * (ol.extent.getWidth(extent) + ol.extent.getHeight(extent)) /
            resolution;
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
        style = style = new ol.style.Style({
          image: new ol.style.Icon(({
            src: '../../assets/imgs/logo.png',
            scale: 0.075
          })),
          text: new ol.style.Text({
            text: size.toString(),
            fill: new ol.style.Fill({
              color: '#fff'
            })
          })
        });
      } else {
        let originalFeature = feature.get('features')[0];
        style = createStationStyle(originalFeature);
      }
      return style;
    }

    let vectorSource = new ol.source.Vector({
      features: this.markers,
    });

    let clusterSource = new ol.source.Cluster({
      distance: 30,
      source: vectorSource
    });

    let vectorLayer = new ol.layer.Vector({
      source: clusterSource,
      style: styleFunction
    });

    var mapSource = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: "https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}/?access_token=pk.eyJ1IjoibWVsYW5pZWxlYSIsImEiOiJjamFkczVuMmgwbm5vMzJvaTY4ZmU2YnhuIn0.SfQ-NCHeu7WgeehCuqMjvA"
      })
    });

    this.map = new ol.Map({
      target: "map",

      layers: [mapSource,vectorLayer],

      view: new ol.View({
        center: ol.proj.fromLonLat([4.868345, 45.779324]),
        zoom: 10
      })
    })*/

    let iconStyle;
    for(let i = 0; i < this.stations.length ; i++){
      let marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([+this.stations[i].lng, +this.stations[i].lat]))
      });

      let bikes = +this.stations[i].available_bikes;
      if (bikes < 3){
          //console.log('bikes < 3');
          iconStyle = new ol.style.Style({
          image: new ol.style.Icon(({
            src: '../../assets/imgs/icon_vide.png',
            scale: 0.5
          }))
        });
      }
      else {
        //console.log('bikes > 3');        
        iconStyle = new ol.style.Style({
          image: new ol.style.Icon(({
            src: '../../assets/imgs/icon_plein.png',
            scale: 0.5
          }))
        });
      }

      marker.setStyle(iconStyle);
      this.markers.push(marker); 
    }

    let vectorSource = new ol.source.Vector({
      features: this.markers,
    });

    let clusterSource = new ol.source.Cluster({
      distance: 30,
      source: vectorSource
    });

    let styleCache = {};
    let vectorLayerCluster = new ol.layer.Vector({
      // Idées -------------------------------
      // Mettre un if permettant de choisir vectorSource ou clusterSource
      // Tester d'abord si on passe plusieurs fois dans cette boucle lorsqu'on zoom,
      // Essayer de créer deux fonctions vectorLayers et les appelé en fonction du zoom dans map (en bas)
      source: clusterSource,
      style: function(feature) {
        var size = feature.get('features').length;
        var style = styleCache[size];
        if (!style) {
          if (size > 1) {
            style = new ol.style.Style({
              image: new ol.style.Icon(({
                src: '../../assets/imgs/logo.png',
                scale: 0.075
              })),
              text: new ol.style.Text({
                text: size.toString(),
                fill: new ol.style.Fill({
                  color: '#fff'
                })
              })
            })
          }
          else {
            style = iconStyle;
          }
          styleCache[size] = style;
        }
        return style;
      }
    });  
    
    /*let vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: iconStyle
    });*/

    var mapSource = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: "https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}/?access_token=pk.eyJ1IjoibWVsYW5pZWxlYSIsImEiOiJjamFkczVuMmgwbm5vMzJvaTY4ZmU2YnhuIn0.SfQ-NCHeu7WgeehCuqMjvA"
      })
    });

    this.map = new ol.Map({
      target: "map",

      layers: [mapSource,vectorLayerCluster],

      view: new ol.View({
        center: ol.proj.fromLonLat([4.868345, 45.779324]),
        zoom: 10
      })
    })

    /*this.map.getView().on('propertychange', function(e) {
      switch (e.key) {
         case 'resolution':         
         if (e.oldValue < 9) {
           console.log('resolution : '+e.oldValue)
         }
      }  
   });*/  

  }
}
