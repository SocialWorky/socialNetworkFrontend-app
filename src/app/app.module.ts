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

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SubscriptionWallComponent } from './modules/shared/components/subscription-wall/subscription-wall.component';
import { FeatureWallComponent } from './modules/shared/components/feature-wall/feature-wall.component';
import { PwaInstallBannerComponent } from './modules/shared/components/pwa-install-banner/pwa-install-banner.component';
import { TranslationsModule } from './modules/shared/modules/translations/translations.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthInterceptor } from './auth.interceptor';
import { CacheInterceptor } from './cache.interceptor';
import { DeduplicationInterceptor } from './deduplication.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';
import { SafariIOSErrorInterceptor } from './safari-ios-error.interceptor';
import { GoogleImageErrorInterceptor } from './google-image-error.interceptor';
import { Silent404Interceptor } from './silent-404.interceptor';
import { ExternalServiceErrorInterceptor } from './external-service-error.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';

import { SafariIOSErrorHandlerService } from '@shared/services/safari-ios-error-handler.service';
import { GlobalErrorHandlerService } from '@shared/services/global-error-handler.service';
import { SafariIOSDebugService } from '@shared/services/safari-ios-debug.service';

// Register Spanish locale
registerLocaleData(localeEs);

const config: SocketIoConfig = {
  url: environment.WSURL,
  options: {
    query: { token: localStorage.getItem('authToken') || localStorage.getItem('token') },
    transports: ['websocket'],
    autoConnect: false,  // connection is initiated explicitly after login via connectToWebSocket()
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  },
};

@NgModule({
  declarations: [
    AppComponent,
    SubscriptionWallComponent,
    FeatureWallComponent,
    PwaInstallBannerComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    AuthModule,
    TranslationsModule,
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
      useClass: DeduplicationInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CacheInterceptor,
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
    {
      provide: HTTP_INTERCEPTORS,
      useClass: Silent404Interceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ExternalServiceErrorInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
    SafariIOSErrorHandlerService,
    SafariIOSDebugService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
