import { Injectable } from '@angular/core';
import { TransportStopsService, TransportStop } from './tram-stops.service';
import { PopupContentService } from '../ui/popup-content.service';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class DepartureLoaderService {

  constructor(
    private transportStopsService: TransportStopsService,
    private popupContentService: PopupContentService
  ) {}

  loadStopDepartures(stop: TransportStop, marker: L.Marker): void {
    const transportType = this.determineTransportType(stop);
    
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

  private determineTransportType(stop: TransportStop): 'tram' | 'bus' {
    return stop.tram && stop.bus ? 'tram' : stop.tram ? 'tram' : 'bus';
  }
}