import { Component, OnInit } from '@angular/core';

import { routes } from '@admin/admin-routing.module';
import { AuthService } from '@auth/services/auth.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { translations } from '@translations/translations';

@Component({
    selector: 'worky-admin-side-menu',
    templateUrl: './side-menu.component.html',
    styleUrls: ['./side-menu.component.scss'],
    standalone: false
})
export class SideMenuComponent implements OnInit {

  title: string = translations['admin.sideMenu-title'];
  subTitle: string = translations['admin.sideMenu-subTitle'];
  userName: string = 'Admin';
  userAvatar: string = '';
  expandedMenus: { [key: string]: boolean } = {};

  menuItems = routes
    .flatMap((route) => route.children ?? [])
    .filter((route) => route)
    .map((route) => ({
      ...route,
      children: route.children
        ? route.children.filter((child) => child.path && !child.path.includes(':'))
        : null,
    }))
    .filter((route) => route.children || (route.path && !route.path.includes(':')));

  constructor(
    private _authService: AuthService,
    private _logService: LogService
  ) { }

  ngOnInit() {
    try {
      const token = this._authService.getDecodedToken()!;
      this.userName = token?.name || 'Admin';
      this.userAvatar = token?.avatar || '';
    } catch (error) {
      this._logService.log(
        LevelLogEnum.ERROR,
        'SideMenuComponent',
        'Error initializing side menu',
        { error: String(error) }
      );
    }
  }

  logout() {
    this._logService.log(
      LevelLogEnum.INFO,
      'SideMenuComponent',
      'Admin user logged out',
      { userName: this.userName }
    );
    this._authService.logout();
  }

  toggleMenu(menuTitle: string): void {
    this.expandedMenus[menuTitle] = !this.expandedMenus[menuTitle];
  }

  getMenuIcon(title: string | undefined): string {
    if (!title) return 'dashboard';
    
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('home') || titleLower.includes('dashboard')) return 'dashboard';
    if (titleLower.includes('user') || titleLower.includes('gestión de usuarios')) return 'people';
    if (titleLower.includes('log')) return 'analytics';
    if (titleLower.includes('stat')) return 'bar_chart';
    if (titleLower.includes('config') || titleLower.includes('setting')) return 'settings';
    if (titleLower.includes('template')) return 'description';
    if (titleLower.includes('webhook')) return 'webhook';
    if (titleLower.includes('widget')) return 'widgets';
    if (titleLower.includes('invitation') || titleLower.includes('code')) return 'vpn_key';
    if (titleLower.includes('reaction')) return 'thumb_up';
    if (titleLower.includes('css') || titleLower.includes('custom')) return 'palette';
    if (titleLower.includes('version') || titleLower.includes('gestión de versiones')) return 'system_update';
    
    return 'dashboard';
  }

  getSubmenuIcon(title: string | undefined): string {
    if (!title) return 'chevron_right';
    
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('list') || titleLower.includes('all')) return 'list';
    if (titleLower.includes('add') || titleLower.includes('create')) return 'add';
    if (titleLower.includes('edit') || titleLower.includes('update')) return 'edit';
    if (titleLower.includes('delete') || titleLower.includes('remove')) return 'delete';
    if (titleLower.includes('view') || titleLower.includes('show')) return 'visibility';
    if (titleLower.includes('export') || titleLower.includes('download')) return 'download';
    if (titleLower.includes('import') || titleLower.includes('upload')) return 'upload';
    if (titleLower.includes('config') || titleLower.includes('setting')) return 'settings';
    
    return 'chevron_right';
  }
}
