import { Component, OnInit } from '@angular/core';
import { TypePublishing } from '../../shared/addPublication/enum/addPublication.enum';

@Component({
  selector: 'worky-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {

  typePublishing = TypePublishing;

  constructor() { }

}
