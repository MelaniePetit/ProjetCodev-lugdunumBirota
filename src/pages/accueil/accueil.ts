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
      
      marker.setStyle(new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
          crossOrigin: 'anonymous',
          src: 'https://openlayers.org/en/v4.5.0/examples/data/dot.png'
        }))
      }));

      this.markers.push(marker);
    }

    let vectorSource = new ol.source.Vector({
      features: this.markers,
    });

    let vectorLayer = new ol.layer.Vector({
      source: vectorSource
    });
    
    this.map = new ol.Map({
      target: "map",

      layers: [
        new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: "https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}/?access_token=pk.eyJ1IjoibWVsYW5pZWxlYSIsImEiOiJjamFkczVuMmgwbm5vMzJvaTY4ZmU2YnhuIn0.SfQ-NCHeu7WgeehCuqMjvA"
          })
        }),
        vectorLayer,
      ],

      view: new ol.View({
        center: ol.proj.fromLonLat([4.868345, 45.779324]),
        zoom: 10
      })
    })
  }
}
