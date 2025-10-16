import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SuKienResponseDto } from '../models/event';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'http://localhost:5000/api/sukien'; 

  constructor(private http: HttpClient) {}

  getAllSuKien(): Observable<SuKienResponseDto[]> {
    return this.http.get<SuKienResponseDto[]>(`${this.apiUrl}`);
  }
}
