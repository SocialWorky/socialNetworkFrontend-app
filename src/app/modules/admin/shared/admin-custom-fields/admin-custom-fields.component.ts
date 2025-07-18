import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
    selector: 'worky-admin-custom-fields',
    templateUrl: './admin-custom-fields.component.html',
    styleUrls: ['./admin-custom-fields.component.scss'],
    standalone: false
})
export class AdminCustomFieldsComponent implements OnInit, OnDestroy {
  showHelpModal = false;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private _cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
      console.error('Error initializing component:', error);
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
