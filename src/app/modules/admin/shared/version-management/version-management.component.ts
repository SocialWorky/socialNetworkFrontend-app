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
  
  // Estados separados para mejor control
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

  /**
   * SOLUCIÓN DEFINITIVA: Inicialización correcta del componente
   */
  private async initializeComponentCorrectly(): Promise<void> {
    try {
      this.isLoading = true;
      
      // PASO 1: Verificar conectividad del backend de manera CORRECTA
      await this.checkBackendConnectivityCorrectly();
      
      // STEP 2: If backend is connected, verify authentication
      if (this.backendConnected) {
        await this.checkAdminAuthenticationCorrectly();
        
        // STEP 3: Load data if everything is OK
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

  /**
   * SOLUCIÓN DEFINITIVA: Verificación CORRECTA de conectividad del backend
   */
  private async checkBackendConnectivityCorrectly(): Promise<void> {
    try {
      // Usar HEAD request para verificar conectividad sin procesar respuesta
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

  /**
   * SOLUCIÓN DEFINITIVA: Verificación CORRECTA de autenticación de admin
   */
  private async checkAdminAuthenticationCorrectly(): Promise<void> {
    try {
      // PASO 1: Verificar token en localStorage
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
      
      // PASO 2: Token válido y es admin
      this.adminAuthenticated = true;
      
      // PASO 3: Verificar permisos con el endpoint
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

  /**
   * SOLUCIÓN DEFINITIVA: Verificación CORRECTA de permisos de admin
   */
  private async verifyAdminPermissionsCorrectly(): Promise<void> {
    try {
      // Intentar acceder al endpoint protegido
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.API_URL}/app/versions`)
      );
      
      // Si llegamos aquí, el usuario tiene permisos
      this.canManageVersions = true;
      
    } catch (error: any) {
      // Manejar diferentes tipos de error
      if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
        
      } else if (error?.status === 403) {
        // Sin permisos suficientes
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Permisos Insuficientes', 
          'No tienes permisos para gestionar versiones.', 
          Alerts.WARNING
        );
        
      } else if (error?.status === 404) {
        // Endpoint no encontrado, pero el usuario está autenticado
        // Asumir que puede gestionar versiones (endpoint puede no existir aún)
        this.canManageVersions = true;
        
      } else {
        // Otro tipo de error - asumir que puede gestionar versiones
        this.canManageVersions = true;
      }
    }
  }

  async loadVersions() {
    if (!this.canManageVersions) {
      this.versions = [];
      return;
    }
    
    try {
      this.isLoading = true;
      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/versions`));
      
      if (response) {
        // Handle different response structures
        this.versions = response.data || response || [];
      }
    } catch (error: any) {
      if (error?.status === 404) {
        this.versions = [];
      } else if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        // Sin permisos
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
    }
  }

  async loadCurrentVersion() {
    if (!this.canManageVersions) {
      // Mantener la versión local si no hay permisos
      return;
    }
    
    try {
      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/version`));
      
      if (response) {
        // Handle different response structures
        const versionData = response.data || response;
        if (versionData) {
          this.currentVersion = versionData;
          this.isMaintenanceMode = versionData.maintenanceMode || false;
          this.updateMaintenanceFieldState();
        }
      }
    } catch (error: any) {
      if (error?.status === 404) {
        // Only log in development mode
        // Keep using local configuration when no backend version exists
      } else if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        // Sin permisos
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
        
        if (response.success) {
          this.alertService.showAlert('Éxito', 'Versión creada correctamente', Alerts.INFO);
          this.versionForm.reset();
          this.versionForm.patchValue({
            buildNumber: Date.now().toString(),
            releaseDate: new Date().toISOString().split('T')[0],
            forceUpdate: false
          });
          this.loadVersions();
          this.loadCurrentVersion();
          // Log de éxito eliminado - no es necesario para operaciones rutinarias
        }
      } catch (error: any) {
        if (error?.status === 401) {
          // Token expirado o inválido
          this.adminAuthenticated = false;
          this.canManageVersions = false;
          this.alertService.showAlert(
            'Sesión Expirada', 
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
            Alerts.WARNING
          );
        } else if (error?.status === 403) {
          // Sin permisos
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
      
      if (response.success) {
        this.alertService.showAlert('Éxito', 'Versión activada correctamente', Alerts.INFO);
        this.loadVersions();
        this.loadCurrentVersion();
      }
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        // Sin permisos
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

  /**
   * Actualizar el estado del campo de mensaje de mantenimiento
   */
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
        const response = await firstValueFrom(this.http.delete<any>(`${environment.API_URL}/app/maintenance`));
        
        if (response.success) {
          this.isMaintenanceMode = false;
          this.updateMaintenanceFieldState();
          this.alertService.showAlert('Éxito', 'Modo mantenimiento desactivado', Alerts.INFO);
          // Log de éxito eliminado - no es necesario para operaciones rutinarias
        }
      } else {
        const message = this.maintenanceForm.get('message')?.value;
        const response = await firstValueFrom(this.http.post<any>(`${environment.API_URL}/app/maintenance`, { message }));
        
        if (response.success) {
          this.isMaintenanceMode = true;
          this.updateMaintenanceFieldState();
          this.alertService.showAlert('Éxito', 'Modo mantenimiento activado', Alerts.INFO);
          // Log de éxito eliminado - no es necesario para operaciones rutinarias
        }
      }
      
      this.loadCurrentVersion();
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        // Sin permisos
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

  /**
   * Refrescar la autenticación y permisos
   */
  async refreshAuthentication() {
    try {
      this.isLoading = true;
      this.isInitializationComplete = false; // Ocultar interfaz durante refresh
      
      // Verificar si la autenticación está lista
      const token = this.authService.getDecodedToken();
      const authReady = token && token.role === 'admin';
      
      if (authReady) {
        // Reinicializar el componente
        await this.initializeComponentCorrectly();
      } else {
        // Mostrar mensaje de error
        this.alertService.showAlert(
          'Error de Autenticación', 
          'No se pudo verificar la autenticación. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
        // Marcar como completa para mostrar el error
        this.isInitializationComplete = true;
      }
      
    } catch (error) {
      console.error('❌ Error refreshing authentication:', error);
      // Marcar como completa para mostrar el error
      this.isInitializationComplete = true;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Forzar verificación completa de conectividad y autenticación
   */
  private async forceFullVerification(): Promise<void> {
    // Resetear estados
    this.backendConnected = false;
    this.adminAuthenticated = false;
    this.canManageVersions = false;
    
    // Verificar conectividad
    await this.checkBackendConnectivityCorrectly();
    
    if (this.backendConnected) {
      // Verificar autenticación
      await this.checkAdminAuthenticationCorrectly();
      
      // Cargar datos si todo está bien
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
   * Verificar permisos de administrador con el endpoint
   */
  private async verifyAdminPermissions(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<any>(`${environment.API_URL}/app/versions`));
      this.canManageVersions = true;
      
    } catch (error: any) {
      if (error?.status === 401) {
        // Token expirado o inválido
        this.adminAuthenticated = false;
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Sesión Expirada', 
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 
          Alerts.WARNING
        );
      } else if (error?.status === 403) {
        // Sin permisos suficientes
        this.canManageVersions = false;
        
        this.alertService.showAlert(
          'Permisos Insuficientes', 
          'No tienes permisos para gestionar versiones.', 
          Alerts.WARNING
        );
      } else if (error?.status === 404) {
        // Endpoint no encontrado, pero el usuario está autenticado
        // Asumir que puede gestionar versiones (endpoint puede no existir aún)
        this.canManageVersions = true;
        
      } else {
        // Otro tipo de error - asumir que puede gestionar versiones
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
    // Si la inicialización no está completa, mostrar loading
    if (!this.isInitializationComplete) {
      return 'loading';
    }
    
    const statusClass = !this.backendConnected ? 'disconnected' : !this.adminAuthenticated ? 'warning' : !this.canManageVersions ? 'warning' : 'connected';
    
    return statusClass;
  }

  getConnectionStatusText(): string {
    // Si la inicialización no está completa, mostrar mensaje de loading
    if (!this.isInitializationComplete) {
      return 'Inicializando...';
    }
    
    const statusText = !this.backendConnected ? 'Backend No Disponible' : !this.adminAuthenticated ? 'Usuario No Autenticado' : !this.canManageVersions ? 'Sin Permisos de Admin' : 'Conectado y Autenticado';
    
    return statusText;
  }

  /**
   * Verificar si se pueden mostrar las funcionalidades de gestión
   */
  canShowManagementFeatures(): boolean {
    const result = this.isInitializationComplete && this.backendConnected && this.adminAuthenticated && this.canManageVersions;
    
    return result;
  }

  /**
   * Inicialización del componente
   */
  private async initializeWithDetailedLogging(): Promise<void> {
    try {
      this.isLoading = true;
      this.isInitializationComplete = false;
      
      // PASO 1: Verificar localStorage y token
      await this.diagnoseAuthenticationState();
      
      // PASO 2: Verificar conectividad del backend
      await this.diagnoseBackendConnectivity();
      
      // PASO 3: Verificar autenticación de admin
      await this.diagnoseAdminAuthentication();
      
      // PASO 4: Verificar permisos
      await this.diagnoseAdminPermissions();
      
      // PASO 5: Cargar datos si todo está bien
      if (this.canManageVersions) {
        await this.loadVersions();
        await this.loadCurrentVersion();
      }
      
      // Marcar inicialización como completa
      this.isInitializationComplete = true;
      
      // Forzar actualización de la interfaz
      this.cdr.detectChanges();
      
      // Log final
      this.logFinalDiagnosis();
      
    } catch (error) {
      console.error('Error durante inicialización:', error);
      // Aún así, marcar como completa para mostrar error
      this.isInitializationComplete = true;
      // Forzar actualización de la interfaz
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Verificar estado de autenticación en localStorage
   */
  private async diagnoseAuthenticationState(): Promise<void> {
    try {
      // Verificar localStorage
      const rawToken = localStorage.getItem('token');
      const hasRawToken = !!rawToken && rawToken !== 'undefined' && rawToken !== 'null';
      
      if (!hasRawToken) {
        return;
      }
      
      // Verificar si se puede decodificar el token
      const decodedToken = this.authService.getDecodedToken();
      const hasDecodedToken = !!decodedToken;
      const tokenRole = decodedToken?.role;
      const isAdmin = tokenRole === 'admin';
      
      if (!isAdmin) {
        return;
      }
      
    } catch (error) {
      console.error('Error diagnosticando estado de autenticación:', error);
    }
  }

  /**
   * Verificar conectividad del backend
   */
  private async diagnoseBackendConnectivity(): Promise<void> {
    try {
      // Intentar HEAD request primero
      try {
        const headResponse = await firstValueFrom(
          this.http.head(`${environment.API_URL}/app/version`, { 
            observe: 'response'
          })
        );
        
        this.backendConnected = true;
        return;
        
      } catch (headError: any) {
        // HEAD falló, continuar con GET
      }
      
      // Si HEAD falló, intentar GET
      try {
        const getResponse = await firstValueFrom(
          this.http.get(`${environment.API_URL}/app/version`, { 
            observe: 'response'
          })
        );
        
        this.backendConnected = true;
        return;
        
      } catch (getError: any) {
        // Lógica de conectividad: cualquier status code significa conectado
        if (getError?.status) {
          this.backendConnected = true;
        } else {
          this.backendConnected = false;
        }
      }
      
    } catch (error) {
      console.error('Error durante diagnóstico de conectividad:', error);
      // Por defecto, asumir conectado si hay error
      this.backendConnected = true;
    }
  }

  /**
   * Verificar autenticación de admin
   */
  private async diagnoseAdminAuthentication(): Promise<void> {
    try {
      // Verificar token nuevamente
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
      console.error('Error durante diagnóstico de autenticación de admin:', error);
    }
  }

  /**
   * Verificar permisos de admin
   */
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
      // Manejar diferentes tipos de error
      if (error?.status === 401) {
        this.adminAuthenticated = false;
        this.canManageVersions = false;
      } else if (error?.status === 403) {
        this.canManageVersions = false;
      } else if (error?.status === 404) {
        // Endpoint no encontrado, pero usuario autenticado
        this.canManageVersions = true;
      } else {
        // Otro tipo de error - asumir permisos
        this.canManageVersions = true;
      }
    }
  }

  /**
   * Log del estado final
   */
  private logFinalDiagnosis(): void {
    // Solo registrar en caso de error o para auditoría crítica
    // Los logs de información rutinarios no son necesarios
  }
}