import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Http } from '@angular/http'
import 'rxjs/add/operator/map';



@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage {
  stations = [];  

  constructor(public navCtrl: NavController, public http: Http) {
    this.http.get('https://download.data.grandlyon.com/ws/rdata/jcd_jcdecaux.jcdvelov/all.json').map(res => res.json()).subscribe(data => {
      this.stations = data.values;     
      console.log(this.stations);
    });
  }
}
