import { Component } from '@angular/core';
import ol, { featureloader } from 'openlayers';
import { Geolocation, GeolocationOptions, Geoposition, PositionError } from '@ionic-native/geolocation';
import { NavController, AlertController, Events } from 'ionic-angular';
import { NativeStorage } from '@ionic-native/native-storage';

import { Network } from '@ionic-native/network';
import { ToastController } from 'ionic-angular';

import 'rxjs/add/observable/interval';
import { Observable } from 'rxjs/Observable';

import * as Popup from 'ol-popup';

import { StationPage } from '../station/station';

import { StationsServiceProvider } from '../../providers/stations-service/stations-service';
import { PistesServiceProvider } from '../../providers/pistes-service/pistes-service'

@Component({
  selector: 'page-accueil',
  templateUrl: 'accueil.html'
})

export class AccueilPage {

  map: ol.Map;
  features: ol.Feature[];
  stockedFeatures: ol.Feature[];
  district;
  full;
  empty;
  status;
  bonus;

  pistes;
  layerPistes: ol.layer.Vector;
  pistesVisibles: boolean = false;
  boutonPisteActif: boolean = false;

  position: ol.Feature = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([4.835658999999964, 45.764043])) });
  options: GeolocationOptions;
  currentPos: Geoposition;

  disconnectSubscription;
  connectSubscription;
  connexion: boolean = true;
  premiereCo: boolean = true;

  constructor(
    private nativeStorage: NativeStorage,
    public alertCtrl: AlertController,
    public events: Events,
    public toastCtrl: ToastController,
    private network: Network,
    public stationsService: StationsServiceProvider,
    public navCtrl: NavController,
    public pistesService: PistesServiceProvider,
    private geolocation: Geolocation) {
    this.menuEvents();
  }

  /* -------------------- Méthode IONIC pendant création ------------------------
  Si l'utilisateur n'est pas connecté, un message d'erreur s'affiche, sinon
  l'appel aux stations s'effectue normalement.
  Lorsque l'application se déconnecte, un message pop apparait, la page accueil
  publie sur le topic noConnexion.
  Lorsque l'application se reconnecte, un message pop apparait, la page accueil
  publie sur le topic connexion.
  ------------------------------------------------------------------------------*/

  ionViewWillEnter() {
    setTimeout(() => {
      if (this.network.type === 'none') {
        this.connexion = false;
        this.events.publish('menu:noconnexion');
        let alert = this.alertCtrl.create({
          title: 'Connexion Internet!',
          subTitle: 'Impossible de se connecter à internet. Vous n\'avez accès qu\'à la position des stations.',
          buttons: ['OK']
        });
        alert.present();
        this.getStations();
      }
      else {
        this.getStations();
      }
    }, 3000);

    this.disconnectSubscription = this.network.onDisconnect().subscribe(() => {
      let toast = this.toastCtrl.create({
        message: 'Connexion internet perdue !',
        duration: 3000,
        position: 'top'
      });
      this.features = this.stockedFeatures;
      this.treatmentStations(this.connexion);
      this.connexion = false;
      toast.present();
      this.events.publish('menu:noconnexion');
    });

    this.connectSubscription = this.network.onConnect().subscribe(data => {
      let toast = this.toastCtrl.create({
        message: 'Vous êtes connecté à internet',
        duration: 3000,
        position: 'top'
      });
      this.connexion = true;
      toast.present();
      this.events.publish('menu:connexion');
      this.getStations();
    });
  }

  /* -------------------- Méthode IONIC avant affichage -------------------------
  La position de l'utilisateur est récupérée et positionnée.
  ------------------------------------------------------------------------------*/

  ionViewDidEnter() {
    this.getPosition();
  }

  /* -------------------- Méthode IONIC avant chargement -------------------------
  Le point de position est stylisé.
  Les intervalles de rafraichissement sont mis en place (30 secondes pour les
  stations, 5 secondes pour la position).
  ------------------------------------------------------------------------------*/

  ionViewDidLoad() {
    this.position.setStyle(new ol.style.Style({
      image: new ol.style.Icon(/** @type {olx.style.IconOptions} */({
        src: 'assets/icon/geolocation_marker.png'
      }))
    }));

    Observable.interval(30000).subscribe(() => { this.getStations() });
    Observable.interval(5000).subscribe(() => { this.updatePosition() });
  }
  
  /* --------------------  CREATION DE LA MAP ------------------------------------
  Création de la map sur un fond de carte mapbox, données geoJson transformées dans
  le système de projection ESPG:4326
  ------------------------------------------------------------------------------*/

  createMap() {
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
        center: ol.proj.transform([4.835658999999964, 45.764043], 'EPSG:4326', 'EPSG:3857'),
        zoom: 15,
        enableRotation: false,
      }),
      controls: []
    });
  }

  /* --------------------  CREATION DES POPUPS -----------------------------------
  Utilisation de ol.Popup()
  Récupération des features présentes sur la map, action d'ouverture de la popup
  déclenchée par le click sur une feature.
  Vérification que l'utilisateur ne clique pas sur un cluster.
  Remplissage des informations popups avec les données de la feature cliquée.
  Modification de la popup si la station est une station "en travaux".
  Lorsqu'on zoom/dézoom, la popup est fermée.
  ------------------------------------------------------------------------------*/

  createPopups() {
    let popup = new Popup();
    this.map.addOverlay(popup);
    this.map.on('click', (evt) => {

      let feature = this.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        return feature;
      }, { hitTolerance: 10 }); //15 trop grand

      if (feature) {

        //Size > 1 => regroupement de stations
        let size = feature.get('features').length;
        if (size == 1) {

          let clickedFeature = feature.get('features')[0];
          //Vérification station en travaux
          let travaux = clickedFeature.get('available_bike_stands') + clickedFeature.get('available_bikes');
          let status = clickedFeature.get('status');
          //Elements HTML
          let popupContent = document.getElementById('popup');
          let nameStation = document.getElementById('name_station');
          let availableBikes = document.getElementById('avalaible_bikes');
          let availableStands = document.getElementById('available_bikes_stands');
          let stationClosed = document.getElementById('popup-content-closed');
          let stationOpened = document.getElementById('popup-content');

          stationClosed.style.display = 'none';
          stationOpened.style.display = 'inline';

          nameStation.innerHTML = clickedFeature.get('name');
          popupContent.onclick = evt => {
            this.gotoStation(clickedFeature);
          }
          if (travaux > 0 && status == "OPEN") {
            availableBikes.innerHTML = clickedFeature.get('available_bikes');
            availableStands.innerHTML = clickedFeature.get('available_bike_stands');
          } else {
            stationClosed.style.display = 'inline';
            stationOpened.style.display = 'none';
          }

          popupContent.style.display = 'inline';
          popup.show(evt.coordinate, popupContent);
        }
      }
    });

    this.map.on('moveend', function (evt) {
      if (this.getView().getZoom() < 15) {
        popup.hide();
      }
    });
  }

  /* -------------------- Aller à la page station -------------------------------
  Fonction qui positionne la page station en passant en paramètres les propriétés
  de la station clickée.
  ------------------------------------------------------------------------------*/

  gotoStation(station) {
    this.navCtrl.push(StationPage, { station: station.getProperties() });
  }

  /* -------------------- Création des stations -------------------------------
  Si l'utilisateur est connecté et que c'est la première connexion, toutes les 
  méthodes sont lancés pour créer la map, les stations et les popups.
  Puis, dans tous les cas, on fait appel au "stationsService" pour récupérer les
  features des stations. StockedFeatures permettra d'appliquer les features sans
  filtres alors que features sera modifié par les filtres.

  Si l'utilisateur n'est pas connecté, on récupère les données stockées 
  afin de les utiliser.
  ------------------------------------------------------------------------------*/

  getStations() {
    if (this.connexion) {

      if (this.premiereCo) {
        this.createMap();
        this.premiereCo = false;
        this.createPopups();
        this.getPistes();
        this.getPosition();
        this.storageStations();
      }

      this.stationsService.getStations().then(data => {
        this.features = (new ol.format.GeoJSON()).readFeatures(data, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });

        this.stockedFeatures = (new ol.format.GeoJSON()).readFeatures(data, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });

        this.treatmentFilters(this.features);
        this.treatmentStations(this.connexion);
      });
    }

    else {
      if (this.premiereCo) {
        this.features = [];
        let stations = new Array<[number, number]>();
        this.nativeStorage.getItem('stationsLocation')
          .then(
          data => {
            data == null ? stations = null : stations = data;
            //let markerStations = new Array<ol.Feature>();;
            for (let station of stations) {
              var s = new ol.Feature({
                geometry: new ol.geom.Point(station)
              });

              this.features.push(s);
            }
            this.treatmentStations(this.connexion);
          },
          error => console.error(error)
          );
      }
    }
  }

  /* -------------------- Traitement des filtres -------------------------------
  En fonction de la valeur des booleens liés aux filtres (activés ou non-activés),
  on modifie les données features.
  ------------------------------------------------------------------------------*/

  treatmentFilters(features) {
    if (this.district) {
      let filtered = features.filter((feature) => {
        return feature.get('code_insee') == this.district;
      });
      features = filtered;
    }

    if (this.status) {
      let filtered = features.filter((feature) => {
        return feature.get('status') == "OPEN";
      });
      features = filtered;
    }

    if (this.bonus) {
      let filtered = features.filter((feature) => {
        return feature.get('bonus') == "Oui";
      });
      features = filtered;
    }

    if (this.full && this.empty) {
      let filtered = features.filter(function (feature) {
        return (feature.get('available_bike_stands') == '0' || feature.get('available_bikes') == '0');
      });
      features = filtered;
    } else {

      if (this.full) {
        let filtered = features.filter(function (feature) {
          return feature.get('available_bike_stands') == '0' && feature.get('available_bikes') != '0';
        });
        features = filtered;
      }

      if (this.empty) {
        let filtered = features.filter(function (feature) {
          return feature.get('available_bikes') == '0';
        });
        features = filtered;
      }
    }
    this.features = features;
  }

  /* -------------------- Style des stations ------------------------------------
  En fonction du nombre de vélos disponibles, des marqueurs de couleurs 
  différentes sont positionnés sur les stations. 
  Des clusters sont créés afin de regrouper les stations proches et éviter que
  l'application ne soit trop surchargée.
  Enfin, le layer et le vecteur sont créés afin de les afficher. Lors d'un
  rafraichissement, si le vecteur est déjà existant, il est mis à jour avec les
  nouvelles données.
  ------------------------------------------------------------------------------*/

  treatmentStations(connexion) {
    let textFill = new ol.style.Fill({
      color: '#fff'
    });
    let textStroke = new ol.style.Stroke({
      color: 'rgba(0, 0, 0, 0.6)',
      width: 3
    });

    function createStationStyle(feature) {
      let img: ol.style.Icon;
      let nbTotVelo = feature.get('available_bike_stands') + feature.get('available_bikes');
      let nbVeloDispo = feature.get('available_bikes');

      if (!connexion) {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_hors_co.png',
          scale: 0.4
        }))
      }
      else if (nbVeloDispo == 0) {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_vide.png',
          scale: 0.4
        }))
      }
      else if (nbVeloDispo <= Math.trunc(nbTotVelo / 4)) {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_presque_vide.png',
          scale: 0.4
        }))
      }
      else if (nbVeloDispo <= 2 * Math.trunc(nbTotVelo / 4)) {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_semi_plein.png',
          scale: 0.4
        }))
      }
      else if (nbVeloDispo == nbTotVelo) {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_plein.png',
          scale: 0.4
        }))
      }
      else {
        img = new ol.style.Icon(({
          src: 'assets/imgs/icon_presque_plein.png',
          scale: 0.4
        }))
      }

      return new ol.style.Style({
        geometry: feature.getGeometry(),
        image: img,
      });
    }

    let maxFeatureCount, vector;
    function calculateClusterInfo(resolution) {
      maxFeatureCount = 0;
      let features = vector.getSource().getFeatures();
      let feature, radius;
      for (let i = features.length - 1; i >= 0; --i) {
        feature = features[i];
        let originalFeatures = feature.get('features');
        let extent = ol.extent.createEmpty();
        let j, jj;
        for (j = 0, jj = originalFeatures.length; j < jj; ++j) {
          ol.extent.extend(extent, originalFeatures[j].getGeometry().getExtent());
        }
        maxFeatureCount = Math.max(maxFeatureCount, jj);
        radius = Math.max(10, 0.15 * (ol.extent.getWidth(extent) + ol.extent.getHeight(extent)) /
          resolution);
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
        style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: feature.get('radius'),
            fill: new ol.style.Fill({
              color: [1, 49, 180, Math.min(0.8, 0.4 + (size / maxFeatureCount))]
            })
          }),
          text: new ol.style.Text({
            text: size.toString(),
            fill: textFill,
            stroke: textStroke
          })
        });
      } else {
        let originalFeature = feature.get('features')[0];
        style = createStationStyle(originalFeature);
      }
      return style;
    }

    //Suppression du vectorStation à rafraichir
    let existingLayer;
    this.map.getLayers().forEach(function (layer: ol.layer.Vector) {
      if (layer.get('name') == 'vectorStation') {
        existingLayer = layer;
      }
    })
    this.map.removeLayer(existingLayer);

    vector = new ol.layer.Vector({
      source: new ol.source.Cluster({
        distance: 40,
        source: new ol.source.Vector({
          features: this.features
        })
      }),
      style: styleFunction
    });

    vector.set('name', 'vectorStation');

    this.map.addLayer(vector);
  }

  /* -------------------- Traitement des filtres -------------------------------
  Via l'appel au "pistesService", nous récupérons les données des pistes cyclables
  du Grand Lyon et créons le layer correspondant.
  ------------------------------------------------------------------------------*/

  getPistes() {
    this.pistesService.getPistes().then(data => {
      let pistes = data;

      let vectorSource = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(pistes, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
      });

      this.layerPistes = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#6D071A',
            width: 2
          })
        }),
        opacity: 0.7
      });

      this.layerPistes.set('name', 'vectorPistes');

      this.map.addLayer(this.layerPistes);
      this.layerPistes.setVisible(false);
      this.boutonPisteActif = true;
    });
  }

  /* -------------------- Visibilité des pistes -------------------------------
  Sachant que les pistes cyclables ne sont pas toujours affichées, cette méthode
  permet de passer du mode "affiché" au mode "caché" et inversement.
  ------------------------------------------------------------------------------*/

  visible() {
    if (this.pistesVisibles) {
      this.layerPistes.setVisible(true);
    }
    else {
      this.layerPistes.setVisible(false);
    }
  }

  /* -------------------- Position de l'utilisateur ------------------------------
  Dans cette méthode, la position de l'utilisateur est récupérée, un marqueur y 
  est positionné et la map est centrée dessus.
  ------------------------------------------------------------------------------*/

  getPosition() {
    this.options = {
      enableHighAccuracy: false
    };
    this.geolocation.getCurrentPosition(this.options).then((pos: Geoposition) => {
      this.currentPos = pos;
      this.addMarkerPosition(pos);
      this.map.getView().centerOn(ol.proj.transform([this.currentPos.coords.longitude, this.currentPos.coords.latitude], 'EPSG:4326', 'EPSG:3857'), this.map.getSize(), [document.body.clientWidth / 2, document.body.clientHeight / 2]);
    }, (err: PositionError) => {
      console.log("error : " + err.message);
    });
  }

  /* -------------------- Modification de la position ---------------------------
  Modification de la position en fonction de la position actuelle.
  ------------------------------------------------------------------------------*/

  updatePosition() {
    this.options = {
      enableHighAccuracy: false
    };
    this.geolocation.getCurrentPosition(this.options).then((pos: Geoposition) => {
      this.currentPos = pos;
      this.addMarkerPosition(pos);
    }, (err: PositionError) => {
      console.log("error : " + err.message);
    });
  }

  /* -------------------- Gestion des filtes du menu ----------------------------
  La page accueil s'abonne aux filtres liés au menu afin d'être au courant de
  chaque modification (les modifications sont publiées dans app.component).
  En fonction, les booleens correspondant aux filtres sont modifiés.
  ------------------------------------------------------------------------------*/

  menuEvents() {
    this.events.subscribe('menu:full', (item) => {
      if (item) {
        this.full = true
      } else {
        this.full = false;
      }
      this.getStations();
    });
    this.events.subscribe('menu:empty', (item) => {
      if (item) {
        this.empty = true;
      } else {
        this.empty = false;
      }
      this.getStations();
    });
    this.events.subscribe('menu:status', (item) => {
      if (item) {
        this.status = "OPEN";
      } else {
        this.status = null;
      }
      this.getStations();
    });
    this.events.subscribe('menu:bonus', (item) => {
      if (item) {
        this.bonus = "Oui";
      } else {
        this.bonus = null;
      }
      this.getStations();
    });
    this.events.subscribe('menu:district', (item) => {
      this.district = item;
      this.getStations();
    });
    this.events.subscribe('menu:reinitialize', () => {
      this.district = null;
      this.full = null;
      this.empty = null;
      this.status = null;
      this.bonus = null;
      this.getStations();
    });
  }

  /* -------------------- Position des marqueurs -------------------------------
  Ajoute le marqueur de la position sur la map.
  ------------------------------------------------------------------------------*/

  addMarkerPosition(position: Geoposition) {
    this.position.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude])));

    let vectorSource = new ol.layer.Vector({
      map: this.map,
      source: new ol.source.Vector({
        features: [this.position]
      })
    });
    vectorSource.set('name', 'vectorMarkers');
  };

  /* -------------------- Stockage des données ----------------------------------
  Récupération des données via le service et stockage de ces données
  Un message d'erreur ou de validation est envoyé en console.
  ------------------------------------------------------------------------------*/

  storageStations() {
    this.stationsService.getStations().then(data => {
      this.features = (new ol.format.GeoJSON()).readFeatures(data, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      let geomStations: any[] = new Array<any>();
      for (let d of this.features) {
        let p: ol.geom.Point = <ol.geom.Point>d.getGeometry();
        let geom: [number, number] = p.getCoordinates();
        geomStations.push(geom);
      }

      this.nativeStorage.setItem('stationsLocation', geomStations)
        .then(
        data => console.log('Stations stockées'),
        error => console.error('Error storing stations', error)
        );
        
    });
  }
}


