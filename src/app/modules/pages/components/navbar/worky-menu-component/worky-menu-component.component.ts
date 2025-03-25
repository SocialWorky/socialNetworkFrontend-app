import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'worky-menu-component',
    templateUrl: './worky-menu-component.component.html',
    styleUrls: ['./worky-menu-component.component.scss'],
    standalone: false
})
export class WorkyMenuComponentComponent implements OnInit {
  constructor(private router: Router) { }

  ngOnInit() {}

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
