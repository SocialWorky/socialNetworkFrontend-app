import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(
    private http: HttpClient,
    private _authService: AuthService
  ) { }

  uploadFile(
    files: File[],
    destination: string,
    idReference?: string | null,
    urlMedia?: string | null,
    type?: TypePublishing | null
  ) {
    const url = `${environment.APIFILESERVICE}upload`;
    const id = this._authService.getDecodedToken()?.id;
    const formData = new FormData();

    formData.append('userId', `${id}|`);
    formData.append('destination', destination);

    if (idReference) {
      formData.append('idReference', idReference);
    }
    if (urlMedia) {
      formData.append('urlMedia', urlMedia);
    }

    if (type) {
      formData.append('type', type);
    }

    const uniqueFiles = this.getUniqueFiles(files);
    uniqueFiles.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<any>(url, formData);
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
    type: TypePublishing
  ) {
    const urlApi = environment.API_URL;

    const body = {
      url: url,
      urlThumbnail: urlThumbnail,
      urlCompressed: urlCompressed,
      _idPublication: _idPublications,
      isPublications: type === TypePublishing.POST ? true : false,
      isComment: type === TypePublishing.COMMENT ? true : false
    };

    return this.http.post<any>(`${urlApi}/media/create`, body);
  }
}
