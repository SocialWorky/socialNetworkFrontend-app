import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AlertService } from '@shared/services/alert.service';
import { Alerts } from '@shared/enums/alerts.enum';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { APP_VERSION_CONFIG } from '../../../../../app-version.config';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom, Subject, takeUntil, interval, takeWhile } from 'rxjs';

interface AppVersion {
  id: string;
  version: string;
  buildNumber: string;
  releaseDate: Date;
  minRequiredVersion?: string;
  forceUpdate: boolean;
  changelog?: string;
  downloadUrl?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-version-management',
  templateUrl: './version-management.component.html',
  styleUrls: ['./version-management.component.scss'],
  standalone: false
})
export class VersionManagementComponent implements OnInit, OnDestroy {
  versionForm: FormGroup;
  maintenanceForm: FormGroup;
  versions: AppVersion[] = [];
  currentVersion: any = null;
  isLoading = false;
  isMaintenanceMode = false;
  
  backendConnected: boolean = false;
  adminAuthenticated: boolean = false;
  canManageVersions: boolean = false;

  // NEW: Complete initialization control
  isInitializationComplete: boolean = false;

  // Version changes modal properties
  showVersionChangesModal: boolean = false;
  selectedVersion: any = null;

  // Component destruction control
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private alertService: AlertService,
    private logService: LogService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.versionForm = this.fb.group({
      version: ['', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]],
      buildNumber: [Date.now().toString(), Validators.required],
      releaseDate: [new Date().toISOString().split('T')[0], Validators.required],
      minRequiredVersion: [''],
      forceUpdate: [false],
      changelog: ['', Validators.required],
      downloadUrl: ['']
    });

    this.maintenanceForm = this.fb.group({
      message: [{ value: 'Aplicación en mantenimiento. Volveremos pronto.', disabled: false }, Validators.required]
    });
  }

  ngOnInit() {
    this.loadCurrentVersionFromConfig();
    
    // Component initialization
    this.initializeWithDetailedLogging();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentVersionFromConfig() {
    this.currentVersion = {
      version: APP_VERSION_CONFIG.version,
      buildNumber: APP_VERSION_CONFIG.buildNumber,
      releaseDate: new Date(APP_VERSION_CONFIG.releaseDate),
      forceUpdate: APP_VERSION_CONFIG.forceUpdate,
      maintenanceMode: APP_VERSION_CONFIG.maintenanceMode,
      changelog: APP_VERSION_CONFIG.changelog,
      isActive: true
    };
    this.isMaintenanceMode = APP_VERSION_CONFIG.maintenanceMode;
    this.updateMaintenanceFieldState();
  }

  private async initializeComponentCorrectly(): Promise<void> {
    try {
      this.isLoading = true;
      
      await this.checkBackendConnectivityCorrectly();

      if (this.backendConnected) {
        await this.checkAdminAuthenticationCorrectly();

        if (this.canManageVersions) {
          await this.loadVersions();
          await this.loadCurrentVersion();
        }
      }
      
    } catch (error) {
      console.error('❌ Error during correct component initialization:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async checkBackendConnectivityCorrectly(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.head(`${environment.API_URL}/app/version`, { 
          observe: 'response'
        })
      );
      
      // If we reach here, backend responds correctly
      this.backendConnected = true;
      
    } catch (error: any) {
      // CORRECT LOGIC: Any server response means it's connected
      if (error?.status) {
        // Server responded with status code (even 404, 401, 403, 500, etc.)
        this.backendConnected = true;
      } else {
        // Only mark as disconnected if NO server response
        // (network error, timeout, CORS, etc.)
        this.backendConnected = false;
        
        // Show appropriate message
        this.alertService.showAlert(
          'Error de Conexión', 
          'No se pudo conectar con el servidor. Verifica tu conexión a internet.', 
          Alerts.WARNING
        );
      }
    }
  }

  private async checkAdminAuthenticationCorrectly(): Promise<void> {
    try {
      const token = this.authService.getDecodedToken();
      
      if (!token || token.role !== 'admin') {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Acceso Denegado', 
          'Se requieren permisos de administrador para gestionar versiones.', 
          Alerts.WARNING
        );
        return;
      }
      
      // STEP 2: Valid token and is admin
      this.adminAuthenticated = true;
      
      await this.verifyAdminPermissionsCorrectly();
      
    } catch (error) {
      this.adminAuthenticated = false;
      this.canManageVersions = false;
      
      this.alertService.showAlert(
        'Error de Autenticación', 
        'Error al verificar la autenticación. Por favor, inicia sesión nuevamente.', 
        Alerts.WARNING
      );
    }
  }

  private async verifyAdminPermissionsCorrectly(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.API_URL}/app/versions`)
      );
      
      // If we reach here, user has permissions
      this.canManageVersions = true;
      
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expired or invalid
        this.adminAuthenticated = false;
        this.canManageVersions = false;

        this.alertService.showAlert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          Alerts.WARNING
        );

      } else if (error?.status === 403) {
        this.canManageVersions = false;

        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para gestionar versiones.',
          Alerts.WARNING
        );

      } else if (error?.status === 404) {
        // Endpoint not found, but user is authenticated
        // Assume can manage versions (endpoint may not exist yet)
        this.canManageVersions = true;
        
      } else {
        this.canManageVersions = true;
      }
    }
  }

  async loadVersions() {
    if (!this.canManageVersions) {
      this.versions = [];
      this.cdr.detectChanges();
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/versions`));

      if (response) {
        // Handle different response structures - create new array reference
        const versionsData = response.data || response || [];
        // Ensure we have a new array reference for change detection
        this.versions = Array.isArray(versionsData) ? [...versionsData] : [];
      } else {
        this.versions = [];
      }
    } catch (error: any) {
      if (error?.status === 404) {
        this.versions = [];
      } else if (error?.status === 401) {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para ver el historial de versiones.',
          Alerts.WARNING
        );
      } else {
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Error loading versions',
          {
            error: error instanceof Error ? error.message : String(error),
            status: error?.status
          }
        );
        this.alertService.showAlert('Error', 'No se pudieron cargar las versiones', Alerts.WARNING);
      }
    } finally {
      this.isLoading = false;
      // Always trigger change detection after loading
      this.cdr.detectChanges();
    }
  }

  async loadCurrentVersion() {
    if (!this.canManageVersions) {
      // Keep local version if no permissions
      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/version`));

      if (response) {
        // Handle different response structures
        const versionData = response.data || response;
        if (versionData) {
          this.currentVersion = { ...versionData }; // New object reference
          this.isMaintenanceMode = versionData.maintenanceMode || false;
          this.updateMaintenanceFieldState();
        }
      }
    } catch (error: any) {
      if (error?.status === 404) {
        // Keep using local configuration when no backend version exists
      } else if (error?.status === 401) {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para ver la versión actual.',
          Alerts.WARNING
        );
      } else {
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Error loading current version',
          {
            error: error instanceof Error ? error.message : String(error),
            status: error?.status
          }
        );
      }
    } finally {
      this.cdr.detectChanges();
    }
  }

  async createVersion() {
    if (!this.canManageVersions) {
      this.alertService.showAlert('Error', 'Backend no disponible o permisos insuficientes. No se puede crear la versión.', Alerts.WARNING);
      return;
    }

    if (this.versionForm.valid) {
      try {
        this.isLoading = true;
        const formData = this.versionForm.value;
        
        // Prepare version data with proper defaults for PWA use case
        const versionData: any = {
          version: formData.version,
          buildNumber: formData.buildNumber,
          releaseDate: new Date(formData.releaseDate).toISOString(),
          changelog: formData.changelog,
          forceUpdate: formData.forceUpdate || false,
          maintenanceMode: false
        };

        // Only include optional fields if they have valid values
        if (formData.minRequiredVersion && formData.minRequiredVersion.trim()) {
          // Validate semver format
          if (/^\d+\.\d+\.\d+$/.test(formData.minRequiredVersion.trim())) {
            versionData.minRequiredVersion = formData.minRequiredVersion.trim();
          }
        }

        if (formData.downloadUrl && formData.downloadUrl.trim()) {
          // Validate URL format
          try {
            new URL(formData.downloadUrl.trim());
            versionData.downloadUrl = formData.downloadUrl.trim();
          } catch {
            // Invalid URL, skip it
          }
        }

        const response = await firstValueFrom(this.http.post<any>(`${environment.API_URL}/app/version`, versionData));

        // Backend returns AppVersion directly, not { success: true, data: ... }
        // Check if we got a valid response (has version property)
        if (response && (response.version || response.id)) {
          this.alertService.showAlert('Éxito', 'Versión creada correctamente', Alerts.INFO);
          this.versionForm.reset();
          this.versionForm.patchValue({
            buildNumber: Date.now().toString(),
            releaseDate: new Date().toISOString().split('T')[0],
            forceUpdate: false
          });
          // Wait for data to reload before completing
          await this.loadVersions();
          await this.loadCurrentVersion();
          // Force change detection to update the view
          this.cdr.detectChanges();
        } else {
          this.alertService.showAlert('Error', 'Respuesta inesperada del servidor', Alerts.WARNING);
        }
      } catch (error: any) {
        if (error?.status === 401) {
          // Token expired or invalid
          this.adminAuthenticated = false;
          this.canManageVersions = false;
          this.alertService.showAlert(
            'Sesión Expirada', 
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
            Alerts.WARNING
          );
        } else if (error?.status === 403) {
          this.canManageVersions = false;
          this.alertService.showAlert(
            'Permisos Insuficientes',
            'No tienes permisos para crear versiones.',
            Alerts.WARNING
          );
        } else {
          this.logService.log(
            LevelLogEnum.ERROR,
            'VersionManagementComponent',
            'Error creating version',
            { error: error instanceof Error ? error.message : String(error) }
          );
          this.alertService.showAlert('Error', 'No se pudo crear la versión', Alerts.WARNING);
        }
      } finally {
        this.isLoading = false;
      }
    }
  }

  async activateVersion(versionId: string) {
    if (!this.canManageVersions) {
      this.alertService.showAlert('Error', 'Backend no disponible o permisos insuficientes. No se puede activar la versión.', Alerts.WARNING);
      return;
    }

    try {
      this.isLoading = true;
      const response = await firstValueFrom(this.http.put<any>(`${environment.API_URL}/app/version/${versionId}/activate`, {}));

      // Backend returns AppVersion directly, not { success: true, ... }
      if (response && (response.version || response.id || response.isActive !== undefined)) {
        this.alertService.showAlert('Éxito', 'Versión activada correctamente', Alerts.INFO);
        await this.loadVersions();
        await this.loadCurrentVersion();
        this.cdr.detectChanges();
      } else {
        this.alertService.showAlert('Error', 'Respuesta inesperada del servidor', Alerts.WARNING);
      }
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expired or invalid
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para activar versiones.',
          Alerts.WARNING
        );
      } else {
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Error activating version',
          { error: error instanceof Error ? error.message : String(error) }
        );
        this.alertService.showAlert('Error', 'No se pudo activar la versión', Alerts.WARNING);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private updateMaintenanceFieldState(): void {
    const messageControl = this.maintenanceForm.get('message');
    if (messageControl) {
      if (this.isMaintenanceMode) {
        messageControl.disable();
      } else {
        messageControl.enable();
      }
    }
  }

  async toggleMaintenanceMode() {
    if (!this.canManageVersions) {
      this.alertService.showAlert('Error', 'Backend no disponible o permisos insuficientes. No se puede cambiar el modo mantenimiento.', Alerts.WARNING);
      return;
    }

    try {
      this.isLoading = true;

      if (this.isMaintenanceMode) {
        // DELETE /app/maintenance returns { message: string }
        const response = await firstValueFrom(this.http.delete<any>(`${environment.API_URL}/app/maintenance`));

        // Backend returns { message: '...' } on success
        if (response && (response.message || response.version || response.id)) {
          this.isMaintenanceMode = false;
          this.updateMaintenanceFieldState();
          this.alertService.showAlert('Éxito', 'Modo mantenimiento desactivado', Alerts.INFO);
        } else {
          this.alertService.showAlert('Error', 'Respuesta inesperada del servidor', Alerts.WARNING);
        }
      } else {
        const message = this.maintenanceForm.get('message')?.value;
        // POST /app/maintenance returns AppVersion
        const response = await firstValueFrom(this.http.post<any>(`${environment.API_URL}/app/maintenance`, { message }));

        // Backend returns AppVersion on success
        if (response && (response.version || response.id || response.maintenanceMode !== undefined)) {
          this.isMaintenanceMode = true;
          this.updateMaintenanceFieldState();
          this.alertService.showAlert('Éxito', 'Modo mantenimiento activado', Alerts.INFO);
        } else {
          this.alertService.showAlert('Error', 'Respuesta inesperada del servidor', Alerts.WARNING);
        }
      }

      await this.loadCurrentVersion();
      this.cdr.detectChanges();
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expired or invalid
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para cambiar el modo mantenimiento.',
          Alerts.WARNING
        );
      } else {
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Error toggling maintenance mode',
          { error: error instanceof Error ? error.message : String(error) }
        );
        this.alertService.showAlert('Error', 'No se pudo cambiar el modo mantenimiento', Alerts.WARNING);
      }
    } finally {
      this.isLoading = false;
    }
  }

  generateBuildNumber() {
    this.versionForm.patchValue({
      buildNumber: Date.now().toString()
    });
  }

  /**
   * Abrir modal para ver cambios de versión
   */
  viewVersionChanges(version: any): void {
    this.selectedVersion = version;
    this.showVersionChangesModal = true;
  }

  /**
   * Cerrar modal de cambios de versión
   */
  closeVersionChangesModal(): void {
    this.showVersionChangesModal = false;
    this.selectedVersion = null;
  }

  /**
   * Activar versión desde el modal
   */
  async activateVersionFromModal(versionId: string): Promise<void> {
    if (versionId) {
      await this.activateVersion(versionId);
      this.closeVersionChangesModal();
    }
  }

  async refreshAuthentication() {
    try {
      this.isLoading = true;
      this.isInitializationComplete = false;

      const token = this.authService.getDecodedToken();
      const authReady = token && token.role === 'admin';

      if (authReady) {
        await this.initializeComponentCorrectly();
      } else {
        this.alertService.showAlert(
          'Error de Autenticación',
          'No se pudo verificar la autenticación. Por favor, inicia sesión nuevamente.',
          Alerts.WARNING
        );
        this.isInitializationComplete = true;
      }

    } catch (error) {
      console.error('❌ Error refreshing authentication:', error);
      this.isInitializationComplete = true;
    } finally {
      this.isLoading = false;
    }
  }

  private async forceFullVerification(): Promise<void> {
    this.backendConnected = false;
    this.adminAuthenticated = false;
    this.canManageVersions = false;

    await this.checkBackendConnectivityCorrectly();

    if (this.backendConnected) {
      await this.checkAdminAuthenticationCorrectly();

      if (this.canManageVersions) {
        await this.loadVersions();
        await this.loadCurrentVersion();
      } else {
        console.warn('⚠️ Cannot manage versions after full verification');
      }
    } else {
      console.error('❌ Backend not connected after full verification');
    }
  }

  /**
   * Verify admin permissions with the endpoint
   */
  private async verifyAdminPermissions(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/versions`));
      this.canManageVersions = true;
      
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expired or invalid
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        this.canManageVersions = false;

        this.alertService.showAlert(
          'Permisos Insuficientes',
          'No tienes permisos para gestionar versiones.',
          Alerts.WARNING
        );
      } else if (error?.status === 404) {
        // Endpoint not found, but user is authenticated — assume can manage versions
        this.canManageVersions = true;
      } else {
        this.canManageVersions = true;
      }
    }
  }

  

  

  getVersionTypeLabel(version: any): string {
    if (version.maintenanceMode) return 'Mantenimiento';
    if (version.forceUpdate) return 'Forzada';
    return 'Opcional';
  }

  getVersionTypeClass(version: any): string {
    if (version.maintenanceMode) return 'maintenance';
    if (version.forceUpdate) return 'forced';
    return 'optional';
  }

  getConnectionStatusClass(): string {
    // If initialization is not complete, show loading
    if (!this.isInitializationComplete) {
      return 'loading';
    }
    
    const statusClass = !this.backendConnected ? 'disconnected' : !this.adminAuthenticated ? 'warning' : !this.canManageVersions ? 'warning' : 'connected';
    
    return statusClass;
  }

  getConnectionStatusText(): string {
    // If initialization is not complete, show loading message
    if (!this.isInitializationComplete) {
      return 'Inicializando...';
    }
    
    const statusText = !this.backendConnected ? 'Backend No Disponible' : !this.adminAuthenticated ? 'Usuario No Autenticado' : !this.canManageVersions ? 'Sin Permisos de Admin' : 'Conectado y Autenticado';
    
    return statusText;
  }

  canShowManagementFeatures(): boolean {
    const result = this.isInitializationComplete && this.backendConnected && this.adminAuthenticated && this.canManageVersions;
    
    return result;
  }

  private async initializeWithDetailedLogging(): Promise<void> {
    try {
      this.isLoading = true;
      this.isInitializationComplete = false;

      await this.diagnoseAuthenticationState();
      await this.diagnoseBackendConnectivity();
      await this.diagnoseAdminAuthentication();
      await this.diagnoseAdminPermissions();

      if (this.canManageVersions) {
        await this.loadVersions();
        await this.loadCurrentVersion();
      }

      this.isInitializationComplete = true;
      this.cdr.detectChanges();
      this.logFinalDiagnosis();

    } catch (error) {
      console.error('Error during initialization:', error);
      this.isInitializationComplete = true;
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
    }
  }

  private async diagnoseAuthenticationState(): Promise<void> {
    try {
      const rawToken = localStorage.getItem('token');
      const hasRawToken = !!rawToken && rawToken !== 'undefined' && rawToken !== 'null';

      if (!hasRawToken) {
        return;
      }

      const decodedToken = this.authService.getDecodedToken();
      const hasDecodedToken = !!decodedToken;
      const tokenRole = decodedToken?.role;
      const isAdmin = tokenRole === 'admin';

      if (!isAdmin) {
        return;
      }

    } catch (error) {
      console.error('Error diagnosing authentication state:', error);
    }
  }

  private async diagnoseBackendConnectivity(): Promise<void> {
    try {
      try {
        const headResponse = await firstValueFrom(
          this.http.head(`${environment.API_URL}/app/version`, { 
            observe: 'response'
          })
        );
        
        this.backendConnected = true;
        return;
        
      } catch (headError: any) {
        // HEAD failed, continue with GET
      }
      
      // If HEAD failed, try GET
      try {
        const getResponse = await firstValueFrom(
          this.http.get(`${environment.API_URL}/app/version`, { 
            observe: 'response'
          })
        );
        
        this.backendConnected = true;
        return;
        
      } catch (getError: any) {
        // Connectivity logic: any status code means connected
        if (getError?.status) {
          this.backendConnected = true;
        } else {
          this.backendConnected = false;
        }
      }
      
    } catch (error) {
      console.error('Error diagnosing backend connectivity:', error);
      // Default to connected if error is thrown without a status (network-level issue)
      this.backendConnected = true;
    }
  }

  private async diagnoseAdminAuthentication(): Promise<void> {
    try {
      const token = this.authService.getDecodedToken();

      if (!token || token.role !== 'admin') {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        return;
      }

      this.adminAuthenticated = true;

    } catch (error) {
      this.adminAuthenticated = false;
      this.canManageVersions = false;
      console.error('Error diagnosing admin authentication:', error);
    }
  }

  private async diagnoseAdminPermissions(): Promise<void> {
    if (!this.adminAuthenticated) {
      return;
    }
    
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.API_URL}/app/versions`)
      );
      
      this.canManageVersions = true;
      
    } catch (error: any) {
      if (error?.status === 401) {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
      } else if (error?.status === 403) {
        this.canManageVersions = false;
      } else if (error?.status === 404) {
        // Endpoint not found but user is authenticated — assume can manage versions
        this.canManageVersions = true;
      } else {
        this.canManageVersions = true;
      }
    }
  }

  private logFinalDiagnosis(): void {}
}