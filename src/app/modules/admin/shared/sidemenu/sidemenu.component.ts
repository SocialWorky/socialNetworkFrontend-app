import { Component, OnInit } from '@angular/core';

import { routes } from '@admin/admin-routing.module';
import { AuthService } from '@auth/services/auth.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-admin-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.scss'],
})
export class SidemenuComponent  implements OnInit {

  title: string = translations['admin.sidemenu-title'];

  subTitle: string = translations['admin.sidemenu-subTitle'];

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
    if (!this._authService.isAuthenticated()) return;
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
