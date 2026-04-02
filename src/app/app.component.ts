import { Component, OnInit, OnDestroy } from '@angular/core';
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
    imports: [RouterOutlet, MapComponent, CommonModule, FormsModule, HttpClientModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly AUTO_REFRESH_MS = 60_000;
  title = 'live-departures';
  activeTab: 'tram' | 'bus' | 'map' = 'tram';
  transportTab: 'tram' | 'bus' = 'tram';
  nearestStops: TransportStop[] = [];
  isLoading = false;
  isLoadingLocation = false;
  error: string | null = null;
  loadingMessage = '';
  selectedVehicleInfo: VehicleInfo | null = null;
  showVehicleInfoModal = false;

  // Pull-to-refresh
  pullDistance = 0;
  pullThreshold = 80;
  isRefreshing = false;
  private touchStartY = 0;
  private isPulling = false;

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
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
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

  onTouchStart(event: TouchEvent): void {
    const wrapper = event.currentTarget as HTMLElement;
    if (wrapper.scrollTop === 0 && !this.isLoading && !this.isRefreshing) {
      this.touchStartY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isPulling) return;
    const delta = event.touches[0].clientY - this.touchStartY;
    if (delta > 0) {
      this.pullDistance = Math.min(delta * 0.5, 120);
    } else {
      this.isPulling = false;
      this.pullDistance = 0;
    }
  }

  onTouchEnd(): void {
    if (!this.isPulling) return;
    this.isPulling = false;
    if (this.pullDistance >= this.pullThreshold) {
      this.isRefreshing = true;
      this.pullDistance = 60;
      this.loadNearestStops();
      setTimeout(() => {
        this.isRefreshing = false;
        this.pullDistance = 0;
      }, 1500);
    } else {
      this.pullDistance = 0;
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      if (this.nearestStops.length > 0 && !this.isLoading) {
        this.stopLoadingCoordinatorService.refreshStops(this.nearestStops, this.transportTab);
      }
    }, this.AUTO_REFRESH_MS);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
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
