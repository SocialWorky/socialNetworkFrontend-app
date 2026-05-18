import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingController } from '@ionic/angular';

import { ConfigService } from '@shared/services/core-apis/config.service';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';

@Component({
    selector: 'worky-site-config',
    templateUrl: './site-config.component.html',
    styleUrls: ['./site-config.component.scss'],
    standalone: false
})
export class SiteConfigComponent implements OnInit, OnDestroy {

  configForm: FormGroup;
  paykuForm: FormGroup;

  defaultLogo = 'assets/img/navbar/worky-your-logo.png';

  imageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  selectedFileName: string = '';

  isLoading = true;
  loadUpdateConfigButtons = false;
  loadingPayku = false;
  paykuHasExistingPrivateToken = false;
  paykuHasExistingWebhookSecret = false;

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
    private _logService: LogService,
    private _utilityService: UtilityService,
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
      subscriptionMode: [false],
      loginMethods: this._fb.group({
        email: [false],
        google: [false],
      }),
    });

    this.paykuForm = this._fb.group({
      enabled: [false],
      mode: ['sandbox'],
      privateToken: [''],
      publicToken: [''],
      webhookSecret: [''],
      currency: ['CLP'],
    });
  }

  ngOnInit() {
    this.getSiteConfig();
    this.loadPaykuConfig();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSiteConfig(bypassCache: boolean = false) {
    this.isLoading = true;
    this.error = null;
    this._configService.getConfig(bypassCache).pipe(takeUntil(this.destroy$)).subscribe({
      next: (configData) => {
        this._logService.log(
          LevelLogEnum.INFO,
          'SiteConfigComponent',
          'Configuration loaded from server',
          { 
            configData,
            invitationCode: configData?.settings?.invitationCode,
            invitationCodeType: typeof configData?.settings?.invitationCode,
            title: configData?.settings?.title
          }
        );

        if (!configData || !configData.settings) {
          this._logService.log(
            LevelLogEnum.ERROR,
            'SiteConfigComponent',
            'Invalid config data structure',
            { configData }
          );
          this.isLoading = false;
          this._cdr.markForCheck();
          return;
        }

        let loginMethods = { email: false, google: false };

        if (configData.settings.loginMethods) {
          try {
           loginMethods = JSON.parse(configData.settings.loginMethods);

          } catch (error) {
            this._logService.log(
              LevelLogEnum.ERROR,
              'SiteConfigComponent',
              'Error parsing loginMethods configuration',
              { error: String(error), loginMethods: configData.settings.loginMethods }
            );
          }
        }

        const formValues = {
          logoUrl: configData.settings.logoUrl || '',
          title: configData.settings.title || '',
          privacyPolicy: configData.settings.privacyPolicy || '',
          contactEmail: configData.settings.contactEmail || '',
          faviconUrl: configData.settings.faviconUrl || '',
          urlSite: configData.settings.urlSite || '',
          description: configData.settings.description || '',
          invitationCode: configData.settings.invitationCode ?? false,
          subscriptionMode: configData.settings.subscriptionMode ?? false,
          loginMethods: {
            email: Boolean(loginMethods.email),
            google: Boolean(loginMethods.google),
          },
        };

        this._logService.log(
          LevelLogEnum.INFO,
          'SiteConfigComponent',
          'Updating form with loaded values',
          { formValues }
        );

        this.configForm.patchValue(formValues, { emitEvent: false });

        this.isLoading = false;
        // Force change detection to update UI
        this._cdr.detectChanges();
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'SiteConfigComponent',
          'Error loading site configuration',
          { error: String(error) }
        );
        this.error = translations['admin.siteConfig.errors.loadError'];
        this.isLoading = false;
        this._cdr.markForCheck();
      }
    });
  }

  updateConfig() {
    this.loadUpdateConfigButtons = true;
    this.error = null;
    
    if (this.configForm.valid) {
      if (this.imageFile) {
        // Use PROFILE_IMG type to ensure synchronous processing and immediate response
        this._fileUploadService.uploadFile([this.imageFile], 'config', null, null, TypePublishing.PROFILE_IMG).pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            // Handle the actual response structure: {message: string, files: Array}
            if (response && typeof response === 'object' && response.files && Array.isArray(response.files) && response.files.length > 0) {
              const uploadedFile = response.files[0];
              // Use urlCompressed or url - these are relative MinIO paths like "config/filename.jpg"
              const logoUrl = uploadedFile.urlCompressed || uploadedFile.url || '';
              
              if (!logoUrl) {
                this._logService.log(
                  LevelLogEnum.ERROR,
                  'SiteConfigComponent',
                  'No URL found in upload response',
                  { response, uploadedFile }
                );
                this.loadUpdateConfigButtons = false;
                this.error = translations['admin.siteConfig.errors.uploadError'];
                this._alertService.showAlert(
                  translations['admin.siteConfig.errors.title'],
                  translations['admin.siteConfig.errors.uploadError'],
                  Alerts.ERROR,
                  Position.CENTER,
                  true,
                  translations['button.ok']
                );
                this._cdr.markForCheck();
                return;
              }
              
              this.configForm.patchValue({ logoUrl });
              this.imageFile = null;
              this.imagePreview = null;
              this.selectedFileName = '';
              this.submitUpdateConfig();
            } else {
              this._logService.log(
                LevelLogEnum.ERROR,
                'SiteConfigComponent',
                'Invalid response structure from file upload service',
                { response }
              );
              this.loadUpdateConfigButtons = false;
              this.error = translations['admin.siteConfig.errors.uploadError'];
              this._alertService.showAlert(
                translations['admin.siteConfig.errors.title'],
                translations['admin.siteConfig.errors.uploadError'],
                Alerts.ERROR,
                Position.CENTER,
                true,
                translations['button.ok']
              );
              this._cdr.markForCheck();
            }
          },
          error: (error) => {
            this._logService.log(
              LevelLogEnum.ERROR,
              'SiteConfigComponent',
              'Error uploading configuration file',
              { error: String(error) }
            );
            this.loadUpdateConfigButtons = false;
            this.error = translations['admin.siteConfig.errors.uploadError'];
            this._alertService.showAlert(
              translations['admin.siteConfig.errors.title'],
              translations['admin.siteConfig.errors.uploadError'],
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
      this.error = translations['admin.siteConfig.errors.requiredFields'];
      this._cdr.markForCheck();
    }
  }

  async submitUpdateConfig() {
    const loadingReaction = await this._loadingCtrl.create({
      message: translations['admin.siteConfig.updating'],
    });

    await loadingReaction.present();

    // Build config object with all fields explicitly
    const config: any = {
      logoUrl: this.configForm.get('logoUrl')?.value || '',
      title: this.configForm.get('title')?.value || '',
      privacyPolicy: this.configForm.get('privacyPolicy')?.value || '',
      contactEmail: this.configForm.get('contactEmail')?.value || '',
      faviconUrl: this.configForm.get('faviconUrl')?.value || '',
      urlSite: this.configForm.get('urlSite')?.value || '',
      description: this.configForm.get('description')?.value || '',
      invitationCode: Boolean(this.configForm.get('invitationCode')?.value),
      subscriptionMode: Boolean(this.configForm.get('subscriptionMode')?.value),
      loginMethods: JSON.stringify(this.configForm.get('loginMethods')?.value || { email: false, google: false }),
    };

    this._logService.log(
      LevelLogEnum.INFO,
      'SiteConfigComponent',
      'Sending configuration update',
      { 
        config, 
        formValue: this.configForm.value,
        invitationCodeValue: this.configForm.get('invitationCode')?.value,
        invitationCodeType: typeof this.configForm.get('invitationCode')?.value
      }
    );

    this._configService.updateConfig(config).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this._logService.log(
          LevelLogEnum.INFO,
          'SiteConfigComponent',
          'Configuration updated successfully',
          { response }
        );

        this._alertService.showAlert(
          translations['admin.siteConfig.success.title'],
          translations['admin.siteConfig.success.message'],
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok']
        );

        this._configService.setConfig(response);

        // Clear preview and file selection after successful save
        this.imagePreview = null;
        this.imageFile = null;
        this.selectedFileName = '';

        loadingReaction.dismiss();
        this.loadUpdateConfigButtons = false;
        
        // Update form with response data immediately
        // Response has structure: { settings: {...}, customCss: string, ... }
        if (response && response.settings) {
          let loginMethods = { email: false, google: false };
          if (response.settings.loginMethods) {
            try {
              loginMethods = JSON.parse(response.settings.loginMethods);
            } catch (error) {
              this._logService.log(
                LevelLogEnum.ERROR,
                'SiteConfigComponent',
                'Error parsing loginMethods from response',
                { error: String(error) }
              );
            }
          }

          this._logService.log(
            LevelLogEnum.INFO,
            'SiteConfigComponent',
            'Updating form with saved values',
            { 
              responseSettings: response.settings,
              invitationCode: response.settings.invitationCode,
              invitationCodeType: typeof response.settings.invitationCode
            }
          );

          this.configForm.patchValue({
            logoUrl: response.settings.logoUrl || '',
            title: response.settings.title || '',
            privacyPolicy: response.settings.privacyPolicy || '',
            contactEmail: response.settings.contactEmail || '',
            faviconUrl: response.settings.faviconUrl || '',
            urlSite: response.settings.urlSite || '',
            description: response.settings.description || '',
            invitationCode: response.settings.invitationCode ?? false,
            subscriptionMode: response.settings.subscriptionMode ?? false,
            loginMethods: {
              email: Boolean(loginMethods.email),
              google: Boolean(loginMethods.google),
            },
          }, { emitEvent: false });
        }
        
        // Force change detection
        this._cdr.detectChanges();
        
        // Reload configuration from server to ensure we have the latest data
        // Use bypassCache to force fresh data from server
        // Use a small delay to allow the previous request to complete
        setTimeout(() => {
          this.getSiteConfig(true);
        }, 500);
      },
      error: (error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'SiteConfigComponent',
          'Error updating site configuration',
          { error: String(error) }
        );
        this.error = translations['admin.siteConfig.errors.updateError'];
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
      this.selectedFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this._cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      this.configForm.patchValue({ logoUrl: '' });
    } else {
      this.imagePreview = null;
      this.selectedFileName = '';
    }
  }

  /**
   * Get normalized image URL for display
   */
  getNormalizedImageUrl(url: string | null | undefined): string {
    if (!url) return this.defaultLogo;
    // If it's a blob URL (preview) or data URL, return as is
    if (typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))) {
      return url;
    }
    // If it's already a full URL (http/https), return as is
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      return url;
    }
    // Normalize MinIO URLs
    return this._utilityService.normalizeImageUrl(url, environment.MINIO_BUCKET_URL || '');
  }

  loadPaykuConfig() {
    this._configService.getConfigServices().pipe(takeUntil(this.destroy$)).subscribe({
      next: (servicesConfig: any) => {
        const payku = servicesConfig?.services?.payku;
        if (!payku) return;
        this.paykuHasExistingPrivateToken = !!payku.privateToken;
        this.paykuHasExistingWebhookSecret = !!payku.webhookSecret;
        this.paykuForm.patchValue({
          enabled: payku.enabled ?? false,
          mode: payku.mode ?? 'sandbox',
          publicToken: payku.publicToken ?? '',
          currency: payku.currency ?? 'CLP',
          privateToken: '',
          webhookSecret: '',
        }, { emitEvent: false });
        this._cdr.markForCheck();
      },
    });
  }

  savePaykuConfig() {
    if (this.paykuForm.invalid) return;
    this.loadingPayku = true;
    const formVal = this.paykuForm.value;
    const payload: any = {
      services: {
        payku: {
          enabled: formVal.enabled,
          mode: formVal.mode,
          publicToken: formVal.publicToken,
          currency: formVal.currency,
        },
      },
    };
    if (formVal.privateToken) payload.services.payku.privateToken = formVal.privateToken;
    if (formVal.webhookSecret) payload.services.payku.webhookSecret = formVal.webhookSecret;

    this._configService.updateConfig(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadingPayku = false;
        this.paykuHasExistingPrivateToken = this.paykuHasExistingPrivateToken || !!formVal.privateToken;
        this.paykuHasExistingWebhookSecret = this.paykuHasExistingWebhookSecret || !!formVal.webhookSecret;
        this.paykuForm.patchValue({ privateToken: '', webhookSecret: '' }, { emitEvent: false });
        this._alertService.showAlert(
          translations['admin.paykuSaved'],
          '',
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok'],
        );
        this._cdr.markForCheck();
      },
      error: () => {
        this.loadingPayku = false;
        this._cdr.markForCheck();
      },
    });
  }

  /**
   * Handle image load error
   */
  onImageError(event: any): void {
    this._logService.log(
      LevelLogEnum.WARN,
      'SiteConfigComponent',
      'Image failed to load',
      { src: event.target?.src }
    );
    // Fallback to default logo on error
    if (event.target) {
      event.target.src = this.defaultLogo;
    }
  }
}
