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
    for(let i = 0; i < this.stations.length ; i++){
      let marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([+this.stations[i].lng, +this.stations[i].lat]))
      });

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
    let vectorLayer = new ol.layer.Vector({
      source: clusterSource,
      style: function(feature) {
        var size = feature.get('features').length;
        var style = styleCache[size];
        if (!style) {
          if (size > 1){
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
            });
          }
          else {
            style = new ol.style.Style({
              image: new ol.style.Icon(({
                src: '../../assets/imgs/little_icon.png',
                scale: 0.5
              })),
            });
              
          }
          
          styleCache[size] = style;
        }
        return style;
      }
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
    })
  }
}
