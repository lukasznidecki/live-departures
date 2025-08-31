import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapConfigurationService {

  static readonly ZOOM_LEVELS = {
    HIGH_DETAIL: 15,
    MEDIUM_DETAIL: 13,
    DEFAULT: 13
  } as const;

  static readonly MAX_VISIBLE_STOPS = {
    HIGH_ZOOM: 100,
    MEDIUM_ZOOM: 60,
    LOW_ZOOM: 40
  } as const;

  static readonly TIMEOUTS = {
    MAP_MOVE_DEBOUNCE_MS: 500,
    MARKER_ANIMATION_MS: 600,
    VEHICLE_UPDATE_INTERVAL_MS: 5000
  } as const;

  static readonly BOUNDS_PADDING = {
    STOP_VISIBILITY: 0.3,
    VEHICLE_VISIBILITY: 0.2
  } as const;

  static readonly DEFAULT_COORDINATES = {
    LATITUDE: 50.0647,
    LONGITUDE: 19.9450
  } as const;

  static readonly MAPBOX_CONFIG = {
    get ACCESS_TOKEN() { return environment.mapbox.accessToken; },
    STYLE_ID: 'mapbox/streets-v12',
    ATTRIBUTION: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
  } as const;

  static readonly ICON_SIZES = {
    STOP_MARKER: 32,
    VEHICLE_MARKER_WIDTH: 45,
    VEHICLE_MARKER_HEIGHT: 20,
    USER_LOCATION: 30
  } as const;

  getMaximumStopsForZoomLevel(zoomLevel: number): number {
    if (zoomLevel > MapConfigurationService.ZOOM_LEVELS.HIGH_DETAIL) {
      return MapConfigurationService.MAX_VISIBLE_STOPS.HIGH_ZOOM;
    }
    if (zoomLevel > MapConfigurationService.ZOOM_LEVELS.MEDIUM_DETAIL) {
      return MapConfigurationService.MAX_VISIBLE_STOPS.MEDIUM_ZOOM;
    }
    return MapConfigurationService.MAX_VISIBLE_STOPS.LOW_ZOOM;
  }

  getStopVisibilityBounds(): number {
    return MapConfigurationService.BOUNDS_PADDING.STOP_VISIBILITY;
  }

}