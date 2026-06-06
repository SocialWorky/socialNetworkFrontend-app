import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { catchError, retry, timeout } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(
    private http: HttpClient,
    private _authService: AuthService,
    private _logService: LogService
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

    formData.append('userId', `${id}`);
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

    return this.http.post<any>(url, formData).pipe(
      timeout(60000),
      retry({
        count: 2,
        delay: (error, attempt) => {
          if (error?.status >= 400 && error?.status < 500) {
            return throwError(() => error);
          }
          return timer(attempt * 1000);
        },
      }),
      catchError(error => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'FileUploadService',
          'File upload failed after retries',
          { error }
        );
        return throwError(() => new Error('File upload failed after retries.'));
      })
    );
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
    type: TypePublishing,
    extras?: {
      urlThumbnailWebP?: string;
      urlPreview?: string;
      urlPreviewWebP?: string;
      urlCompressedWebP?: string;
      urlFull?: string;
      urlFullWebP?: string;
      blurHash?: string;
    }
  ) {
    const urlApi = environment.API_URL;

    const body = {
      url,
      urlThumbnail,
      urlCompressed,
      _idPublication: _idPublications,
      isPublications: type === TypePublishing.POST,
      isComment: type === TypePublishing.COMMENT,
      ...extras,
    };

    return this.http.post<any>(`${urlApi}/media/create`, body);
  }
}
