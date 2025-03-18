import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class GenericSnackbarService {
  private DEFAULT_DURATION = 4000;

  constructor(private _snackBar: MatSnackBar) {

  }

  error(message = `Ocurrió un error desconocido.`, refreshOnDismiss = true): void {
    const action = refreshOnDismiss ? 'Refrescar' : 'Descartar';
    const snackbarRef = this._snackBar.open(message, action, {
      duration: this.DEFAULT_DURATION,
      horizontalPosition: 'end',
    });
    if (refreshOnDismiss) {
      snackbarRef.afterDismissed().subscribe((afterDismissedData) => {
        if (!afterDismissedData.dismissedByAction) {
          return;
        }
        window.location.reload();
      });
    }
  }

  info(message: string, options?: MatSnackBarConfig): void {
    this._snackBar.open(message, 'Descartar', {
      ...(options ?? {}),
      duration: options?.duration || this.DEFAULT_DURATION,
    });
  }
}
