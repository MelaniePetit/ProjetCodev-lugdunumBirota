import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map'

/*
  Generated class for the PistesServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class PistesServiceProvider {
  apiUrl = 'https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&outputformat=GEOJSON&request=GetFeature&typename=pvo_patrimoine_voirie.pvoamenagementcyclable&SRSNAME=urn:ogc:def:crs:EPSG::4171'
  data;
  constructor(public http: Http) {
    console.log('Hello PistesServiceProvider Provider');
  }

  getPistes() : Promise<any> {
    return this.http.get(this.apiUrl).map(res => res.json()).toPromise(); 
  }
}


