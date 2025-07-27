import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { TransportStop } from './tram-stops.service';
import { MapConfigurationService } from './map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class StopIconFactoryService {

  createStopIcon(stop: TransportStop): L.DivIcon {
    const { iconClass, iconHtml } = this.determineStopIconDetails(stop);
    
    return L.divIcon({
      className: iconClass,
      html: iconHtml,
      iconSize: [MapConfigurationService.ICON_SIZES.STOP_MARKER, MapConfigurationService.ICON_SIZES.STOP_MARKER],
      iconAnchor: [MapConfigurationService.ICON_SIZES.STOP_MARKER / 2, MapConfigurationService.ICON_SIZES.STOP_MARKER / 2]
    });
  }

  createUserLocationIcon(): L.DivIcon {
    return L.divIcon({
      className: 'custom-location-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [MapConfigurationService.ICON_SIZES.USER_LOCATION, MapConfigurationService.ICON_SIZES.USER_LOCATION],
      iconAnchor: [MapConfigurationService.ICON_SIZES.USER_LOCATION / 2, MapConfigurationService.ICON_SIZES.USER_LOCATION / 2]
    });
  }

  private determineStopIconDetails(stop: TransportStop): { iconClass: string; iconHtml: string } {
    const baseClass = 'custom-stop-marker';
    
    if (stop.tram && stop.bus) {
      return {
        iconClass: `${baseClass} mixed-stop`,
        iconHtml: '<div class="stop-icon mixed">🚊🚌</div>'
      };
    }
    
    if (stop.tram) {
      return {
        iconClass: `${baseClass} tram-stop`,
        iconHtml: '<div class="stop-icon tram">🚊</div>'
      };
    }
    
    return {
      iconClass: `${baseClass} bus-stop`,
      iconHtml: '<div class="stop-icon bus">🚌</div>'
    };
  }
}