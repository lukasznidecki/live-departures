import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MapComponent } from './components/map/map.component';
import { TransportStop } from './services/data/tram-stops.service';
import { StopLoadingCoordinatorService } from './services/data/stop-loading-coordinator.service';
import { ClipboardUtilityService } from './services/utilities/clipboard-utility.service';
import { DepartureExpansionService } from './services/data/departure-expansion.service';
import { UiStateManagerService } from './services/ui/ui-state-manager.service';
import { Departure, VehicleInfo, TransportStopsService } from './services/data/tram-stops.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MapComponent, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
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
  selectedVehicleInfo: VehicleInfo | null = null;
  showVehicleInfoModal = false;

  constructor(
    private stopLoadingCoordinatorService: StopLoadingCoordinatorService,
    private clipboardUtilityService: ClipboardUtilityService,
    private departureExpansionService: DepartureExpansionService,
    private uiStateManagerService: UiStateManagerService,
    private transportStopsService: TransportStopsService
  ) {}

  ngOnInit() {
    this.setupUiStateSubscription();
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
    this.stopLoadingCoordinatorService.loadNearestStops(this.transportTab).subscribe({
      next: (stops) => {
        this.nearestStops = stops;
      }
    });
  }

  private setupUiStateSubscription(): void {
    this.uiStateManagerService.getLoadingState().subscribe(state => {
      this.isLoading = state.isLoading;
      this.isLoadingLocation = state.isLoadingLocation;
      this.loadingMessage = state.loadingMessage;
    });

    this.uiStateManagerService.getErrorState().subscribe(errorState => {
      this.error = errorState.error;
    });
  }

  retryLoadStops() {
    this.loadNearestStops();
  }

  toggleStopExpansion(stopIndex: number) {
    this.departureExpansionService.toggleStopExpansion(
      this.nearestStops,
      stopIndex,
      this.transportTab,
      (index, updatedStop) => {
        this.nearestStops[index] = updatedStop;
      }
    );
  }

  async copyToClipboard(text: string, event: Event) {
    event.stopPropagation();
    
    try {
      const target = event.target as HTMLElement;
      await this.clipboardUtilityService.copyTextToClipboard(text, target);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  onDepartureClick(departure: Departure, event: Event) {
    event.stopPropagation();
    
    if (departure.vehicleNumber && departure.vehicleNumber.trim() !== '') {
      this.showVehicleInfo(departure.vehicleNumber);
    }
  }

  showVehicleInfo(vehicleNumber: string) {
    this.transportStopsService.getVehicleInfo().subscribe({
      next: (vehicleInfoList) => {
        const vehicleInfo = vehicleInfoList.find(info => info.kmk_id === vehicleNumber);
        if (vehicleInfo) {
          this.selectedVehicleInfo = vehicleInfo;
          this.showVehicleInfoModal = true;
        }
      },
      error: (err) => console.error('Error loading vehicle info:', err)
    });
  }

  closeVehicleInfoModal() {
    this.showVehicleInfoModal = false;
    this.selectedVehicleInfo = null;
  }

  async copyVehicleInfo(text: string, event: Event) {
    event.stopPropagation();
    
    try {
      const target = event.target as HTMLElement;
      await this.clipboardUtilityService.copyTextToClipboard(text, target);
    } catch (err) {
      console.error('Failed to copy vehicle info to clipboard:', err);
    }
  }

  private normalizeModelName(modelName: string): string {
    return modelName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  getVehicleImagePath(modelName: string): string | null {
    if (!modelName) return null;
    
    const normalizedName = this.normalizeModelName(modelName);
    const imagePath = `assets/vehicles_pics/${normalizedName}.jpg`;
    
    return imagePath;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
