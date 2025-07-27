import { Injectable, ElementRef } from '@angular/core';
import * as L from 'leaflet';

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

  setupMapEventListeners(map: L.Map, onMapMove: () => void): void {
    map.on('moveend', onMapMove);
    map.on('zoomend', onMapMove);
  }

  private addTileLayer(map: L.Map): void {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
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