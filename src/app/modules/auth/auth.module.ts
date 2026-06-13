import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OAuthModule } from 'angular-oauth2-oidc';

import { LayoutPageComponent } from './templates/layout-page/layout-page.component';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordModalComponent } from './pages/login/reset-password-modal/reset-password-modal.component';
import { AgeVerificationModalComponent } from './pages/login/age-verification-modal/age-verification-modal.component';
import { RegisterComponent } from './pages/register/register.component';
import { AuthRoutingModule } from './auth-routing.module';
import { MaterialModule } from '@shared/modules/material/material.module';
import { WorkyButtonsModule } from '@shared/modules/buttons/buttons.module';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { FormBuilderModule } from '@shared/modules/form-builder/form-builder.module';
@NgModule({
  declarations: [LayoutPageComponent, LoginComponent, RegisterComponent, ResetPasswordModalComponent, AgeVerificationModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    OAuthModule.forRoot(),
    AuthRoutingModule,
    MaterialModule,
    WorkyButtonsModule,
    TranslationsModule,
    FormBuilderModule
  ]
})
export class AuthModule { }
