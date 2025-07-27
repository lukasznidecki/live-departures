import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService, LocationData } from '../../services/geolocation.service';
import { TransportStopsService, TransportStop, Vehicle } from '../../services/tram-stops.service';
import { Subscription, interval } from 'rxjs';
import { PopupContentService } from '../../services/popup-content.service';
import { MapConfigurationService } from '../../services/map-configuration.service';
import { StopIconFactoryService } from '../../services/stop-icon-factory.service';
import { VehicleIconFactoryService } from '../../services/vehicle-icon-factory.service';
import { GeoUtilsService } from '../../services/geo-utils.service';
import { StopFilteringService } from '../../services/stop-filtering.service';

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
    private transportStopsService: TransportStopsService,
    private popupContentService: PopupContentService,
    private mapConfigurationService: MapConfigurationService,
    private stopIconFactoryService: StopIconFactoryService,
    private vehicleIconFactoryService: VehicleIconFactoryService,
    private geoUtilsService: GeoUtilsService,
    private stopFilteringService: StopFilteringService
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
      center: [MapConfigurationService.DEFAULT_COORDINATES.LATITUDE, MapConfigurationService.DEFAULT_COORDINATES.LONGITUDE],
      zoom: MapConfigurationService.ZOOM_LEVELS.DEFAULT,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    const userLocationIcon = this.stopIconFactoryService.createUserLocationIcon();
    this.userMarker = L.marker(
      [MapConfigurationService.DEFAULT_COORDINATES.LATITUDE, MapConfigurationService.DEFAULT_COORDINATES.LONGITUDE], 
      { icon: userLocationIcon }
    );

    this.map.on('moveend', () => this.onMapMove());
    this.map.on('zoomend', () => this.onMapMove());
    
    this.loadAllStops();
    this.startVehicleTracking();
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
    this.map.setView(latLng, MapConfigurationService.ZOOM_LEVELS.HIGH_DETAIL);
    this.userMarker.setLatLng(latLng);
    this.userMarker.addTo(this.map);
  }

  retryLocation(): void {
    this.isLoading = true;
    this.error = null;
    this.getCurrentLocation();
  }

  private loadAllStops(): void {
    this.transportStopsService.getStops().subscribe({
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
    }, MapConfigurationService.TIMEOUTS.MAP_MOVE_DEBOUNCE_MS);
  }

  private updateVisibleStops(): void {
    if (this.allStops.length === 0) {
      return;
    }

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    const center = this.map.getCenter();
    
    const visibleStops = this.stopFilteringService.getVisibleStopsWithinBounds(this.allStops, bounds);
    const finalStops = visibleStops.length === 0 ? this.allStops : visibleStops;
    const limitedStops = this.stopFilteringService.getLimitedStopsByDistanceFromCenter(finalStops, center, zoom);

    this.clearStopMarkers();
    this.addStopMarkers(limitedStops);
  }

  private addStopMarkers(stops: TransportStop[]): void {
    stops.forEach((stop) => {
      const icon = this.stopIconFactoryService.createStopIcon(stop);
      const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon })
        .bindPopup(this.popupContentService.createStopPopupInitial(stop), {
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
        }, MapConfigurationService.TIMEOUTS.MARKER_ANIMATION_MS);
      }
    }
  }

  private loadDepartures(stop: TransportStop, marker: L.Marker): void {
    const transportType = stop.tram && stop.bus ? 'tram' : stop.tram ? 'tram' : 'bus';
    
    marker.setPopupContent(this.popupContentService.createStopPopupWithLoadingState(stop));
    
    this.transportStopsService.getDepartures(stop.stop_name, stop.stop_num, transportType).subscribe({
      next: (departures) => {
        marker.setPopupContent(this.popupContentService.createStopPopupWithDepartures(stop, departures));
      },
      error: (err) => {
        marker.setPopupContent(this.popupContentService.createStopPopupWithErrorState(stop));
      }
    });
  }






  private clearStopMarkers(): void {
    this.stopMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.stopMarkers = [];
  }


  private startVehicleTracking(): void {
    this.vehicleSubscription = interval(MapConfigurationService.TIMEOUTS.VEHICLE_UPDATE_INTERVAL_MS).subscribe(() => {
      this.updateVehicles();
    });
    this.updateVehicles();
  }

  private updateVehicles(): void {
    this.transportStopsService.getActiveVehicles().subscribe({
      next: (vehicles) => {
        this.updateVehiclePositions(vehicles);
      },
      error: (err) => console.error('Error loading vehicles:', err)
    });
  }

  private updateVehiclePositions(vehicles: Vehicle[]): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const extendedBounds = bounds.pad(this.mapConfigurationService.getVehicleVisibilityBounds());
    const activeVehicleIds = new Set<string>();

    vehicles.forEach(vehicle => {
      if (extendedBounds.contains([vehicle.latitude, vehicle.longitude])) {
        activeVehicleIds.add(vehicle.kmk_id);
        
        const existingMarker = this.vehicleMarkers.get(vehicle.kmk_id);
        
        if (existingMarker) {
          this.updateExistingVehicleMarker(existingMarker, vehicle);
        } else {
          this.createNewVehicleMarker(vehicle);
        }
      }
    });

    this.removeInactiveVehicleMarkers(activeVehicleIds);
  }

  private updateExistingVehicleMarker(marker: L.Marker, vehicle: Vehicle): void {
    const currentLatLng = marker.getLatLng();
    const newLatLng = L.latLng(vehicle.latitude, vehicle.longitude);
    
    if (currentLatLng.distanceTo(newLatLng) > 1) {
      const updatedIcon = this.vehicleIconFactoryService.createVehicleIcon(vehicle);
      marker.setIcon(updatedIcon);
      marker.setLatLng(newLatLng);
    }
    marker.setPopupContent(this.popupContentService.createVehiclePopupContent(vehicle));
  }



  private createNewVehicleMarker(vehicle: Vehicle): void {
    const icon = this.vehicleIconFactoryService.createVehicleIcon(vehicle);
    const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
      .bindPopup(this.popupContentService.createVehiclePopupContent(vehicle), {
        closeOnClick: false,
        autoClose: false,
        className: 'vehicle-popup'
      });

    marker.addTo(this.map);
    this.vehicleMarkers.set(vehicle.kmk_id, marker);
  }

  private removeInactiveVehicleMarkers(activeVehicleIds: Set<string>): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      if (!activeVehicleIds.has(vehicleId)) {
        this.map.removeLayer(marker);
        this.vehicleMarkers.delete(vehicleId);
      }
    }
  }

  private clearVehicleMarkers(): void {
    for (const [vehicleId, marker] of this.vehicleMarkers) {
      this.map.removeLayer(marker);
    }
    this.vehicleMarkers.clear();
  }
}
