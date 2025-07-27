import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { TransportStop } from '../data/tram-stops.service';
import { StopIconFactoryService } from '../factories/stop-icon-factory.service';
import { PopupContentService } from '../ui/popup-content.service';
import { MapConfigurationService } from './map-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class MarkerManagementService {

  constructor(
    private stopIconFactoryService: StopIconFactoryService,
    private popupContentService: PopupContentService
  ) {}

  createStopMarkers(
    stops: TransportStop[], 
    map: L.Map,
    onMarkerClick: (stop: TransportStop, marker: L.Marker) => void
  ): L.Marker[] {
    return stops.map((stop) => {
      const icon = this.stopIconFactoryService.createStopIcon(stop);
      const marker = L.marker([stop.stop_lat, stop.stop_lon], { icon })
        .bindPopup(this.popupContentService.createStopPopupInitial(stop), {
          closeOnClick: false,
          autoClose: false,
          closeOnEscapeKey: false,
          autoPan: true,
          keepInView: true,
          className: 'stable-popup'
        });
      
      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation();
        this.animateMarkerClick(e.target);
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
        onMarkerClick(stop, marker);
      });
      
      marker.addTo(map);
      return marker;
    });
  }

  clearMarkers(markers: L.Marker[], map: L.Map): void {
    markers.forEach(marker => {
      map.removeLayer(marker);
    });
  }

  animateMarkerClick(marker: any): void {
    const element = marker.getElement();
    if (element) {
      const stopIcon = element.querySelector('.stop-icon');
      if (stopIcon) {
        stopIcon.classList.add('clicked');
        setTimeout(() => {
          stopIcon.classList.remove('clicked');
        }, MapConfigurationService.TIMEOUTS.MARKER_ANIMATION_MS);
      }
    }
  }


}