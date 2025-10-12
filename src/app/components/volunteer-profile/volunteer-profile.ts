import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';

interface Event {
  id: number;
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-volunteer-profile',
  standalone: true, 
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './volunteer-profile.html',
  styleUrls: ['./volunteer-profile.css']
})
export class VolunteerProfileComponent implements OnInit {
  registrationForm: FormGroup;
  selectedMenuItem: string = 'profile';
  
    user?: User;


  events: Event[] = [
    {
      id: 1,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    },
    {
      id: 2,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    },
    {
      id: 3,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    },
    {
      id: 4,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    },
    {
      id: 5,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    },
    {
      id: 6,
      title: 'Tiêu đề kiện',
      organization: 'Tên tổ chức',
      startDate: 'Bắt đầu',
      endDate: 'Thời gian (kết thúc)',
      location: 'Địa điểm tổ chức',
      description: 'Thông tin giới thiệu về sự kiện',
      imageUrl: ''
    }
  ];

  constructor(private fb: FormBuilder) {
    this.registrationForm = this.fb.group({
      hoTen: ['', Validators.required],
      cccd: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      birthDate: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      gender: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      nationality: ['', Validators.required],
      address: ['', Validators.required],
      interests: ['', Validators.required],
      skills: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const userInfo = localStorage.getItem("user");
    if (userInfo){
      this.user = JSON.parse(userInfo);
      this.registrationForm.patchValue({
        hoTen: this.user?.hoTen,
        email: this.user?.email,
      });
    }
  }

  selectMenuItem(item: string): void {
    this.selectedMenuItem = item;
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      console.log('Form Data:', this.registrationForm.value);
      alert('Đăng ký thành công!');
      this.registrationForm.reset();
    } else {
      alert('Vui lòng điền đầy đủ thông tin!');
      this.markFormGroupTouched(this.registrationForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  viewEventDetails(event: Event): void {
    console.log('View event:', event);
  }

  applyForEvent(event: Event): void {
    console.log('Apply for event:', event);
    alert(`Đã ứng tuyển sự kiện: ${event.title}`);
  }
}