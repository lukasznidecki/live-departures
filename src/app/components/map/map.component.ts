import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService, LocationData } from '../../services/geolocation.service';
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
  isLoading = true;
  error: string | null = null;

  constructor(private geolocationService: GeolocationService) {}

  ngOnInit(): void {
    this.initializeMap();
    this.getCurrentLocation();
  }

  ngOnDestroy(): void {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.map) {
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
  }

  private getCurrentLocation(): void {
    this.locationSubscription = this.geolocationService.getCurrentPosition().subscribe({
      next: (location: LocationData) => {
        this.updateMapLocation(location);
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
    
    const accuracyCircle = L.circle(latLng, {
      radius: location.accuracy,
      fillColor: '#3388ff',
      fillOpacity: 0.2,
      color: '#3388ff',
      weight: 2,
      opacity: 0.6
    }).addTo(this.map);
  }

  retryLocation(): void {
    this.isLoading = true;
    this.error = null;
    this.getCurrentLocation();
  }
}
