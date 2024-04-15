import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LayoutPageComponent } from './templates/layout-page/layout-page.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthRoutingModule } from './auth-routing.module';
import { MaterialModule } from '../shared/material/material.module';
import { WorkyButtonsModule } from '../shared/buttons/buttons.module';


@NgModule({
  declarations: [LayoutPageComponent, LoginComponent],
  imports: [
    CommonModule,
    AuthRoutingModule,
    MaterialModule,
    WorkyButtonsModule
  ]
})
export class AuthModule { }
