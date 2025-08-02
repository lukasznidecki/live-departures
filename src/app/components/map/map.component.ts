import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService, LocationData } from '../../services/location/geolocation.service';
import { TransportStop } from '../../services/data/tram-stops.service';
import { Subscription } from 'rxjs';
import { MapInitializationService } from '../../services/map/map-initialization.service';
import { MapStateManagerService } from '../../services/map/map-state-manager.service';
import { MarkerManagementService } from '../../services/map/marker-management.service';
import { StopLoadingCoordinatorService } from '../../services/data/stop-loading-coordinator.service';
import { VehicleTrackingService } from '../../services/vehicle/vehicle-tracking.service';
import { DepartureLoaderService } from '../../services/data/departure-loader.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: L.Map;
  private locationSubscription!: Subscription;
  private userMarker!: L.Marker;
  private stopMarkers: L.Marker[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private geolocationService: GeolocationService,
    private mapInitializationService: MapInitializationService,
    private mapStateManagerService: MapStateManagerService,
    private markerManagementService: MarkerManagementService,
    private stopLoadingCoordinatorService: StopLoadingCoordinatorService,
    private vehicleTrackingService: VehicleTrackingService,
    private departureLoaderService: DepartureLoaderService
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.getCurrentLocation();
  }

  ngOnDestroy(): void {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    this.vehicleTrackingService.stopVehicleTracking();
    this.mapStateManagerService.clearMoveTimeout();
    
    if (this.map) {
      this.clearStopMarkers();
      this.vehicleTrackingService.clearAllVehicleMarkers(this.map);
      this.map.remove();
    }
  }

  private initializeMap(): void {
    this.map = this.mapInitializationService.createMap(this.mapContainer);
    this.userMarker = this.mapInitializationService.createUserLocationMarker();
    
    this.mapStateManagerService.setupMapMoveHandler(this.map, () => this.onMapMove());
    this.stopLoadingCoordinatorService.loadAllStops();
    this.vehicleTrackingService.startVehicleTracking(this.map);
  }

  private getCurrentLocation(): void {
    this.locationSubscription = this.geolocationService.getCurrentPosition().subscribe({
      next: (location: LocationData) => {
        this.mapStateManagerService.updateUserLocation(this.map, this.userMarker, location.latitude, location.longitude);
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

  retryLocation(): void {
    this.isLoading = true;
    this.error = null;
    this.getCurrentLocation();
  }

  private onMapMove(): void {
    this.updateVisibleStops();
  }

  private updateVisibleStops(): void {
    const visibleStops = this.stopLoadingCoordinatorService.getVisibleStops(this.map);
    this.clearStopMarkers();
    this.addStopMarkers(visibleStops);
  }

  private addStopMarkers(stops: TransportStop[]): void {
    this.stopMarkers = this.markerManagementService.createStopMarkers(
      stops, 
      this.map, 
      (stop, marker) => this.departureLoaderService.loadStopDepartures(stop, marker)
    );
  }

  private clearStopMarkers(): void {
    this.markerManagementService.clearMarkers(this.stopMarkers, this.map);
    this.stopMarkers = [];
  }

}
