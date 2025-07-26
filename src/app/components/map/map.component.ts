import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService, LocationData } from '../../services/geolocation.service';
import { TramStopsService, TransportStop, Vehicle } from '../../services/tram-stops.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: L.Map;
  private locationSubscription!: Subscription;
  private vehicleSubscription!: Subscription;
  private userMarker!: L.Marker;
  private stopMarkers: L.Marker[] = [];
  private vehicleMarkers: Map<string, L.Marker> = new Map();
  private mapMoveTimeout: any;
  private lastLoadedBounds: L.LatLngBounds | null = null;
  private allStops: TransportStop[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private geolocationService: GeolocationService,
    private tramStopsService: TramStopsService
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.getCurrentLocation();
  }

  ngOnDestroy(): void {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.vehicleSubscription) {
      this.vehicleSubscription.unsubscribe();
    }
    if (this.mapMoveTimeout) {
      clearTimeout(this.mapMoveTimeout);
    }
    if (this.map) {
      this.clearStopMarkers();
      this.clearVehicleMarkers();
      this.map.remove();
    }
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [50.0647, 19.9450],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    const customIcon = L.divIcon({
      className: 'custom-location-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.userMarker = L.marker([50.0647, 19.9450], { icon: customIcon });

    this.map.on('moveend', () => this.onMapMove());
    this.map.on('zoomend', () => this.onMapMove());
    
    this.loadAllStops();
    
    this.loadVehicles();
  }

  private getCurrentLocation(): void {
    this.locationSubscription = this.geolocationService.getCurrentPosition().subscribe({
      next: (location: LocationData) => {
        this.updateMapLocation(location);
        this.updateVisibleStops();
        this.isLoading = false;
        this.error = null;
      },
      error: (error) => {
        console.error('Error getting location:', error);
        this.error = 'Unable to get your location. Please check location permissions.';
        this.isLoading = false;
      }
    });
  }

  private updateMapLocation(location: LocationData): void {
    const latLng = L.latLng(location.latitude, location.longitude);

    this.map.setView(latLng, 15);

    this.userMarker.setLatLng(latLng);
    this.userMarker.addTo(this.map);

  }

  retryLocation(): void {
    this.isLoading = true;
    this.error = null;
    this.getCurrentLocation();
  }

  private loadAllStops(): void {
    this.tramStopsService.getStops().subscribe({
      next: (stops) => {
        this.allStops = stops;
        
        if (this.map) {
          this.updateVisibleStops();
        }
      },
      error: (err) => console.error('Error loading all stops:', err)
    });
  }

  private onMapMove(): void {
    if (this.mapMoveTimeout) {
      clearTimeout(this.mapMoveTimeout);
    }

    this.mapMoveTimeout = setTimeout(() => {
      this.updateVisibleStops();
    }, 500);
  }

  private updateVisibleStops(): void {
    if (this.allStops.length === 0) {
      return;
    }

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    const center = this.map.getCenter();
    
    const extendedBounds = bounds.pad(0.3);
    const visibleStops = this.allStops.filter(stop => 
      extendedBounds.contains([stop.stop_lat, stop.stop_lon])
    );

    let finalStops = visibleStops;
    if (visibleStops.length === 0) {
      finalStops = this.allStops;
    }

    const maxStops = zoom > 15 ? 100 : zoom > 13 ? 60 : 40;
    
    const stopsWithDistance = finalStops.map(stop => ({
      ...stop,
      distance: this.calculateDistance(center.lat, center.lng, stop.stop_lat, stop.stop_lon)
    })).sort((a, b) => a.distance - b.distance).slice(0, maxStops);

    this.clearStopMarkers();
    this.addStopMarkers(stopsWithDistance);
  }

  private addStopMarkers(stops: TransportStop[]): void {
    stops.forEach((stop, index) => {
      const icon = this.createStopIcon(stop, index);
      const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon })
        .bindPopup(this.createStopPopup(stop), {
          closeOnClick: false,
          autoClose: false,
          closeOnEscapeKey: false,
          autoPan: true,
          keepInView: true,
          className: 'stable-popup'
        });
      
      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation();
        this.animateMarkerClick(e.target);
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
        this.loadDepartures(stop, marker);
      });
      
      marker.addTo(this.map);
      this.stopMarkers.push(marker);
    });
  }

  private animateMarkerClick(marker: any): void {
    const element = marker.getElement();
    if (element) {
      const stopIcon = element.querySelector('.stop-icon');
      if (stopIcon) {
        stopIcon.classList.add('clicked');
        
        setTimeout(() => {
          stopIcon.classList.remove('clicked');
        }, 600);
      }
    }
  }

  private loadDepartures(stop: TransportStop, marker: L.Marker): void {
    const category = stop.tram && stop.bus ? 'tram' : stop.tram ? 'tram' : 'bus';
    
    marker.setPopupContent(this.createStopPopupWithLoading(stop));
    
    this.tramStopsService.getDepartures(stop.stop_name, stop.stop_num, category).subscribe({
      next: (departures) => {
        marker.setPopupContent(this.createStopPopupWithDepartures(stop, departures));
      },
      error: (err) => {
        marker.setPopupContent(this.createStopPopupWithError(stop));
      }
    });
  }

  private createStopIcon(stop: TransportStop, index: number = 0): L.DivIcon {
    const isTram = stop.tram;
    const isBus = stop.bus;
    
    let iconClass = 'custom-stop-marker';
    let iconHtml = '';
    
    if (isTram && isBus) {
      iconClass += ' mixed-stop';
      iconHtml = '<div class="stop-icon mixed">🚊🚌</div>';
    } else if (isTram) {
      iconClass += ' tram-stop';
      iconHtml = '<div class="stop-icon tram">🚊</div>';
    } else {
      iconClass += ' bus-stop';
      iconHtml = '<div class="stop-icon bus">🚌</div>';
    }

    return L.divIcon({
      className: iconClass,
      html: iconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  private createStopPopup(stop: TransportStop): string {
    const types = [];
    if (stop.tram) types.push('🚊 Tram');
    if (stop.bus) types.push('🚌 Bus');
    
    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${types.join(', ')}</p>
        <p style="font-size: 12px; color: #666; margin-top: 8px;">Klicken für Abfahrten</p>
      </div>
    `;
  }

  private createStopPopupWithLoading(stop: TransportStop): string {
    const types = [];
    if (stop.tram) types.push('🚊 Tram');
    if (stop.bus) types.push('🚌 Bus');
    
    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${types.join(', ')}</p>
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
          <div class="loading-spinner" style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-size: 12px; color: #666;">Lade Abfahrten...</span>
        </div>
      </div>
    `;
  }

  private createStopPopupWithDepartures(stop: TransportStop, departures: any[]): string {
    const types = [];
    if (stop.tram) types.push('🚊 Tram');
    if (stop.bus) types.push('🚌 Bus');
    
    let departuresHtml = '';
    if (departures && departures.length > 0) {
      departuresHtml = `
        <div style="margin-top: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Abfahrten:</h4>
          ${departures.slice(0, 5).map(dep => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${dep.line}</span>
                <span style="font-size: 12px; color: #333;">${dep.direction}</span>
              </div>
              <span style="font-size: 12px; font-weight: 600; color: #667eea;">${dep.minutesUntilDeparture} min</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      departuresHtml = `
        <div style="margin-top: 12px;">
          <p style="font-size: 12px; color: #666; font-style: italic;">Keine Abfahrten</p>
        </div>
      `;
    }
    
    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${types.join(', ')}</p>
        ${departuresHtml}
      </div>
    `;
  }

  private createStopPopupWithError(stop: TransportStop): string {
    const types = [];
    if (stop.tram) types.push('🚊 Tram');
    if (stop.bus) types.push('🚌 Bus');
    
    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${types.join(', ')}</p>
        <div style="margin-top: 12px;">
          <p style="font-size: 12px; color: #e74c3c;">Fehler beim Laden der Abfahrten</p>
        </div>
      </div>
    `;
  }

  private clearStopMarkers(): void {
    this.stopMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.stopMarkers = [];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degree: number): number {
    return degree * (Math.PI / 180);
  }

  private loadVehicles(): void {
    this.vehicleSubscription = interval(5000).subscribe(() => {
      this.updateVehicles();
    });
    
    this.updateVehicles();
  }

  private updateVehicles(): void {
    this.tramStopsService.getActiveVehicles().subscribe({
      next: (vehicles) => {
        this.updateVehiclePositions(vehicles);
      },
      error: (err) => console.error('Error loading vehicles:', err)
    });
  }

  private updateVehiclePositions(vehicles: Vehicle[]): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const extendedBounds = bounds.pad(0.2);
    const activeVehicleIds = new Set<string>();

    vehicles.forEach(vehicle => {
      if (extendedBounds.contains([vehicle.latitude, vehicle.longitude])) {
        activeVehicleIds.add(vehicle.kmk_id);
        
        const existingMarker = this.vehicleMarkers.get(vehicle.kmk_id);
        
        if (existingMarker) {
          this.animateMarkerToPosition(existingMarker, vehicle);
          existingMarker.setPopupContent(this.createVehiclePopup(vehicle));
        } else {
          const icon = this.createVehicleIcon(vehicle);
          const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
            .bindPopup(this.createVehiclePopup(vehicle), {
              closeOnClick: false,
              autoClose: false,
              className: 'vehicle-popup'
            });

          marker.addTo(this.map);
          this.vehicleMarkers.set(vehicle.kmk_id, marker);
        }
      }
    });

    for (const [vehicleId, marker] of this.vehicleMarkers) {
      if (!activeVehicleIds.has(vehicleId)) {
        this.map.removeLayer(marker);
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

  private clearVehicleMarkers(): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      this.map.removeLayer(marker);
    }
    this.vehicleMarkers.clear();
  }
}
