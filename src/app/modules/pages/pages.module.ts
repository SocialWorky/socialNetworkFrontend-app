import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { LoyautComponent } from './templates/loyaut/loyaut.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentLeftSideComponent } from './components/content-left-side/content-left-side.component';
import { ContentRightSideComponent } from './components/content-right-side/content-right-side.component';


@NgModule({
  declarations: [
    HomeComponent,
    LoyautComponent,
    NavbarComponent,
    ContentLeftSideComponent,
    ContentRightSideComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule
  ]
})
export class PagesModule { }
