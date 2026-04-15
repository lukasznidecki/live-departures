import { TestBed } from '@angular/core/testing';
import { of, Observable, Subject } from 'rxjs';
import { StopLoadingCoordinatorService } from './stop-loading-coordinator.service';
import { TransportStopsService, TransportStop } from './tram-stops.service';
import { GeolocationService, LocationData } from '../location/geolocation.service';
import { UiStateManagerService, LoadingState } from '../ui/ui-state-manager.service';
import { StopFilteringService } from '../ui/stop-filtering.service';

describe('StopLoadingCoordinatorService', () => {
  let service: StopLoadingCoordinatorService;
  let geolocationService: jasmine.SpyObj<GeolocationService>;
  let transportStopsService: jasmine.SpyObj<TransportStopsService>;
  let uiStateManager: UiStateManagerService;
  let loadingStates: Partial<LoadingState>[];

  const mockLocation: LocationData = { latitude: 50.0647, longitude: 19.9450, accuracy: 20 };
  const mockStops: TransportStop[] = [
    { stop_name: 'Stop A', stop_num: '1', stop_lat: 50.065, stop_lon: 19.945, tram: true, bus: false, distance: 50 },
    { stop_name: 'Stop B', stop_num: '2', stop_lat: 50.066, stop_lon: 19.946, tram: true, bus: false, distance: 100 },
  ];

  beforeEach(() => {
    const geoSpy = jasmine.createSpyObj('GeolocationService', ['getCurrentPosition', 'getCachedLocation']);
    const stopsSpy = jasmine.createSpyObj('TransportStopsService', [
      'getNearestStops', 'getCachedDirections', 'getDirectionsAndDepartures', 'getStops'
    ]);
    const filterSpy = jasmine.createSpyObj('StopFilteringService', [
      'getVisibleStopsWithinBounds', 'getLimitedStopsByDistanceFromCenter'
    ]);

    TestBed.configureTestingModule({
      providers: [
        StopLoadingCoordinatorService,
        { provide: GeolocationService, useValue: geoSpy },
        { provide: TransportStopsService, useValue: stopsSpy },
        { provide: StopFilteringService, useValue: filterSpy },
        UiStateManagerService,
      ]
    });

    service = TestBed.inject(StopLoadingCoordinatorService);
    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    transportStopsService = TestBed.inject(TransportStopsService) as jasmine.SpyObj<TransportStopsService>;
    uiStateManager = TestBed.inject(UiStateManagerService);

    transportStopsService.getNearestStops.and.returnValue(of(mockStops));
    transportStopsService.getCachedDirections.and.returnValue(null);
    transportStopsService.getDirectionsAndDepartures.and.returnValue(of({ directions: ['Dir1'], departures: [] }));

    loadingStates = [];
    uiStateManager.getLoadingState().subscribe(state => {
      loadingStates.push({ ...state });
    });
  });

  describe('loadNearestStops with cached location', () => {
    it('should NOT show Ermittle Standort spinner when cache exists', (done) => {
      geolocationService.getCachedLocation.and.returnValue(mockLocation);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: () => {
          // Should never have set isLoadingLocation to true
          const locationLoadingStates = loadingStates.filter(s => s.isLoadingLocation === true);
          expect(locationLoadingStates.length).toBe(0);
          done();
        }
      });
    });

    it('should NOT show Suche nächste Haltestellen message when cache exists', (done) => {
      geolocationService.getCachedLocation.and.returnValue(mockLocation);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: () => {
          const searchingStates = loadingStates.filter(s => s.loadingMessage === 'Suche nächste Haltestellen...');
          expect(searchingStates.length).toBe(0);
          done();
        }
      });
    });

    it('should return stops immediately from cached location', (done) => {
      geolocationService.getCachedLocation.and.returnValue(mockLocation);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: (stops) => {
          expect(stops.length).toBe(2);
          expect(stops[0].stop_name).toBe('Stop A');
          done();
        }
      });
    });
  });

  describe('loadNearestStops without cached location', () => {
    it('should show Ermittle Standort spinner when no cache', (done) => {
      geolocationService.getCachedLocation.and.returnValue(null);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: () => {
          const locationLoadingStates = loadingStates.filter(s => s.isLoadingLocation === true);
          expect(locationLoadingStates.length).toBeGreaterThan(0);
          done();
        }
      });
    });

    it('should show Ermittle Standort message when no cache', (done) => {
      geolocationService.getCachedLocation.and.returnValue(null);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: () => {
          const ermittleStates = loadingStates.filter(s => s.loadingMessage === 'Ermittle Standort...');
          expect(ermittleStates.length).toBeGreaterThan(0);
          done();
        }
      });
    });

    it('should transition to Suche nächste Haltestellen when no cache', (done) => {
      geolocationService.getCachedLocation.and.returnValue(null);
      geolocationService.getCurrentPosition.and.returnValue(of(mockLocation));

      service.loadNearestStops('tram').subscribe({
        next: () => {
          const searchingStates = loadingStates.filter(s => s.loadingMessage === 'Suche nächste Haltestellen...');
          expect(searchingStates.length).toBeGreaterThan(0);
          done();
        }
      });
    });
  });

  describe('progressive location updates', () => {
    it('should silently update stops when better location arrives with cache', (done) => {
      geolocationService.getCachedLocation.and.returnValue(mockLocation);

      const locationSubject = new Subject<LocationData>();
      geolocationService.getCurrentPosition.and.returnValue(locationSubject.asObservable());

      const allStops: TransportStop[][] = [];
      service.loadNearestStops('tram').subscribe({
        next: (stops) => allStops.push(stops),
      });

      // Emit cached location
      locationSubject.next(mockLocation);

      // Emit better GPS location
      const betterLocation: LocationData = { latitude: 50.07, longitude: 19.95, accuracy: 5 };
      const newStops: TransportStop[] = [{ stop_name: 'Stop C', stop_num: '3', stop_lat: 50.07, stop_lon: 19.95, tram: true, bus: false, distance: 10 }];
      transportStopsService.getNearestStops.and.returnValue(of(newStops));

      locationSubject.next(betterLocation);

      // Should never have triggered location loading spinner
      const locationLoadingStates = loadingStates.filter(s => s.isLoadingLocation === true);
      expect(locationLoadingStates.length).toBe(0);
      expect(allStops.length).toBe(2);
      done();
    });
  });

  describe('error handling', () => {
    it('should show error when geolocation fails and no cache', (done) => {
      geolocationService.getCachedLocation.and.returnValue(null);
      geolocationService.getCurrentPosition.and.returnValue(
        new Observable(observer => observer.error('Could not determine location.'))
      );

      let errorSet: string | null = null;
      uiStateManager.getErrorState().subscribe(state => {
        errorSet = state.error;
      });

      service.loadNearestStops('tram').subscribe({
        next: (stops) => {
          expect(stops).toEqual([]);
          expect(errorSet).toBe('Standort konnte nicht ermittelt werden');
          done();
        }
      });
    });
  });
});
