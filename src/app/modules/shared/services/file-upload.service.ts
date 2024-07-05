import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  private token: string;

  constructor(
    private http: HttpClient,
    private _authService: AuthService
  ) {
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }

  uploadFile(files: File[], destination: string) {
    const url = environment.APIFILESERVICE + 'upload';
    const id = this._authService.getDecodedToken()?.id;
    const headers = this.getHeaders();
    const formData = new FormData();

    formData.append('userId', id + '|');
    formData.append('destination', destination);

    const uniqueFiles = this.getUniqueFiles(files);
    uniqueFiles.forEach(file => {
      formData.append('files', file);
    });

    headers.append('Content-Type', 'multipart/form-data');

    return this.http.post<any>(url, formData, { headers });
  }

  private getUniqueFiles(files: File[]): File[] {
    const uniqueFilesMap = new Map<string, File>();

    files.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      if (!uniqueFilesMap.has(fileKey)) {
        uniqueFilesMap.set(fileKey, file);
      }
    });

    return Array.from(uniqueFilesMap.values());
  }

  saveUrlFile(
    url: string,
    urlThumbnail: string,
    urlCompressed: string,
    _idPublications: string,
    type:TypePublishing
  ) {
    const urlApi = environment.API_URL;
    const headers = this.getHeaders();

    const body = {
      url: url,
      urlThumbnail: urlThumbnail,
      urlCompressed: urlCompressed,
      _idPublication: _idPublications,
      isPublications: type === TypePublishing.POST ? true : false,
      isComment: type === TypePublishing.COMMENT ? true : false
    };
    const response = this.http.post<any>(`${urlApi}/media/create`, body, { headers });
    return response;
  }

}
