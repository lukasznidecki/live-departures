import {Injectable} from '@angular/core';
import {TransportStop, Vehicle} from '../data/tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class PopupContentService {

  createStopPopupInitial(stop: TransportStop): string {
    const transportTypes = this.getTransportTypesDisplay(stop);

    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${transportTypes}</p>
        <p style="font-size: 12px; color: #666; margin-top: 8px;">Klicken für Abfahrten</p>
      </div>
    `;
  }

  createStopPopupWithLoadingState(stop: TransportStop): string {
    const transportTypes = this.getTransportTypesDisplay(stop);

    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${transportTypes}</p>
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
          <div class="loading-spinner" style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-size: 12px; color: #666;">Lade Abfahrten...</span>
        </div>
      </div>
    `;
  }

  createStopPopupWithDepartures(stop: TransportStop, departures: any[]): string {
    const transportTypes = this.getTransportTypesDisplay(stop);
    const departuresContent = this.generateDeparturesContent(departures);

    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${transportTypes}</p>
        ${departuresContent}
      </div>
    `;
  }

  createStopPopupWithErrorState(stop: TransportStop): string {
    const transportTypes = this.getTransportTypesDisplay(stop);

    return `
      <div class="stop-popup">
        <h3>${stop.stop_name}</h3>
        <p><strong>Nummer:</strong> ${stop.stop_num}</p>
        <p><strong>Verkehrsmittel:</strong> ${transportTypes}</p>
        <div style="margin-top: 12px;">
          <p style="font-size: 12px; color: #e74c3c;">Fehler beim Laden der Abfahrten</p>
        </div>
      </div>
    `;
  }


  private getTransportTypesDisplay(stop: TransportStop): string {
    const types: string[] = [];
    if (stop.tram) types.push('🚊 Tram');
    if (stop.bus) types.push('🚌 Bus');
    return types.join(', ');
  }

  private generateDeparturesContent(departures: any[]): string {
    if (!departures || departures.length === 0) {
      return `
        <div style="margin-top: 12px;">
          <p style="font-size: 12px; color: #666; font-style: italic;">Keine Abfahrten</p>
        </div>
      `;
    }

    const departureItems = departures
      .slice(0, 5)
      .map(departure => this.createDepartureItemHtml(departure))
      .join('');

    return `
      <div style="margin-top: 12px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Abfahrten:</h4>
        ${departureItems}
      </div>
    `;
  }

  private createDepartureItemHtml(departure: any): string {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${departure.line}</span>
          <span style="font-size: 12px; color: #333;">${departure.direction}</span>
        </div>
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">${departure.minutesUntilDeparture} min</span>
      </div>
    `;
  }

  private createCopyableVehicleId(vehicleId: string): string {
    return `<span onclick="navigator.clipboard.writeText('${vehicleId}'); const orig = this.innerHTML; const origBg = this.style.background; this.innerHTML='Kopiert!'; this.style.background='#4caf50'; setTimeout(() => {this.innerHTML=orig; this.style.background=origBg;}, 1500)" style="cursor: pointer; background: #e0e0e0; padding: 2px 6px; border-radius: 8px; font-size: 11px; color: #666; transition: all 0.2s ease; user-select: none;" onmouseover="this.style.background='#d0d0d0'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='#e0e0e0'; this.style.transform='scale(1)'" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1.05)'" title="Klicken zum Kopieren">${vehicleId}</span>`;
  }
}
