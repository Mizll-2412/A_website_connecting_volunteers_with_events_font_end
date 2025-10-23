import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TinhNguyenVienResponeDTos } from '../models/volunteer';

@Injectable({
  providedIn: 'root'
})
export class TinhNguyenVienService {
  private apiUrl = 'https://a-website-connecting-volunteers-with.onrender.com/api/tinhnguyenvien'; 

  constructor(private http: HttpClient) {}

  getAllTinhNguyen(): Observable<TinhNguyenVienResponeDTos[]> {
    return this.http.get<TinhNguyenVienResponeDTos[]>(`${this.apiUrl}`);
  }
}
