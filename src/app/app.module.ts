import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AuthModule } from '@auth/auth.module';
import { environment } from '@env/environment';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

const config: SocketIoConfig = {
  url: environment.WSURL, 
  options: {},
};
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(),
    HttpClientModule,
    AppRoutingModule,
    AuthModule,
    SocketIoModule.forRoot(config),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: Window, useValue: window },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
