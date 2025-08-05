import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { TransportStopsService, Vehicle, VehicleInfo } from '../data/tram-stops.service';
import { UiStateManagerService } from '../ui/ui-state-manager.service';
import { ClipboardUtilityService } from '../utilities/clipboard-utility.service';

@Injectable({
  providedIn: 'root'
})
export class VehicleTrackingService {
  private readonly VEHICLE_UPDATE_INTERVAL = 5000;
  private readonly VEHICLE_BOUNDS_PADDING = 0.2;
  private readonly ANIMATION_DURATION = 800;
  private readonly DISTANCE_THRESHOLD = 1;
  private readonly SMOOTH_FACTOR = 0.1;

  private vehicleSubscription?: Subscription;
  private vehicleMarkers = new Map<string, L.Marker>();
  private vehicleAnimations = new Map<string, any>();
  private vehiclePositions = new Map<string, { lat: number; lng: number }>();
  private vehicleInfo = new Map<string, VehicleInfo>();
  private activeStablePopup: HTMLElement | null = null;

  constructor(
    private transportStopsService: TransportStopsService,
    private uiStateManagerService: UiStateManagerService,
    private clipboardUtilityService: ClipboardUtilityService
  ) {}

  startVehicleTracking(map: L.Map): void {
    this.loadVehicleInfo();
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
      this.cancelAnimation(vehicleId);
      map.removeLayer(marker);
    }
    this.vehicleMarkers.clear();
    this.vehicleAnimations.clear();
    this.vehiclePositions.clear();
    this.hideStablePopup();
  }

  private loadVehicleInfo(): void {
    this.transportStopsService.getVehicleInfo().subscribe({
      next: (vehicleInfoList) => {
        vehicleInfoList.forEach(info => {
          this.vehicleInfo.set(info.kmk_id, info);
        });
      },
      error: (err) => console.error('Error loading vehicle info:', err)
    });
  }

  highlightVehicle(vehicleId: string, map: L.Map): boolean {
    const marker = this.vehicleMarkers.get(vehicleId);
    if (marker) {
      marker.openPopup();
      map.setView(marker.getLatLng(), 17);
      return true;
    }
    return false;
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
  }

  private createNewVehicleMarker(vehicle: Vehicle, map: L.Map): void {
    const icon = this.createOptimizedVehicleIcon(vehicle);
    const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon });

    marker.on('click', () => {
      this.showVehicleStablePopup(vehicle, marker, map);
    });

    this.addVehicleEntranceAnimation(marker);
    marker.addTo(map);
    this.vehicleMarkers.set(vehicle.kmk_id, marker);
    this.vehiclePositions.set(vehicle.kmk_id, { lat: vehicle.latitude, lng: vehicle.longitude });
  }

  private removeInvisibleVehicles(activeVehicleIds: Set<string>, map: L.Map): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      if (!activeVehicleIds.has(vehicleId)) {
        this.cancelAnimation(vehicleId);
        this.addVehicleExitAnimation(marker, () => {
          map.removeLayer(marker);
          this.vehicleMarkers.delete(vehicleId);
          this.vehicleAnimations.delete(vehicleId);
          this.vehiclePositions.delete(vehicleId);
        });
      }
    }
  }

  private animateMarkerToPosition(marker: L.Marker, vehicle: Vehicle): void {
    const currentLatLng = marker.getLatLng();
    const newLatLng = L.latLng(vehicle.latitude, vehicle.longitude);
    const distance = currentLatLng.distanceTo(newLatLng);

    if (distance > this.DISTANCE_THRESHOLD) {
      this.updateVehicleSpeed(marker, currentLatLng, newLatLng);
      this.cancelAnimation(vehicle.kmk_id);
      this.smoothAnimateMarker(marker, currentLatLng, newLatLng, vehicle);
    } else {
      const newIcon = this.createOptimizedVehicleIcon(vehicle);
      marker.setIcon(newIcon);
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
    const info = this.vehicleInfo.get(vehicle.kmk_id);
    const fullModelName = info ? info.full_model_name : 'Modellinfo nicht verfügbar';
    const shortModelName = info ? info.short_model_name : '';
    const isLowFloor = info && info.floor === 'low_floor';
    const vehicleImagePath = this.getVehicleImagePath(shortModelName);

    return `
      <div class="modal-header">
        <h3 class="${vehicle.category}">${vehicle.category === 'bus' ? 'Bus' : 'Straßenbahn'} Informationen</h3>
      </div>
      <div class="modal-content">
        ${vehicleImagePath ? `
          <div class="vehicle-image-section">
            <img src="${vehicleImagePath}"
                 alt="${fullModelName}"
                 class="vehicle-image"
                 onerror="this.style.display='none'">
          </div>
        ` : ''}
        <div class="vehicle-info-grid">
          <div class="info-item">
            <span class="info-label">Fahrzeug-ID:</span>
            <span class="info-value copyable"
                  data-copy-text="${vehicle.kmk_id}"
                  title="Klicken zum Kopieren">${vehicle.kmk_id}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Linie:</span>
            <span class="info-value">${vehicle.route_short_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Richtung:</span>
            <span class="info-value">${vehicle.trip_headsign}</span>
          </div>
          ${isLowFloor ? `
            <div class="info-item">
              <span class="info-label">Barrierefreiheit:</span>
              <span class="info-value accessibility-icon">♿ Niederflur</span>
            </div>
          ` : ''}
          <div class="info-item">
            <span class="info-label">Modell:</span>
            <span class="info-value copyable"
                  data-copy-text="${fullModelName}"
                  title="Klicken zum Kopieren">${fullModelName}</span>
          </div>

        </div>
      </div>
    `;
  }

  private cancelAnimation(vehicleId: string): void {
    const animation = this.vehicleAnimations.get(vehicleId);
    if (animation) {
      cancelAnimationFrame(animation);
      this.vehicleAnimations.delete(vehicleId);
    }
  }

  private smoothAnimateMarker(
    marker: L.Marker,
    startLatLng: L.LatLng,
    endLatLng: L.LatLng,
    vehicle: Vehicle
  ): void {
    const startTime = performance.now();
    const startLat = startLatLng.lat;
    const startLng = startLatLng.lng;
    const deltaLat = endLatLng.lat - startLat;
    const deltaLng = endLatLng.lng - startLng;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

      const easedProgress = this.easeOutCubic(progress);

      const currentLat = startLat + (deltaLat * easedProgress);
      const currentLng = startLng + (deltaLng * easedProgress);
      const currentLatLng = L.latLng(currentLat, currentLng);

      marker.setLatLng(currentLatLng);

      if (progress < 1) {
        const animationId = requestAnimationFrame(animate);
        this.vehicleAnimations.set(vehicle.kmk_id, animationId);
      } else {
        const finalIcon = this.createOptimizedVehicleIcon(vehicle);
        marker.setIcon(finalIcon);
        marker.setLatLng(endLatLng);
        this.vehiclePositions.set(vehicle.kmk_id, { lat: endLatLng.lat, lng: endLatLng.lng });
        this.vehicleAnimations.delete(vehicle.kmk_id);
      }
    };

    const animationId = requestAnimationFrame(animate);
    this.vehicleAnimations.set(vehicle.kmk_id, animationId);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private createOptimizedVehicleIcon(vehicle: Vehicle): L.DivIcon {
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
      className: 'custom-vehicle-marker optimized-vehicle',
      html: `
        <div class="vehicle-icon ${vehicle.category} will-change-transform gpu-accelerated"
             style="transform: rotate(${normalizedBearing}deg) translateZ(0);">
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

  private addVehicleEntranceAnimation(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.add('entering');
      setTimeout(() => {
        element.classList.remove('entering');
        element.classList.add('active');
      }, 600);
    }
  }

  private addVehicleExitAnimation(marker: L.Marker, callback: () => void): void {
    const element = marker.getElement();
    if (element) {
      element.classList.add('exiting');
      setTimeout(callback, 400);
    } else {
      callback();
    }
  }

  private updateVehicleSpeed(marker: L.Marker, currentPos: L.LatLng, newPos: L.LatLng): void {
    const distance = currentPos.distanceTo(newPos);
    const element = marker.getElement();

    if (element && distance > 10) {
      element.classList.add('fast-moving');
      setTimeout(() => {
        element.classList.remove('fast-moving');
      }, 2000);
    }
  }

  private showVehicleStablePopup(vehicle: Vehicle, marker: L.Marker, map: L.Map): void {
    // Usuń poprzedni popup jeśli istnieje
    if (this.activeStablePopup) {
      this.activeStablePopup.remove();
      this.activeStablePopup = null;
    }

    // Utwórz popup element
    const popupElement = document.createElement('div');
    popupElement.className = 'stable-popup-overlay';
    popupElement.innerHTML = `
      <div class="stable-popup-content">
        <button class="stable-popup-close" aria-label="Close">×</button>
        ${this.createVehiclePopup(vehicle)}
      </div>
    `;

    // Dodaj event listeners
    const closeButton = popupElement.querySelector('.stable-popup-close');
    closeButton?.addEventListener('click', () => {
      this.hideStablePopup();
    });

    popupElement.addEventListener('click', (e) => {
      if (e.target === popupElement) {
        this.hideStablePopup();
      }
    });

    // Dodaj event listenery dla kopiowania
    const copyableElements = popupElement.querySelectorAll('.copyable');
    copyableElements.forEach(element => {
      element.addEventListener('click', async (e) => {
        e.stopPropagation();
        const copyText = (e.target as HTMLElement).getAttribute('data-copy-text');
        if (copyText) {
          try {
            await this.clipboardUtilityService.copyTextToClipboard(copyText, e.target as HTMLElement);
          } catch (err) {
            console.error('Failed to copy to clipboard:', err);
          }
        }
      });
    });

    // Dodaj do DOM
    document.body.appendChild(popupElement);
    this.activeStablePopup = popupElement;

    // Animacja wejścia
    requestAnimationFrame(() => {
      popupElement.classList.add('visible');
    });
  }

  private hideStablePopup(): void {
    if (this.activeStablePopup) {
      this.activeStablePopup.classList.remove('visible');
      setTimeout(() => {
        if (this.activeStablePopup) {
          this.activeStablePopup.remove();
          this.activeStablePopup = null;
        }
      }, 300);
    }
  }

  private normalizeModelName(modelName: string): string {
    return modelName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  private getVehicleImagePath(modelName: string): string | null {
    if (!modelName) return null;

    const normalizedName = this.normalizeModelName(modelName);
    const imagePath = `assets/vehicles_pics/${normalizedName}.jpg`;

    return imagePath;
  }
}
