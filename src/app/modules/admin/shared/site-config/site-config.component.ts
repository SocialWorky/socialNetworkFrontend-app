import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingController } from '@ionic/angular';

import { ConfigService } from '@shared/services/config.service';
import { FileUploadService } from '@shared/services/file-upload.service';
import { environment } from '@env/environment';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-site-config',
  templateUrl: './site-config.component.html',
  styleUrls: ['./site-config.component.scss'],
})
export class SiteConfigComponent implements OnInit, OnDestroy {

  configForm: FormGroup;

  defaultLogo = 'assets/img/navbar/worky-your-logo.png';

  imageFile: File | null = null;

  imagePreview: string | ArrayBuffer | null = null;

  urlApiFile = `${environment.APIFILESERVICE}config/`;

  loadUpdateConfigButtons = false;

  loginMethods = { email: true, google: true };

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
      loginMethods: [''],
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
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this.configForm.patchValue({
        logoUrl: configData.settings.logoUrl || '',
        title: configData.settings.title || '',
        privacyPolicy: configData.settings.privacyPolicy || '',
        contactEmail: configData.settings.contactEmail || '',
        faviconUrl: configData.settings.faviconUrl || '',
        loginMethods: configData.settings.loginMethods || '',
      });
      this._cdr.markForCheck();
    });
  }

  updateConfig() {
    this.loadUpdateConfigButtons = true;
    if (this.configForm.valid) {
      if (this.imageFile) {
        this._fileUploadService.uploadFile([this.imageFile], 'config').pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            this.configForm.patchValue({ logoUrl: this.urlApiFile + response[0].filenameCompressed });
            this.imageFile = null;
            this.submitUpdateConfig();
          },
          error: () => {
            this.loadUpdateConfigButtons = false;
            this._alertService.showAlert(
              'Error',
              'Error al subir archivo, intente de nuevo.',
              Alerts.ERROR,
              Position.CENTER,
              true,
              true,
              translations['button.ok']
            );
          }
        });
      } else {
        this.submitUpdateConfig();
      }
    }
  }

  async submitUpdateConfig() {
    const loadingReaction = await this._loadingCtrl.create({
      message: 'Actualizando Configuración...',
    });

    await loadingReaction.present();

    const config = this.configForm.value;
    this._configService.updateConfig(config).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this._alertService.showAlert(
          'Éxito',
          'Configuración actualizada correctamente',
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          true,
          translations['button.ok']
        );

        this._configService.setConfig(response);

        loadingReaction.dismiss();
        this.loadUpdateConfigButtons = false;
      },
      error: () => {
        loadingReaction.dismiss();
        this.loadUpdateConfigButtons = false;
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
