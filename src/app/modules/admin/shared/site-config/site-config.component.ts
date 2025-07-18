import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingController } from '@ionic/angular';

import { ConfigService } from '@shared/services/core-apis/config.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { environment } from '@env/environment';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
    selector: 'worky-site-config',
    templateUrl: './site-config.component.html',
    styleUrls: ['./site-config.component.scss'],
    standalone: false
})
export class SiteConfigComponent implements OnInit, OnDestroy {

  configForm: FormGroup;

  defaultLogo = 'assets/img/navbar/worky-your-logo.png';

  imageFile: File | null = null;

  imagePreview: string | ArrayBuffer | null = null;

  urlApiFile = `${environment.APIFILESERVICE}config/`;

  loadUpdateConfigButtons = false;

  loginMethods = { email: true, google: true };

  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _configService: ConfigService,
    private _cdr: ChangeDetectorRef,
    private _fileUploadService: FileUploadService,
    private _alertService: AlertService,
    private _loadingCtrl: LoadingController,
  ) {
    this.configForm = this._fb.group({
      logoUrl: [''],
      title: [''],
      privacyPolicy: [''],
      contactEmail: [''],
      faviconUrl: [''],
      urlSite: [''],
      description: [''],
      invitationCode: [false],
      loginMethods: this._fb.group({
        email: [false],
        google: [false],
      }),
    });
  }

  ngOnInit() {
    this.getSiteConfig();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSiteConfig() {
    this.error = null;
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (configData) => {
        let loginMethods = { email: false, google: false };

        if (configData.settings.loginMethods) {
          try {
           loginMethods = JSON.parse(configData.settings.loginMethods);

          } catch (error) {
            console.error('Error parsing loginMethods:', error);
          }
        }

        this.configForm.patchValue({
          logoUrl: configData.settings.logoUrl || '',
          title: configData.settings.title || '',
          privacyPolicy: configData.settings.privacyPolicy || '',
          contactEmail: configData.settings.contactEmail || '',
          faviconUrl: configData.settings.faviconUrl || '',
          urlSite: configData.settings.urlSite || '',
          description: configData.settings.description || '',
          invitationCode: configData.settings.invitationCode || false,
          loginMethods: {
            email: JSON.parse(String(loginMethods.email)),
            google: JSON.parse(String(loginMethods.google)),
          },
        });

        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading site config:', error);
        this.error = 'Error al cargar la configuración del sitio. Por favor, intenta de nuevo.';
        this._cdr.markForCheck();
      }
    });
  }

  updateConfig() {
    this.loadUpdateConfigButtons = true;
    this.error = null;
    
    if (this.configForm.valid) {
      if (this.imageFile) {
        this._fileUploadService.uploadFile([this.imageFile], 'config').pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            this.configForm.patchValue({ logoUrl: this.urlApiFile + response[0].filenameCompressed });
            this.imageFile = null;
            this.submitUpdateConfig();
          },
          error: (error) => {
            console.error('Error uploading file:', error);
            this.loadUpdateConfigButtons = false;
            this.error = 'Error al subir el archivo. Por favor, intenta de nuevo.';
            this._alertService.showAlert(
              'Error',
              'Error al subir archivo, intente de nuevo.',
              Alerts.ERROR,
              Position.CENTER,
              true,
              translations['button.ok']
            );
            this._cdr.markForCheck();
          }
        });
      } else {
        this.submitUpdateConfig();
      }
    } else {
      this.loadUpdateConfigButtons = false;
      this.error = 'Por favor, completa todos los campos requeridos.';
      this._cdr.markForCheck();
    }
  }

  async submitUpdateConfig() {
    const loadingReaction = await this._loadingCtrl.create({
      message: 'Actualizando Configuración...',
    });

    await loadingReaction.present();

    const config = { ...this.configForm.value };

    config.loginMethods = JSON.stringify(this.configForm.value.loginMethods);

    this._configService.updateConfig(config).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this._alertService.showAlert(
          'Éxito',
          'Configuración actualizada correctamente',
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok']
        );

        this._configService.setConfig(response);

        loadingReaction.dismiss();
        this.loadUpdateConfigButtons = false;
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error updating config:', error);
        this.error = 'Error al actualizar la configuración. Por favor, intenta de nuevo.';
        loadingReaction.dismiss();
        this.loadUpdateConfigButtons = false;
        this._cdr.markForCheck();
      }
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this._cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      this.configForm.patchValue({ logoUrl: '' });
    } else {
      this.imagePreview = null;
    }
  }
}
