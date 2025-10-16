import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TinhNguyenVienResponeDTos } from '../models/volunteer';

@Injectable({
  providedIn: 'root'
})
export class TinhNguyenVienService {
  private apiUrl = 'http://localhost:5000/api/tinhnguyenvien'; 

  constructor(private http: HttpClient) {}

  getAllTinhNguyen(): Observable<TinhNguyenVienResponeDTos[]> {
    return this.http.get<TinhNguyenVienResponeDTos[]>(`${this.apiUrl}`);
  }
}
