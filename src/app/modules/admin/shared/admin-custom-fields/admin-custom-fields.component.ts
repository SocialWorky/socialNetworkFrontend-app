import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
    selector: 'worky-admin-custom-fields',
    templateUrl: './admin-custom-fields.component.html',
    styleUrls: ['./admin-custom-fields.component.scss'],
    standalone: false
})
export class AdminCustomFieldsComponent implements OnInit, OnDestroy, AfterViewInit {
  showHelpModal = false;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private scrollObserver: MutationObserver | null = null;

  constructor(
    private _cdr: ChangeDetectorRef,
    private _logService: LogService
  ) { }

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
  }

  private async initializeComponent() {
    this.isLoading = true;
    this.error = null;

    try {
      // Simular carga inicial
      await new Promise(resolve => setTimeout(resolve, 500));
      this.isLoading = false;
      this._cdr.markForCheck();
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'AdminCustomFieldsComponent',
        'Error initializing component',
        { error: String(error) }
      );
      this.error = 'Error al cargar el constructor de formularios. Por favor, intenta de nuevo.';
      this.isLoading = false;
      this._cdr.markForCheck();
    }
  }

  showHelp() {
    this.showHelpModal = true;
    this._cdr.markForCheck();
  }

  closeHelp() {
    this.showHelpModal = false;
    this._cdr.markForCheck();
  }

  ngAfterViewInit() {
    this.setupConfigPanelListener();
  }

  private setupConfigPanelListener() {
    this.scrollObserver = new MutationObserver(() => {
      const configPanel = document.querySelector('.config-panel');
      if (configPanel) {
        this.addCloseButton();
      }
    });

    const formBuilderContainer = document.querySelector('.form-builder-wrapper');
    if (formBuilderContainer) {
      this.scrollObserver.observe(formBuilderContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  private addCloseButton() {
    const configPanel = document.querySelector('.config-panel');
    if (configPanel && !configPanel.querySelector('.config-header')) {
      const header = document.createElement('div');
      header.className = 'config-header';
      header.innerHTML = `
        <h3>Configuración del Campo</h3>
        <button class="close-config-btn" onclick="this.closest('.config-panel').remove()">
          <i class="material-icons">close</i>
        </button>
      `;
      
      const content = configPanel.querySelector('.config-content') || configPanel;
      configPanel.insertBefore(header, content);
    }
  }

  refreshFormBuilder() {
    this.isLoading = true;
    this.error = null;
    this._cdr.markForCheck();

    // Simular recarga
    setTimeout(() => {
      this.isLoading = false;
      this._cdr.markForCheck();
    }, 1000);
  }
}
