import { GeolocationService, LocationData } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;
  const CACHE_KEY = 'lastKnownLocation';

  const mockLocation: LocationData = {
    latitude: 50.0647,
    longitude: 19.9450,
    accuracy: 20
  };

  beforeEach(() => {
    service = new GeolocationService();
    localStorage.removeItem(CACHE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CACHE_KEY);
  });

  describe('getCachedLocation', () => {
    it('should return null when no cached location exists', () => {
      expect(service.getCachedLocation()).toBeNull();
    });

    it('should return location when a valid cached location exists', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        location: mockLocation,
        timestamp: Date.now()
      }));
      expect(service.getCachedLocation()).toEqual(mockLocation);
    });

    it('should return location even when cached location is hours old', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        location: mockLocation,
        timestamp: Date.now() - 3 * 60 * 60 * 1000 // 3 hours ago
      }));
      expect(service.getCachedLocation()).toEqual(mockLocation);
    });

    it('should return null when cached data is invalid JSON', () => {
      localStorage.setItem(CACHE_KEY, 'not-json');
      expect(service.getCachedLocation()).toBeNull();
    });
  });

  describe('getCurrentPosition', () => {
    let mockGeolocation: jasmine.SpyObj<Geolocation>;

    beforeEach(() => {
      mockGeolocation = jasmine.createSpyObj('Geolocation', ['getCurrentPosition']);
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true
      });
    });

    it('should emit cached location immediately without TTL restriction', (done) => {
      const oldTimestamp = Date.now() - 60 * 60 * 1000; // 1 hour ago
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        location: mockLocation,
        timestamp: oldTimestamp
      }));

      // Make both geolocation calls fail so only cache emits
      mockGeolocation.getCurrentPosition.and.callFake((_success, error) => {
        if (error) error(new GeolocationPositionError());
      });

      const emissions: LocationData[] = [];
      service.getCurrentPosition().subscribe({
        next: (loc) => emissions.push(loc),
        complete: () => {
          expect(emissions.length).toBe(1);
          expect(emissions[0]).toEqual(mockLocation);
          done();
        }
      });
    });

    it('should emit cached location first, then fresher location', (done) => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        location: mockLocation,
        timestamp: Date.now()
      }));

      const freshCoords = {
        latitude: 50.0700,
        longitude: 19.9500,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({})
      };
      const freshLocation = { coords: freshCoords, timestamp: Date.now(), toJSON: () => ({}) } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.and.callFake((success, _error) => {
        success(freshLocation);
      });

      const emissions: LocationData[] = [];
      service.getCurrentPosition().subscribe({
        next: (loc) => emissions.push(loc),
        complete: () => {
          // First emission is cache, then at least one fresh from geolocation API
          expect(emissions.length).toBeGreaterThanOrEqual(2);
          expect(emissions[0]).toEqual(mockLocation);
          expect(emissions[1].latitude).toBe(50.0700);
          done();
        }
      });
    });

    it('should update localStorage cache when fresh location arrives', (done) => {
      const freshCoords = {
        latitude: 50.0700,
        longitude: 19.9500,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({})
      };
      const freshLocation = { coords: freshCoords, timestamp: Date.now(), toJSON: () => ({}) } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.and.callFake((success, _error) => {
        success(freshLocation);
      });

      service.getCurrentPosition().subscribe({
        next: () => {},
        complete: () => {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
          expect(cached.location.latitude).toBe(50.0700);
          expect(cached.location.longitude).toBe(19.9500);
          done();
        }
      });
    });

    it('should error when no geolocation support', (done) => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true
      });

      service.getCurrentPosition().subscribe({
        error: (err) => {
          expect(err).toBe('Geolocation is not supported by this browser.');
          done();
        }
      });
    });

    it('should error when both requests fail and no cache', (done) => {
      mockGeolocation.getCurrentPosition.and.callFake((_success, error) => {
        if (error) error(new GeolocationPositionError());
      });

      service.getCurrentPosition().subscribe({
        error: (err) => {
          expect(err).toBe('Could not determine location.');
          done();
        }
      });
    });
  });
});

class GeolocationPositionError {
  code: 1 = 1;
  message = 'User denied geolocation';
  PERMISSION_DENIED: 1 = 1;
  POSITION_UNAVAILABLE: 2 = 2;
  TIMEOUT: 3 = 3;
}
