import { Injectable } from '@angular/core';
import { TransportStopsService, TransportStop } from './tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class DepartureExpansionService {
  private readonly COLLAPSE_ANIMATION_DELAY = 300;

  constructor(private transportStopsService: TransportStopsService) {}

  toggleStopExpansion(
    stops: TransportStop[], 
    stopIndex: number, 
    transportType: 'tram' | 'bus',
    updateStopCallback: (index: number, updatedStop: TransportStop) => void
  ): void {
    const stop = stops[stopIndex];
    
    if (!stop.expanded) {
      this.expandStop(stop, stopIndex, transportType, updateStopCallback);
    } else {
      this.collapseStop(stop, stopIndex, updateStopCallback);
    }
  }

  private expandStop(
    stop: TransportStop, 
    stopIndex: number, 
    transportType: 'tram' | 'bus',
    updateStopCallback: (index: number, updatedStop: TransportStop) => void
  ): void {
    const expandedStop = {
      ...stop,
      expanded: true,
      loadingDepartures: true
    };
    
    updateStopCallback(stopIndex, expandedStop);

    this.loadDepartures(stop, transportType).subscribe({
      next: (departures) => {
        const stopWithDepartures = {
          ...expandedStop,
          departures: departures,
          loadingDepartures: false
        };
        updateStopCallback(stopIndex, stopWithDepartures);
      },
      error: () => {
        const stopWithError = {
          ...expandedStop,
          loadingDepartures: false
        };
        updateStopCallback(stopIndex, stopWithError);
      }
    });
  }

  private collapseStop(
    stop: TransportStop, 
    stopIndex: number,
    updateStopCallback: (index: number, updatedStop: TransportStop) => void
  ): void {
    const collapsingStop = {
      ...stop,
      collapsing: true
    };
    
    updateStopCallback(stopIndex, collapsingStop);
    
    setTimeout(() => {
      const collapsedStop = {
        ...collapsingStop,
        expanded: false,
        collapsing: false
      };
      updateStopCallback(stopIndex, collapsedStop);
    }, this.COLLAPSE_ANIMATION_DELAY);
  }

  private loadDepartures(stop: TransportStop, transportType: 'tram' | 'bus') {
    return this.transportStopsService.getDepartures(stop.stop_name, stop.stop_num, transportType);
  }
}