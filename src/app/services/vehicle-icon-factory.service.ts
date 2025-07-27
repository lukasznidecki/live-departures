import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Vehicle } from './tram-stops.service';
import { MapConfigurationService } from './map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class VehicleIconFactoryService {

  createVehicleIcon(vehicle: Vehicle): L.DivIcon {
    const vehicleDisplayData = this.getVehicleDisplayData(vehicle);
    const normalizedBearing = this.calculateNormalizedBearing(vehicle.bearing);
    const iconHtml = this.generateVehicleIconHtml(vehicle, vehicleDisplayData, normalizedBearing);
    
    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: iconHtml,
      iconSize: [MapConfigurationService.ICON_SIZES.VEHICLE_MARKER_WIDTH, MapConfigurationService.ICON_SIZES.VEHICLE_MARKER_HEIGHT],
      iconAnchor: [MapConfigurationService.ICON_SIZES.VEHICLE_MARKER_WIDTH / 2, MapConfigurationService.ICON_SIZES.VEHICLE_MARKER_HEIGHT / 2]
    });
  }

  private getVehicleDisplayData(vehicle: Vehicle): { icon: string; color: string } {
    if (vehicle.category === 'bus') {
      return { icon: '🚌', color: '#FF9800' };
    }
    return { icon: '🚊', color: '#4CAF50' };
  }

  private calculateNormalizedBearing(bearing: number): number {
    let normalizedBearing = bearing - 90;
    if (normalizedBearing < 0) {
      normalizedBearing += 360;
    }
    
    if (normalizedBearing > 90 && normalizedBearing < 270) {
      normalizedBearing = normalizedBearing + 180;
      if (normalizedBearing >= 360) {
        normalizedBearing -= 360;
      }
    }
    
    return normalizedBearing;
  }

  private generateVehicleIconHtml(vehicle: Vehicle, displayData: { icon: string; color: string }, bearing: number): string {
    return `
      <div class="vehicle-icon ${vehicle.category}" style="transform: rotate(${bearing}deg);">
        <div class="vehicle-body" style="background: ${displayData.color};">
          <span class="vehicle-emoji">${displayData.icon}</span>
          <span class="vehicle-line-on-icon">${vehicle.route_short_name}</span>
        </div>
      </div>
    `;
  }
}