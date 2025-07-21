import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService, LocationData } from '../../services/geolocation.service';
import { TramStopsService, TransportStop } from '../../services/tram-stops.service';
import { Subscription } from 'rxjs';

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
  private userMarker!: L.Marker;
  private stopMarkers: L.Marker[] = [];
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
    if (this.mapMoveTimeout) {
      clearTimeout(this.mapMoveTimeout);
    }
    if (this.map) {
      this.clearStopMarkers();
      this.map.remove();
    }
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [50.0647, 19.9450], // Default to Krakow
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

    // Add event listeners for intelligent loading
    this.map.on('moveend', () => this.onMapMove());
    this.map.on('zoomend', () => this.onMapMove());
    
    // Load all stops data once at startup
    this.loadAllStops();
  }

  private getCurrentLocation(): void {
    this.locationSubscription = this.geolocationService.getCurrentPosition().subscribe({
      next: (location: LocationData) => {
        this.updateMapLocation(location);
        this.updateVisibleStops(); // Load stops intelligently
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

  // Load all stops data once and cache it
  private loadAllStops(): void {
    this.tramStopsService.getStops().subscribe({
      next: (stops) => {
        this.allStops = stops;
        
        // Trigger initial update if map is ready
        if (this.map) {
          this.updateVisibleStops();
        }
      },
      error: (err) => console.error('Error loading all stops:', err)
    });
  }

  // Map movement handling with debouncing
  private onMapMove(): void {
    if (this.mapMoveTimeout) {
      clearTimeout(this.mapMoveTimeout);
    }

    this.mapMoveTimeout = setTimeout(() => {
      this.updateVisibleStops();
    }, 500);
  }

  // Update visible stops based on current map view
  private updateVisibleStops(): void {
    if (this.allStops.length === 0) {
      return;
    }

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    const center = this.map.getCenter();
    
    // Get stops within extended bounds for smoother experience
    const extendedBounds = bounds.pad(0.3);
    const visibleStops = this.allStops.filter(stop => 
      extendedBounds.contains([stop.stop_lat, stop.stop_lon])
    );

    // If no stops in bounds, get nearest by distance
    let finalStops = visibleStops;
    if (visibleStops.length === 0) {
      finalStops = this.allStops;
    }

    // Limit based on zoom level
    const maxStops = zoom > 15 ? 100 : zoom > 13 ? 60 : 40;
    
    // Sort by distance and limit
    const stopsWithDistance = finalStops.map(stop => ({
      ...stop,
      distance: this.calculateDistance(center.lat, center.lng, stop.stop_lat, stop.stop_lon)
    })).sort((a, b) => a.distance - b.distance).slice(0, maxStops);

    this.clearStopMarkers();
    this.addStopMarkers(stopsWithDistance);
  }

  // Add markers for stops
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
      
      // Add click animation and load departures
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

  // Modern click animation
  private animateMarkerClick(marker: any): void {
    const element = marker.getElement();
    if (element) {
      const stopIcon = element.querySelector('.stop-icon');
      if (stopIcon) {
        // Add clicked class
        stopIcon.classList.add('clicked');
        
        // Remove class after animation
        setTimeout(() => {
          stopIcon.classList.remove('clicked');
        }, 600);
      }
    }
  }

  // Load departures for a stop
  private loadDepartures(stop: TransportStop, marker: L.Marker): void {
    const category = stop.tram && stop.bus ? 'tram' : stop.tram ? 'tram' : 'bus';
    
    // Update popup with loading state
    marker.setPopupContent(this.createStopPopupWithLoading(stop));
    
    this.tramStopsService.getDepartures(stop.stop_name, stop.stop_num, category).subscribe({
      next: (departures) => {
        // Update popup with departures
        marker.setPopupContent(this.createStopPopupWithDepartures(stop, departures));
      },
      error: (err) => {
        // Update popup with error
        marker.setPopupContent(this.createStopPopupWithError(stop));
      }
    });
  }

  // Create appropriate icon based on stop type
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

  // Create popup content for stop
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

  // Create popup with loading state
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

  // Create popup with departures
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

  // Create popup with error
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

  // Clear all stop markers
  private clearStopMarkers(): void {
    this.stopMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.stopMarkers = [];
  }

  // Distance calculation utility
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
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
}
