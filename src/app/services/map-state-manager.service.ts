import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { MapConfigurationService } from './map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class MapStateManagerService {
  private mapMoveTimeout: any;
  private lastLoadedBounds: L.LatLngBounds | null = null;

  constructor(private mapConfigurationService: MapConfigurationService) {}

  setupMapMoveHandler(map: L.Map, onMapMove: () => void): void {
    map.on('moveend', () => this.handleMapMove(onMapMove));
    map.on('zoomend', () => this.handleMapMove(onMapMove));
  }

  updateUserLocation(map: L.Map, userMarker: L.Marker, latitude: number, longitude: number): void {
    const latLng = L.latLng(latitude, longitude);
    map.setView(latLng, MapConfigurationService.ZOOM_LEVELS.HIGH_DETAIL);
    userMarker.setLatLng(latLng);
    userMarker.addTo(map);
  }

  shouldUpdateStops(map: L.Map): boolean {
    const currentBounds = map.getBounds();
    
    if (!this.lastLoadedBounds) {
      this.lastLoadedBounds = currentBounds;
      return true;
    }

    const hasSignificantChange = !this.lastLoadedBounds.intersects(currentBounds) ||
                                currentBounds.pad(-0.3).contains(this.lastLoadedBounds);
    
    if (hasSignificantChange) {
      this.lastLoadedBounds = currentBounds;
    }
    
    return hasSignificantChange;
  }

  clearMoveTimeout(): void {
    if (this.mapMoveTimeout) {
      clearTimeout(this.mapMoveTimeout);
    }
  }

  private handleMapMove(callback: () => void): void {
    this.clearMoveTimeout();
    
    this.mapMoveTimeout = setTimeout(() => {
      callback();
    }, MapConfigurationService.TIMEOUTS.MAP_MOVE_DEBOUNCE_MS);
  }
}