import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { TransportStopsService, TransportStop } from './tram-stops.service';
import { GeolocationService, LocationData } from '../location/geolocation.service';
import { UiStateManagerService } from '../ui/ui-state-manager.service';
import { StopFilteringService } from '../ui/stop-filtering.service';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class StopLoadingCoordinatorService {
  private allStops: TransportStop[] = [];

  constructor(
    private transportStopsService: TransportStopsService,
    private geolocationService: GeolocationService,
    private uiStateManager: UiStateManagerService,
    private stopFilteringService: StopFilteringService
  ) {}

  loadNearestStops(transportType: 'tram' | 'bus'): Observable<TransportStop[]> {
    const hasCachedLocation = this.geolocationService.getCachedLocation() !== null;

    if (!hasCachedLocation) {
      this.initializeLoadingProcess();
    } else {
      this.uiStateManager.setErrorState(null);
    }

    this.uiStateManager.setLocationStatus({
      type: 'updating',
      message: 'Standort wird ermittelt…'
    });

    return this.geolocationService.getCurrentPosition().pipe(
      switchMap((position: LocationData, index: number) => {
        if (index === 0 && !hasCachedLocation) {
          this.updateLocationLoadingState();
        }
        this.emitLocationStatus(position, index);
        return this.loadStopsForLocation(position, transportType);
      }),
      catchError(() => {
        this.handleLocationError();
        this.uiStateManager.clearLocationStatus();
        return of([]);
      })
    );
  }

  loadDirectionsForStops(stops: TransportStop[], transportType: 'tram' | 'bus'): void {
    stops.forEach(stop => {
      // Show cached directions instantly while API loads
      const cached = this.transportStopsService.getCachedDirections(stop.stop_name, stop.stop_num, transportType);
      if (cached) {
        stop.directions = cached;
        stop.loadingDirections = false;
      }

      this.transportStopsService.getDirectionsAndDepartures(stop.stop_name, stop.stop_num, transportType).pipe(
        catchError(() => of({ directions: [] as string[], departures: [] as any[] }))
      ).subscribe(result => {
        stop.directions = result.directions;
        stop.departures = result.departures;
        stop.loadingDirections = false;
      });
    });
  }

  refreshStops(stops: TransportStop[], transportType: 'tram' | 'bus'): void {
    const requests = stops.map(stop =>
      this.transportStopsService.getDirectionsAndDepartures(stop.stop_name, stop.stop_num, transportType).pipe(
        catchError(() => of({ directions: stop.directions || [], departures: stop.departures || [] }))
      )
    );

    forkJoin(requests).subscribe(results => {
      results.forEach((result, index) => {
        const stop = stops[index];
        stop.directions = result.directions;
        stop.departures = result.departures;
      });
    });
  }

  loadDeparturesForStop(stop: TransportStop, transportType: 'tram' | 'bus'): Observable<any[]> {
    return this.transportStopsService.getDepartures(stop.stop_name, stop.stop_num, transportType);
  }

  loadAllStops(): void {
    this.transportStopsService.getStops().subscribe({
      next: (stops) => {
        this.allStops = stops;
      },
      error: (err) => console.error('Error loading all stops:', err)
    });
  }

  getVisibleStops(map: L.Map): TransportStop[] {
    if (this.allStops.length === 0) {
      return [];
    }

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const center = map.getCenter();
    
    const visibleStops = this.stopFilteringService.getVisibleStopsWithinBounds(this.allStops, bounds);
    const finalStops = visibleStops.length === 0 ? this.allStops : visibleStops;
    return this.stopFilteringService.getLimitedStopsByDistanceFromCenter(finalStops, center, zoom);
  }

  private initializeLoadingProcess(): void {
    this.uiStateManager.setLoadingState({
      isLoading: true,
      isLoadingLocation: true,
      loadingMessage: 'Ermittle Standort...'
    });
    this.uiStateManager.setErrorState(null);
  }

  private updateLocationLoadingState(): void {
    this.uiStateManager.setLoadingState({
      isLoadingLocation: false,
      loadingMessage: 'Suche nächste Haltestellen...'
    });
  }

  private loadStopsForLocation(position: LocationData, transportType: 'tram' | 'bus'): Observable<TransportStop[]> {
    const { latitude, longitude } = position;
    return this.transportStopsService.getNearestStops(latitude, longitude, 5, transportType).pipe(
      switchMap((stops: TransportStop[]) => {
        this.finishMainLoading();
        this.initializeStopsWithLoadingState(stops);
        this.loadDirectionsForStops(stops, transportType);
        return of(stops);
      }),
      catchError(() => {
        this.handleStopsError();
        return of([]);
      })
    );
  }

  private finishMainLoading(): void {
    this.uiStateManager.setLoadingState({
      isLoading: false,
      loadingMessage: ''
    });
  }

  private initializeStopsWithLoadingState(stops: TransportStop[]): void {
    stops.forEach(stop => {
      stop.loadingDirections = true;
    });
  }

  private handleStopsError(): void {
    this.uiStateManager.setErrorState('Fehler beim Laden der Haltestellen');
    this.resetLoadingState();
  }

  private handleLocationError(): void {
    this.uiStateManager.setErrorState('Standort konnte nicht ermittelt werden');
    this.resetLoadingState();
  }

  private resetLoadingState(): void {
    this.uiStateManager.setLoadingState({
      isLoading: false,
      isLoadingLocation: false,
      loadingMessage: ''
    });
  }

  private emitLocationStatus(position: LocationData, emissionIndex: number): void {
    const cached = this.geolocationService.getCachedLocation();
    const isCached = emissionIndex === 0 && cached &&
      cached.latitude === position.latitude && cached.longitude === position.longitude;

    if (isCached) {
      this.uiStateManager.setLocationStatus({
        type: 'cached',
        message: 'Gespeicherter Standort – wird aktualisiert…',
        accuracy: position.accuracy
      });
    } else if (position.accuracy > 100) {
      this.uiStateManager.setLocationStatus({
        type: 'imprecise',
        message: `Standort ungenau (±${Math.round(position.accuracy)}m) – wird verfeinert…`,
        accuracy: position.accuracy
      });
    } else {
      this.uiStateManager.setLocationStatus({
        type: 'precise',
        message: `Standort genau (±${Math.round(position.accuracy)}m)`,
        accuracy: position.accuracy
      });
    }
  }
}