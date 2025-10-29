import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();

      // Chỉ cho phép admin truy cập trang này
      if (this.role !== 'Admin') {
        this.router.navigate(['/home']);
        return;
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
}
