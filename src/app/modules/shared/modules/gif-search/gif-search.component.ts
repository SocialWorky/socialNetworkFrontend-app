import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'app-gif-search',
    templateUrl: './gif-search.component.html',
    styleUrls: ['./gif-search.component.scss'],
    standalone: false
})
export class GifSearchComponent implements OnInit {
  gifs: any[] = [];
  searchTerm: FormControl = new FormControl('');
  selectedSize: string = 'fixed_height';
  isLoading = false;
  hasSearched = false;

  @Output() gifSelected = new EventEmitter<string>();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchTrending();

    this.searchTerm.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      tap((term: string) => {
        this.isLoading = true;
        this.hasSearched = !!term?.trim();
        this.cdr.markForCheck();
      }),
      switchMap((term: string) =>
        (term?.trim() ? this.searchGifs(term.trim()) : this.trendingGifs())
          .pipe(catchError(() => of({ data: [] })))
      ),
    ).subscribe((response: any) => {
      this.gifs = response?.data ?? [];
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  private fetchTrending(): void {
    this.isLoading = true;
    this.trendingGifs().pipe(catchError(() => of({ data: [] }))).subscribe((response: any) => {
      this.gifs = response?.data ?? [];
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  searchGifs(term: string): Observable<any> {
    const apiKey = environment.GIPHYAPIKEY;
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(term)}&limit=30&rating=g`;
    return this.http.get(url);
  }

  trendingGifs(): Observable<any> {
    const apiKey = environment.GIPHYAPIKEY;
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=30&rating=g`;
    return this.http.get(url);
  }

  selectGif(gifUrl: string): void {
    this.gifSelected.emit(gifUrl);
  }

  setImageSize(size: string): void {
    this.selectedSize = size;
  }

  clearSearch(): void {
    this.searchTerm.setValue('');
  }

  trackByGifId(_index: number, gif: any): string {
    return gif?.id ?? _index;
  }
}
