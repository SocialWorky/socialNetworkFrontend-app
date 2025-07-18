import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ConfigService } from '@shared/services/core-apis/config.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'worky-custom-css',
    templateUrl: './custom-css.component.html',
    styleUrls: ['./custom-css.component.scss'],
    standalone: false
})
export class CustomCssComponent implements OnDestroy {

  editorOptions = {
    theme: 'vs-dark',
    language: 'css',
    contextmenu: true,
    minimap: {
      enabled: false
    },
    fontSize: 14,
    fontFamily: 'Fira Code, Monaco, Consolas, monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    wordBasedSuggestions: true
  };

  customCss: string = '';
  customCssLoader: boolean = false;
  showPreview: boolean = false;
  error: string | null = null;
  originalCss: string = '';

  private destroy$ = new Subject<void>();

  constructor(private _configService: ConfigService, private _cdr: ChangeDetectorRef) {
    this.loadCustomCss();
  }

  async saveCustomCss() {
    this.customCssLoader = true;
    this.error = null;
    
    await this._configService.updateConfig({ customCss: this.customCss }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.customCssLoader = false;
        this._configService.setConfig(data);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error saving CSS:', error);
        this.error = 'Error al guardar el CSS personalizado. Por favor, intenta de nuevo.';
        this.customCssLoader = false;
        this._cdr.markForCheck();
      },
    });
    this.applyCustomCss();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadCustomCss() {
    await this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (configData) => {
        if (configData.customCss) {
          this.customCss = String(configData.customCss);
          this.originalCss = this.customCss;
          this._cdr.markForCheck();
          this.applyCustomCss();
        }
      },
      error: (error) => {
        console.error('Error loading CSS:', error);
        this.error = 'Error al cargar el CSS personalizado. Por favor, intenta de nuevo.';
        this._cdr.markForCheck();
      }
    });
  }

  applyCustomCss() {
    let styleElement = document.getElementById('custom-css') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-css';
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = this.customCss;
  }

  previewCss() {
    this.showPreview = true;
    this._cdr.markForCheck();
  }

  closePreview() {
    this.showPreview = false;
    this._cdr.markForCheck();
  }

  applyPreview() {
    this.saveCustomCss();
    this.closePreview();
  }

  resetCss() {
    this.customCss = this.originalCss;
    this.applyCustomCss();
    this._cdr.markForCheck();
  }

  formatCss() {
    try {
      // Simple CSS formatting - you can enhance this with a proper CSS formatter library
      let formatted = this.customCss
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\n\s*}\s*/g, '\n}')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      this.customCss = formatted;
      this._cdr.markForCheck();
    } catch (error) {
      console.error('Error formatting CSS:', error);
      this.error = 'Error al formatear el CSS. Verifica la sintaxis.';
      this._cdr.markForCheck();
    }
  }
}
