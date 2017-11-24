import { Component } from '@angular/core';
import ol from 'openlayers';

@Component({
  selector: 'page-accueil',
  templateUrl: 'accueil.html'
})
export class AccueilPage {

  map;

  constructor() {

  }

  ionViewDidLoad() {
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
        center: ol.proj.transform([4.868345, 45.779324], 'EPSG:4326','EPSG:3857'),
        zoom: 15
      }),
      controls: []
    })
  }
}
