import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Group {
  _id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  avatarImage?: string | null;
  category: string | null;
  privacy: 'public' | 'private' | 'secret';
  createdBy: string;
  memberCount?: number;
  isMember?: boolean;
  myRole?: 'admin' | 'moderator' | 'member' | null;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  user?: {
    _id: string;
    name: string;
    lastName: string;
    username: string;
    avatar: string;
  } | null;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  coverImage?: string;
  avatarImage?: string;
  category?: string;
  privacy?: 'public' | 'private' | 'secret';
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly apiUrl = environment.API_URL;

  private _groups$ = new BehaviorSubject<Group[]>([]);
  readonly groups$ = this._groups$.asObservable();

  private _currentGroup$ = new BehaviorSubject<Group | null>(null);
  readonly currentGroup$ = this._currentGroup$.asObservable();

  constructor(private readonly http: HttpClient) {}

  getGroups(q?: string, category?: string, page: number = 1, pageSize: number = 20): Observable<{ groups: Group[]; total: number }> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (q) params['q'] = q;
    if (category) params['category'] = category;
    return this.http
      .get<{ groups: Group[]; total: number }>(`${this.apiUrl}/groups`, { params })
      .pipe(tap((res) => this._groups$.next(res.groups)));
  }

  getGroupById(id: string): Observable<Group> {
    return this.http
      .get<Group>(`${this.apiUrl}/groups/${id}`)
      .pipe(tap((g) => this._currentGroup$.next(g)));
  }

  createGroup(payload: CreateGroupPayload): Observable<Group> {
    return this.http
      .post<Group>(`${this.apiUrl}/groups`, payload)
      .pipe(tap((g) => this._currentGroup$.next(g)));
  }

  updateGroup(id: string, payload: Partial<CreateGroupPayload>): Observable<Group> {
    return this.http
      .put<Group>(`${this.apiUrl}/groups/${id}`, payload)
      .pipe(tap((g) => this._currentGroup$.next(g)));
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}`);
  }

  joinGroup(id: string): Observable<GroupMember> {
    return this.http.post<GroupMember>(`${this.apiUrl}/groups/${id}/join`, {});
  }

  leaveGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}/leave`);
  }

  getMembers(id: string, role?: string): Observable<GroupMember[]> {
    const params: Record<string, string> = {};
    if (role) params['role'] = role;
    return this.http.get<GroupMember[]>(`${this.apiUrl}/groups/${id}/members`, { params });
  }

  getPendingMembers(id: string): Observable<GroupMember[]> {
    return this.http.get<GroupMember[]>(`${this.apiUrl}/groups/${id}/members/pending`);
  }

  approveMember(id: string, userId: string): Observable<GroupMember> {
    return this.http.put<GroupMember>(`${this.apiUrl}/groups/${id}/members/${userId}/approve`, {});
  }

  rejectMember(id: string, userId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/groups/${id}/members/${userId}/reject`, {});
  }

  changeMemberRole(id: string, userId: string, role: string): Observable<GroupMember> {
    return this.http.put<GroupMember>(`${this.apiUrl}/groups/${id}/members/${userId}/role`, { role });
  }

  removeMember(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}/members/${userId}`);
  }

  getGroupPublications(id: string, page: number = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/groups/${id}/publications`, { params: { page: String(page) } });
  }

  removeGroupPublication(id: string, pubId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}/publications/${pubId}`);
  }
}
