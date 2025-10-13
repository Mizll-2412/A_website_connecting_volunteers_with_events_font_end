import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
interface Volunteer {
  id: number;
  name: string;
  phone: string;
  email: string;
  type: string;
  skills: string;
  interests: string;
  status: string;
  age?: number;
}

interface EventData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  image?: string;
}

@Component({
  selector: 'app-event-management',
  imports: [CommonModule, RouterModule],
  templateUrl: './event-management.html',
  styleUrls: ['./event-management.css']
})
export class EventManagementComponent implements OnInit {
  user?: User;
  constructor(private router: Router, private auth: AuthService) { }
  isLoggedIn = false;
  username = '';
  role = '';

  selectedTab: string = 'event';

  eventData: EventData = {
    title: 'Tiêu đề sự kiện',
    description: '',
    startDate: '01/01/2025',
    endDate: '31/01/2025',
    location: 'Hà Nội',
    status: 'confirmed'
  };

  volunteers: Volunteer[] = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      phone: '0123456789',
      email: 'nguyenvana@example.com',
      type: 'Tình nguyện viên',
      skills: 'Giao tiếp, Tổ chức sự kiện',
      interests: 'Hoạt động cộng đồng',
      status: 'pending',
      age: 25
    },
    {
      id: 2,
      name: 'Trần Thị B',
      phone: '0987654321',
      email: 'tranthib@example.com',
      type: 'Cộng tác viên',
      skills: 'Thiết kế, Marketing',
      interests: 'Truyền thông xã hội',
      status: 'pending',
      age: 23
    },
    {
      id: 3,
      name: 'Lê Văn C',
      phone: '0912345678',
      email: 'levanc@example.com',
      type: 'Tình nguyện viên',
      skills: 'Kỹ thuật, Hỗ trợ IT',
      interests: 'Công nghệ',
      status: 'pending',
      age: 28
    }
  ];

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

  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  editEvent(): void {
    console.log('Edit event clicked');
    // Implement edit event logic
  }

  acceptVolunteer(volunteer: Volunteer): void {
    volunteer.status = 'accepted';
    console.log('Accepted volunteer:', volunteer.name);
    // Implement accept logic (e.g., API call)
  }

  rejectVolunteer(volunteer: Volunteer): void {
    volunteer.status = 'rejected';
    console.log('Rejected volunteer:', volunteer.name);
    // Implement reject logic (e.g., API call)
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Đang chờ',
      'accepted': 'Đã chấp nhận',
      'rejected': 'Đã từ chối'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'pending': '#f0f0f0',
      'accepted': '#c8e6c9',
      'rejected': '#ffcdd2'
    };
    return colorMap[status] || '#f0f0f0';
  }
}