import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { TransportStop } from '../data/tram-stops.service';
import { GeoUtilsService } from '../location/geo-utils.service';
import { MapConfigurationService } from '../map/map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class StopFilteringService {

  constructor(
    private geoUtilsService: GeoUtilsService,
    private mapConfigurationService: MapConfigurationService
  ) {}

  getVisibleStopsWithinBounds(allStops: TransportStop[], bounds: L.LatLngBounds): TransportStop[] {
    const extendedBounds = bounds.pad(this.mapConfigurationService.getStopVisibilityBounds());
    return allStops.filter(stop => 
      extendedBounds.contains([stop.stop_lat, stop.stop_lon])
    );
  }

  getLimitedStopsByDistanceFromCenter(stops: TransportStop[], center: L.LatLng, zoomLevel: number): TransportStop[] {
    const maxStops = this.mapConfigurationService.getMaximumStopsForZoomLevel(zoomLevel);
    
    return stops
      .map(stop => this.addDistanceCalculationToStop(stop, center))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxStops);
  }

  private addDistanceCalculationToStop(stop: TransportStop, center: L.LatLng): TransportStop & { distance: number } {
    return {
      ...stop,
      distance: this.geoUtilsService.calculateDistanceInKm(center.lat, center.lng, stop.stop_lat, stop.stop_lon)
    };
  }
}