import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer'
import { SuKienResponseDto } from '../../models/event';
import { TinhNguyenVienResponeDTos } from '../../models/volunteer';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  user: any;
  isLoggedIn = false;
  username = '';
  role = '';

  constructor(private router: Router, private auth: AuthService, private eventS: EventService, private Volunteer: TinhNguyenVienService) { }

  ngOnDestroy(): void { }

  ngOnInit(): void {

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.header') as HTMLElement;
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll;
    });

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
}
