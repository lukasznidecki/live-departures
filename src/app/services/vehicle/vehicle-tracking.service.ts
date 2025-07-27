import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { TransportStopsService, Vehicle } from '../data/tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class VehicleTrackingService {
  private readonly VEHICLE_UPDATE_INTERVAL = 5000;
  private readonly VEHICLE_BOUNDS_PADDING = 0.2;
  
  private vehicleSubscription?: Subscription;
  private vehicleMarkers = new Map<string, L.Marker>();

  constructor(private transportStopsService: TransportStopsService) {}

  startVehicleTracking(map: L.Map): void {
    this.setupVehicleUpdateInterval(map);
    this.updateVehicles(map);
  }

  stopVehicleTracking(): void {
    if (this.vehicleSubscription) {
      this.vehicleSubscription.unsubscribe();
    }
  }

  clearAllVehicleMarkers(map: L.Map): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      map.removeLayer(marker);
    }
    this.vehicleMarkers.clear();
  }

  private setupVehicleUpdateInterval(map: L.Map): void {
    this.vehicleSubscription = interval(this.VEHICLE_UPDATE_INTERVAL).subscribe(() => {
      this.updateVehicles(map);
    });
  }

  private updateVehicles(map: L.Map): void {
    this.transportStopsService.getActiveVehicles().subscribe({
      next: (vehicles) => {
        this.updateVehiclePositions(vehicles, map);
      },
      error: (err) => console.error('Error loading vehicles:', err)
    });
  }

  private updateVehiclePositions(vehicles: Vehicle[], map: L.Map): void {
    if (!map) return;

    const bounds = map.getBounds();
    const extendedBounds = bounds.pad(this.VEHICLE_BOUNDS_PADDING);
    const activeVehicleIds = new Set<string>();

    this.updateVisibleVehicles(vehicles, extendedBounds, activeVehicleIds, map);
    this.removeInvisibleVehicles(activeVehicleIds, map);
  }

  private updateVisibleVehicles(
    vehicles: Vehicle[], 
    extendedBounds: L.LatLngBounds, 
    activeVehicleIds: Set<string>,
    map: L.Map
  ): void {
    vehicles.forEach(vehicle => {
      if (this.isVehicleInBounds(vehicle, extendedBounds)) {
        activeVehicleIds.add(vehicle.kmk_id);
        this.updateOrCreateVehicleMarker(vehicle, map);
      }
    });
  }

  private isVehicleInBounds(vehicle: Vehicle, bounds: L.LatLngBounds): boolean {
    return bounds.contains([vehicle.latitude, vehicle.longitude]);
  }

  private updateOrCreateVehicleMarker(vehicle: Vehicle, map: L.Map): void {
    const existingMarker = this.vehicleMarkers.get(vehicle.kmk_id);
    
    if (existingMarker) {
      this.updateExistingVehicleMarker(existingMarker, vehicle);
    } else {
      this.createNewVehicleMarker(vehicle, map);
    }
  }

  private updateExistingVehicleMarker(marker: L.Marker, vehicle: Vehicle): void {
    this.animateMarkerToPosition(marker, vehicle);
    marker.setPopupContent(this.createVehiclePopup(vehicle));
  }

  private createNewVehicleMarker(vehicle: Vehicle, map: L.Map): void {
    const icon = this.createVehicleIcon(vehicle);
    const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
      .bindPopup(this.createVehiclePopup(vehicle), {
        closeOnClick: false,
        autoClose: false,
        className: 'vehicle-popup'
      });

    marker.addTo(map);
    this.vehicleMarkers.set(vehicle.kmk_id, marker);
  }

  private removeInvisibleVehicles(activeVehicleIds: Set<string>, map: L.Map): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      if (!activeVehicleIds.has(vehicleId)) {
        map.removeLayer(marker);
        this.vehicleMarkers.delete(vehicleId);
      }
    }
  }

  private animateMarkerToPosition(marker: L.Marker, vehicle: Vehicle): void {
    const currentLatLng = marker.getLatLng();
    const newLatLng = L.latLng(vehicle.latitude, vehicle.longitude);
    
    if (currentLatLng.distanceTo(newLatLng) > 1) {
      const newIcon = this.createVehicleIcon(vehicle);
      marker.setIcon(newIcon);
      marker.setLatLng(newLatLng);
    }
  }

  private createVehicleIcon(vehicle: Vehicle): L.DivIcon {
    const isBus = vehicle.category === 'bus';
    const icon = isBus ? '🚌' : '🚊';
    const color = isBus ? '#FF9800' : '#4CAF50';
    
    let normalizedBearing = vehicle.bearing - 90;
    if (normalizedBearing < 0) normalizedBearing += 360;
    
    if (normalizedBearing > 90 && normalizedBearing < 270) {
      normalizedBearing = normalizedBearing + 180;
      if (normalizedBearing >= 360) normalizedBearing -= 360;
    }
    
    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div class="vehicle-icon ${vehicle.category}" style="transform: rotate(${normalizedBearing}deg);">
          <div class="vehicle-body" style="background: ${color};">
            <span class="vehicle-emoji">${icon}</span>
            <span class="vehicle-line-on-icon">${vehicle.route_short_name}</span>
          </div>
        </div>
      `,
      iconSize: [45, 20],
      iconAnchor: [22, 10]
    });
  }

  private createVehiclePopup(vehicle: Vehicle): string {
    return `
      <div class="vehicle-popup">
        <h3>${vehicle.category === 'bus' ? 'Bus' : 'Straßenbahn'} ${vehicle.route_short_name}</h3>
        <p><strong>Richtung:</strong> ${vehicle.trip_headsign}</p>
        <p><strong>Fahrzeug:</strong> <span onclick="navigator.clipboard.writeText('${vehicle.kmk_id}'); const orig = this.innerHTML; const origBg = this.style.background; this.innerHTML='Kopiert!'; this.style.background='#4caf50'; setTimeout(() => {this.innerHTML=orig; this.style.background=origBg;}, 1500)" style="cursor: pointer; background: #e0e0e0; padding: 2px 6px; border-radius: 8px; font-size: 11px; color: #666; transition: all 0.2s ease; user-select: none;" onmouseover="this.style.background='#d0d0d0'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='#e0e0e0'; this.style.transform='scale(1)'" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1.05)'" title="Klicken zum Kopieren">${vehicle.kmk_id}</span></p>
        <p style="font-size: 12px; color: #666;">Live-Position</p>
      </div>
    `;
  }
}