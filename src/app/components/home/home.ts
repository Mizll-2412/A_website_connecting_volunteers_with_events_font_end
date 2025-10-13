import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})

export class Home implements OnInit, OnDestroy{
  user?: User;
  constructor(private router: Router, private auth: AuthService) {}
  isLoggedIn = false;
  username = '';
  role = '';

  // public user: User ;

  // hoTen: string;
  // email: string;
  // vaiTro: string;
  


  ngOnDestroy(): void {
  }
  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
     if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();

    }
    const userInfo = localStorage.getItem('user');
        if (userInfo) {
          this.user = JSON.parse(userInfo);
    } else {
            this.router.navigate(['/login']);
      }
  }
  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
  
}