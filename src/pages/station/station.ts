import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';


/**
 * Generated class for the StationPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-station',
  templateUrl: 'station.html',
})
export class StationPage {
  station : any;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.station = navParams.get('station'); //Attention le P est devenu un N
  }

  ionViewDidLoad() {
  }   

}
