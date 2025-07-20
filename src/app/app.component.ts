import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MapComponent } from './components/map/map.component';
import { TramStopsService, TramStop } from './services/tram-stops.service';
import { GeolocationService } from './services/geolocation.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MapComponent, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'location-map-app';
  activeTab: 'todo' | 'map' = 'todo';
  nearestStops: TramStop[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private tramStopsService: TramStopsService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit() {
    this.loadNearestStops();
  }

  setActiveTab(tab: 'todo' | 'map') {
    this.activeTab = tab;
  }

  loadNearestStops() {
    this.isLoading = true;
    this.error = null;

    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => {
        const { latitude, longitude } = position;
        this.tramStopsService.getNearestStops(latitude, longitude, 5).subscribe({
          next: (stops) => {
            const directionsRequests = stops.map(stop =>
              this.tramStopsService.getStopTimes(stop.stop_name, stop.stop_num)
            );

            forkJoin(directionsRequests).subscribe({
              next: (directionsArray) => {
                this.nearestStops = stops.map((stop, index) => ({
                  ...stop,
                  directions: directionsArray[index]
                }));
                this.isLoading = false;
              },
              error: (err) => {
                this.nearestStops = stops;
                this.isLoading = false;
              }
            });
          },
          error: (err) => {
            this.error = 'Fehler beim Laden der Haltestellen';
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Standort konnte nicht ermittelt werden';
        this.isLoading = false;
      }
    });
  }

  retryLoadStops() {
    this.loadNearestStops();
  }
}
