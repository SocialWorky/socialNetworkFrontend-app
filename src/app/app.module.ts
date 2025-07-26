import { NgModule, isDevMode, LOCALE_ID, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AuthModule } from './modules/auth/auth.module';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthInterceptor } from './auth.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';
import { SafariIOSErrorInterceptor } from './safari-ios-error.interceptor';
import { GoogleImageErrorInterceptor } from './google-image-error.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';
import { PwaUpdateNotificationComponent } from '@shared/components/pwa-update-notification/pwa-update-notification.component';
import { PwaSettingsComponent } from '@shared/components/pwa-settings/pwa-settings.component';
import { SafariIOSErrorHandlerService } from '@shared/services/safari-ios-error-handler.service';
import { GlobalErrorHandlerService } from '@shared/services/global-error-handler.service';
import { SafariIOSDebugService } from '@shared/services/safari-ios-debug.service';

// Register Spanish locale
registerLocaleData(localeEs);

const config: SocketIoConfig = {
  url: environment.WSURL,
  options: {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  },
};

@NgModule({
  declarations: [
    AppComponent,
    PwaUpdateNotificationComponent,
    PwaSettingsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    AuthModule,
    SocketIoModule.forRoot(config),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    FormsModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: Window, useValue: window },
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TimeoutInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SafariIOSErrorInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GoogleImageErrorInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
    SafariIOSErrorHandlerService,
    SafariIOSDebugService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
