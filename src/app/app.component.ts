import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MapComponent } from './components/map/map.component';
import { TramStopsService, TransportStop } from './services/tram-stops.service';
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
  activeTab: 'tram' | 'bus' | 'map' = 'tram';
  transportTab: 'tram' | 'bus' = 'tram';
  nearestStops: TransportStop[] = [];
  isLoading = false;
  isLoadingLocation = false;
  error: string | null = null;
  loadingMessage = '';

  constructor(
    private tramStopsService: TramStopsService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit() {
    this.loadNearestStops();
  }

  setActiveTab(tab: 'tram' | 'bus' | 'map') {
    this.activeTab = tab;
    if (tab !== 'map') {
      this.setTransportTab(tab);
    }
  }

  setTransportTab(tab: 'tram' | 'bus') {
    this.transportTab = tab;
    this.loadNearestStops();
  }

  loadNearestStops() {
    this.isLoading = true;
    this.isLoadingLocation = true;
    this.error = null;
    this.loadingMessage = 'Ermittle Standort...';

    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => {
        this.isLoadingLocation = false;
        this.loadingMessage = 'Suche nächste Haltestellen...';
        
        const { latitude, longitude } = position;
        this.tramStopsService.getNearestStops(latitude, longitude, 5, this.transportTab).subscribe({
          next: (stops) => {
            this.nearestStops = stops.map(stop => ({
              ...stop,
              loadingDirections: true
            }));
            
            this.isLoading = false;
            this.loadingMessage = '';

            stops.forEach((stop, index) => {
              this.tramStopsService.getStopTimes(stop.stop_name, stop.stop_num, this.transportTab).subscribe({
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
            this.loadingMessage = '';
          }
        });
      },
      error: (err) => {
        this.error = 'Standort konnte nicht ermittelt werden';
        this.isLoading = false;
        this.isLoadingLocation = false;
        this.loadingMessage = '';
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

      this.tramStopsService.getDepartures(stop.stop_name, stop.stop_num, this.transportTab).subscribe({
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
      // Collapsing - start collapse animation
      this.nearestStops[stopIndex] = {
        ...stop,
        collapsing: true
      };
      
      // After animation completes, set expanded to false
      setTimeout(() => {
        this.nearestStops[stopIndex] = {
          ...this.nearestStops[stopIndex],
          expanded: false,
          collapsing: false
        };
      }, 300); // Match the CSS animation duration
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
