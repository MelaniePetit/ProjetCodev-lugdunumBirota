import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { HttpModule } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';

import { AccueilPage } from '../pages/accueil/accueil';
import { ListPage } from '../pages/list/list';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { StationsServiceProvider } from '../providers/stations-service/stations-service';
import { PistesServiceProvider } from '../providers/pistes-service/pistes-service';

@NgModule({
  declarations: [
    MyApp,
    AccueilPage,
    ListPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpModule,
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    AccueilPage,
    ListPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    StationsServiceProvider,
    PistesServiceProvider,
    Geolocation,
  ]
})
export class AppModule {}
