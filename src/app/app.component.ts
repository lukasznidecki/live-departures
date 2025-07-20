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
            this.nearestStops = stops.map(stop => ({
              ...stop,
              loadingDirections: true
            }));
            
            this.isLoading = false;

            stops.forEach((stop, index) => {
              this.tramStopsService.getStopTimes(stop.stop_name, stop.stop_num).subscribe({
                next: (directions) => {
                  this.nearestStops[index] = {
                    ...this.nearestStops[index],
                    directions: directions,
                    loadingDirections: false
                  };
                },
                error: (err) => {
                  this.nearestStops[index] = {
                    ...this.nearestStops[index],
                    loadingDirections: false
                  };
                }
              });
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

  toggleStopExpansion(stopIndex: number) {
    const stop = this.nearestStops[stopIndex];
    
    if (!stop.expanded) {
      // Expanding - load departures
      this.nearestStops[stopIndex] = {
        ...stop,
        expanded: true,
        loadingDepartures: true
      };

      this.tramStopsService.getDepartures(stop.stop_name, stop.stop_num).subscribe({
        next: (departures) => {
          this.nearestStops[stopIndex] = {
            ...this.nearestStops[stopIndex],
            departures: departures,
            loadingDepartures: false
          };
        },
        error: (err) => {
          this.nearestStops[stopIndex] = {
            ...this.nearestStops[stopIndex],
            loadingDepartures: false
          };
        }
      });
    } else {
      // Collapsing
      this.nearestStops[stopIndex] = {
        ...stop,
        expanded: false
      };
    }
  }

  async copyToClipboard(text: string, event: Event) {
    event.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Visual feedback
      const target = event.target as HTMLElement;
      const originalText = target.innerText;
      target.innerText = 'Kopiert!';
      target.style.background = '#4caf50';
      
      setTimeout(() => {
        target.innerText = originalText;
        target.style.background = '';
      }, 1000);
      
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }
}
