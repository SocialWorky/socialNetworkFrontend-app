import { Component, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-gif-search',
  templateUrl: './gif-search.component.html',
  styleUrls: ['./gif-search.component.scss']
})
export class GifSearchComponent {
  gifs: any[] = [];
  searchTerm: FormControl = new FormControl('');
  selectedSize: string = 'fixed_height'; // Variable para controlar el tamaño de las imágenes

  @Output() gifSelected = new EventEmitter<string>();

  constructor(private http: HttpClient) {
    this.searchTerm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchGifs(term))
    ).subscribe((response: any) => {
      this.gifs = response.data;
    });
  }

  searchGifs(term: string) {
    const apiKey = environment.GIPHYAPIKEY;
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${term}&limit=10`;
    return this.http.get(url);
  }

  selectGif(gifUrl: string) {
    this.gifSelected.emit(gifUrl);
  }

  setImageSize(size: string) {
    this.selectedSize = size;
  }
}
