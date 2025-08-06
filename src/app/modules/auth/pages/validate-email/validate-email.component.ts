import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { AuthService } from '@auth/services/auth.service';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

@Component({
  selector: 'worky-validate-email',
  templateUrl: './validate-email.component.html',
  styleUrls: ['./validate-email.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslationsModule]
})
export class ValidateEmailComponent implements OnInit {
  loading = true;
  validated = false;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.validateEmail();
  }

  validateEmail(): void {
    const token = this.route.snapshot.paramMap.get('token');
    
    if (!token) {
      this.error = true;
      this.loading = false;
      return;
    }

    this.authService.validateEmail(token).subscribe({
      next: () => {
        this.validated = true;
        this.loading = false;
        this.alertService.showAlert(
          'Éxito',
          'Tu email ha sido verificado correctamente. Ya puedes iniciar sesión.',
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          'Ir al login',
          ['/auth/login']
        );
      },
              error: (error) => {
          console.error('Error validating email:', error);
          this.error = true;
          this.loading = false;
          
          let errorMessage = 'Error al verificar el email';
          
          if (error.message === 'Invalid token format') {
            errorMessage = 'El enlace de verificación no tiene el formato correcto.';
          } else if (error.error?.message === 'Token expired') {
            errorMessage = 'El enlace de verificación ha expirado. Solicita uno nuevo.';
          } else if (error.error?.message === 'Invalid token') {
            errorMessage = 'El enlace de verificación no es válido.';
          } else if (error.status === 404) {
            errorMessage = 'El enlace de verificación no es válido o ha expirado. Solicita uno nuevo.';
          } else if (error.status === 401) {
            errorMessage = 'No tienes permisos para realizar esta acción.';
          }
          
          this.alertService.showAlert(
            'Error',
            errorMessage,
            Alerts.ERROR,
            Position.CENTER,
            true,
            'Aceptar'
          );
        }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
} 