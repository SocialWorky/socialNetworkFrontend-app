import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SubscribeComponent } from './subscribe.component';
import { SubscribeResultComponent } from './subscribe-result.component';
import { TranslationsModule } from '@shared/modules/translations/translations.module';

const routes: Routes = [
  { path: '', component: SubscribeComponent },
  { path: 'result', component: SubscribeResultComponent },
];

@NgModule({
  declarations: [SubscribeComponent, SubscribeResultComponent],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslationsModule,
  ],
})
export class SubscribeModule {}
