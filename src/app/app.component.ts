import { Component, ViewChild } from '@angular/core';

import { Platform, MenuController, Nav, Events } from 'ionic-angular';

import { AccueilPage } from '../pages/accueil/accueil';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  // make AccueilPage the root (or first) page
  rootPage =  AccueilPage;
  pages: Array<{title: string, component: any}>;
  arrondissements : Array<{id: String, nom: string}>;
  fullIsChecked : boolean;
  emptyIsChecked : boolean;
  statusIsChecked : boolean;
  bonusIsChecked : boolean;


  constructor(
    public platform: Platform,
    public menu: MenuController,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    public events:Events
  ) 
    {
    
    this.initializeApp();
    this.fullIsChecked = false;
    this.emptyIsChecked  = false;
    this.statusIsChecked  = false;
    this.bonusIsChecked  = false;
    // set our app's pages
    this.pages = [
      { title: 'Accueil', component: AccueilPage }
    ];

    this.arrondissements = [
      { id: '69381', nom : 'Lyon 1 er'},
      { id: '69382', nom : 'Lyon 2 ème'},
      { id: '69383', nom : 'Lyon 3 ème'},
      { id: '69384', nom : 'Lyon 4 ème'},
      { id: '69385', nom : 'Lyon 5 ème'},
      { id: '69386', nom : 'Lyon 6 ème'},
      { id: '69387', nom : 'Lyon 7 ème'},
      { id: '69388', nom : 'Lyon 8 ème'},
      { id: '69389', nom : 'Lyon 9 ème'},
      { id: '69034', nom : 'CALUIRE-ET-CUIRE'},
      { id: '69266', nom : 'VILLEURBANNE'},
      { id: '69256', nom : 'VAULX-EN-VELIN'}
    ];
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });

  }
  updateDistrict(idDistrict) {
    this.events.publish('menu:district', idDistrict);
  }

  updateStateFull(){
    this.events.publish('menu:full', this.fullIsChecked);
  }

  updateStateEmpty() {
    this.events.publish('menu:empty', this.emptyIsChecked);
  }

  updateStatus(){
    this.events.publish('menu:status', this.statusIsChecked);
  }

  updateBonus(){
    this.events.publish('menu:bonus', this.bonusIsChecked);
  }

  noFilter() {
    this.fullIsChecked = false;
    this.emptyIsChecked  = false;
    this.statusIsChecked  = false;
    this.bonusIsChecked  = false;

    this.menu.close();
    this.events.publish('menu:reinitialize');
  }
}
