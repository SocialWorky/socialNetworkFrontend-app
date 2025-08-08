import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AlertService } from '@shared/services/alert.service';
import { Alerts } from '@shared/enums/alerts.enum';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { APP_VERSION_CONFIG } from '../../../../../app-version.config';

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
export class VersionManagementComponent implements OnInit {
  versionForm: FormGroup;
  maintenanceForm: FormGroup;
  versions: AppVersion[] = [];
  currentVersion: any = null;
  isLoading = false;
  isMaintenanceMode = false;
  backendConnected = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private alertService: AlertService,
    private logService: LogService
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
      message: ['Aplicación en mantenimiento. Volveremos pronto.', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCurrentVersionFromConfig();
    this.checkBackendConnection();
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
  }

  async checkBackendConnection() {
    try {
      this.isLoading = true;
      const response = await this.http.get<any>(`${environment.API_URL}/app/version`).toPromise();
      
      // Backend is reachable if we get any response
      this.backendConnected = true;
      this.loadVersions();
      this.loadCurrentVersion();
      
    } catch (error: any) {
      // Check if it's a 404 (no active version) - backend is still working
      if (error?.status === 404) {
        this.backendConnected = true;
        this.loadVersions();
        this.alertService.showAlert(
          'Información', 
          'Backend conectado. No hay versión activa registrada. Puedes crear la primera versión usando el formulario.', 
          Alerts.INFO
        );
      } else {
        // Real connection error
        this.backendConnected = false;
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Backend connection failed',
          { 
            error: error instanceof Error ? error.message : String(error),
            status: error?.status,
            url: `${environment.API_URL}/app/version`
          }
        );
        this.alertService.showAlert(
          'Error', 
          'Backend no disponible. Mostrando configuración local.', 
          Alerts.WARNING
        );
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadVersions() {
    if (!this.backendConnected) return;
    
    try {
      this.isLoading = true;
      const response = await this.http.get<any>(`${environment.API_URL}/app/versions`).toPromise();
      
      if (response) {
        // Handle different response structures
        this.versions = response.data || response || [];
      }
    } catch (error: any) {
      if (error?.status === 404) {
        this.versions = [];
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
    if (!this.backendConnected) return;
    
    try {
      const response = await this.http.get<any>(`${environment.API_URL}/app/version`).toPromise();
      
      // Only log in development mode
      if (!environment.PRODUCTION) {
        this.logService.log(
          LevelLogEnum.INFO,
          'VersionManagementComponent',
          'Current version response received',
          { response: response }
        );
      }
      
      if (response) {
        // Handle different response structures
        const versionData = response.data || response;
        if (versionData) {
          this.currentVersion = versionData;
          this.isMaintenanceMode = versionData.maintenanceMode || false;
          // Only log in development mode
          if (!environment.PRODUCTION) {
            this.logService.log(
              LevelLogEnum.INFO,
              'VersionManagementComponent',
              'Current version loaded from backend',
              { version: versionData.version }
            );
          }
        }
      }
    } catch (error: any) {
      if (error?.status === 404) {
        // Only log in development mode
        if (!environment.PRODUCTION) {
          this.logService.log(
            LevelLogEnum.INFO,
            'VersionManagementComponent',
            'No active version found in backend (404) - using local config'
          );
        }
        // Keep using local configuration when no backend version exists
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
    if (!this.backendConnected) {
      this.alertService.showAlert('Error', 'Backend no disponible. No se puede crear la versión.', Alerts.WARNING);
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

        const response = await this.http.post<any>(`${environment.API_URL}/app/version`, versionData).toPromise();
        
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
          this.logService.log(
            LevelLogEnum.INFO,
            'VersionManagementComponent',
            `Version ${versionData.version} created successfully`
          );
        }
      } catch (error) {
        this.logService.log(
          LevelLogEnum.ERROR,
          'VersionManagementComponent',
          'Error creating version',
          { error: error instanceof Error ? error.message : String(error) }
        );
        this.alertService.showAlert('Error', 'No se pudo crear la versión', Alerts.WARNING);
      } finally {
        this.isLoading = false;
      }
    }
  }

  async activateVersion(versionId: string) {
    if (!this.backendConnected) {
      this.alertService.showAlert('Error', 'Backend no disponible. No se puede activar la versión.', Alerts.WARNING);
      return;
    }

    try {
      this.isLoading = true;
      const response = await this.http.put<any>(`${environment.API_URL}/app/version/${versionId}/activate`, {}).toPromise();
      
      if (response.success) {
        this.alertService.showAlert('Éxito', 'Versión activada correctamente', Alerts.INFO);
        this.loadVersions();
        this.loadCurrentVersion();
        this.logService.log(
          LevelLogEnum.INFO,
          'VersionManagementComponent',
          `Version ${versionId} activated successfully`
        );
      }
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'VersionManagementComponent',
        'Error activating version',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.alertService.showAlert('Error', 'No se pudo activar la versión', Alerts.WARNING);
    } finally {
      this.isLoading = false;
    }
  }

  async toggleMaintenanceMode() {
    if (!this.backendConnected) {
      this.alertService.showAlert('Error', 'Backend no disponible. No se puede cambiar el modo mantenimiento.', Alerts.WARNING);
      return;
    }

    try {
      this.isLoading = true;
      
      if (this.isMaintenanceMode) {
        const response = await this.http.delete<any>(`${environment.API_URL}/app/maintenance`).toPromise();
        
        if (response.success) {
          this.isMaintenanceMode = false;
          this.alertService.showAlert('Éxito', 'Modo mantenimiento desactivado', Alerts.INFO);
          this.logService.log(
            LevelLogEnum.INFO,
            'VersionManagementComponent',
            'Maintenance mode disabled'
          );
        }
      } else {
        const message = this.maintenanceForm.get('message')?.value;
        const response = await this.http.post<any>(`${environment.API_URL}/app/maintenance`, { message }).toPromise();
        
        if (response.success) {
          this.isMaintenanceMode = true;
          this.alertService.showAlert('Éxito', 'Modo mantenimiento activado', Alerts.INFO);
          this.logService.log(
            LevelLogEnum.INFO,
            'VersionManagementComponent',
            'Maintenance mode activated'
          );
        }
      }
      
      this.loadCurrentVersion();
    } catch (error) {
      this.logService.log(
        LevelLogEnum.ERROR,
        'VersionManagementComponent',
        'Error toggling maintenance mode',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.alertService.showAlert('Error', 'No se pudo cambiar el modo mantenimiento', Alerts.WARNING);
    } finally {
      this.isLoading = false;
    }
  }

  generateBuildNumber() {
    this.versionForm.patchValue({
      buildNumber: Date.now().toString()
    });
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
    return this.backendConnected ? 'connected' : 'disconnected';
  }

  getConnectionStatusText(): string {
    return this.backendConnected ? 'Conectado al Backend' : 'Backend No Disponible';
  }
}