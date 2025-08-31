import { Injectable, ElementRef } from '@angular/core';
import * as L from 'leaflet';
import { MapConfigurationService } from './map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class MapInitializationService {
  private readonly DEFAULT_CENTER_LAT = 50.0647;
  private readonly DEFAULT_CENTER_LNG = 19.9450;
  private readonly DEFAULT_ZOOM = 13;

  createMap(mapContainer: ElementRef): L.Map {
    const map = L.map(mapContainer.nativeElement, {
      center: [this.DEFAULT_CENTER_LAT, this.DEFAULT_CENTER_LNG],
      zoom: this.DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true
    });

    this.addTileLayer(map);
    return map;
  }

  createUserLocationMarker(): L.Marker {
    const customIcon = this.createUserLocationIcon();
    return L.marker([this.DEFAULT_CENTER_LAT, this.DEFAULT_CENTER_LNG], { icon: customIcon });
  }


  private addTileLayer(map: L.Map): void {
    const config = MapConfigurationService.MAPBOX_CONFIG;
    
    L.tileLayer(`https://api.mapbox.com/styles/v1/${config.STYLE_ID}/tiles/{z}/{x}/{y}?access_token=${config.ACCESS_TOKEN}`, {
      attribution: config.ATTRIBUTION,
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map);
  }

  private createUserLocationIcon(): L.DivIcon {
    return L.divIcon({
      className: 'custom-location-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }
}