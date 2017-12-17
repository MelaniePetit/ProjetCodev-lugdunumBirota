import { Http } from '@angular/http';
import { Injectable } from '@angular/core';

import 'rxjs/add/operator/map'

/*
  Generated class for the StationsServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class StationsServiceProvider {

  apiUrl = 'https://download.data.grandlyon.com/wfs/rdata?SERVICE=WFS&VERSION=2.0.0&outputformat=GEOJSON&request=GetFeature&typename=jcd_jcdecaux.jcdvelov&SRSNAME=urn:ogc:def:crs:EPSG::4326';

  constructor(public http: Http) {
    console.log('Hello StationsServiceProvider Provider');
  }

  getStations() : Promise<any> {
    return this.http.get(this.apiUrl).map(res => res.json()).toPromise(); 
  }

}
