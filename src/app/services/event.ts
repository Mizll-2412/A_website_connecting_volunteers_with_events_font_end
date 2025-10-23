import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SuKienResponseDto } from '../models/event';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'https://a-website-connecting-volunteers-with.onrender.com/api/sukien'; 

  constructor(private http: HttpClient) {}

  getAllSuKien(): Observable<SuKienResponseDto[]> {
    return this.http.get<SuKienResponseDto[]>(`${this.apiUrl}`);
  }
  
  getSuKienById(id: number): Observable<SuKienResponseDto> {
    return this.http.get<SuKienResponseDto>(`${this.apiUrl}/${id}`);
  }
}
