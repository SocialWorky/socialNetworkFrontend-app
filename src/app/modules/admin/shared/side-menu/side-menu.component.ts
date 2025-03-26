import { Component, OnInit } from '@angular/core';

import { routes } from '@admin/admin-routing.module';
import { AuthService } from '@auth/services/auth.service';
import { translations } from '@translations/translations';

@Component({
    selector: 'worky-admin-side-menu',
    templateUrl: './side-menu.component.html',
    styleUrls: ['./side-menu.component.scss'],
    standalone: false
})
export class SideMenuComponent  implements OnInit {

  title: string = translations['admin.sideMenu-title'];

  subTitle: string = translations['admin.sideMenu-subTitle'];

  userName: string = 'Admin';

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

  constructor(private _authService: AuthService) { }

  ngOnInit() {
    const token = this._authService.getDecodedToken()!;
    this.userName = token?.name;
  }

  logout() {
    this._authService.logout();
  }

  toggleMenu(menuTitle: string): void {
    this.expandedMenus[menuTitle] = !this.expandedMenus[menuTitle];
  }


}
