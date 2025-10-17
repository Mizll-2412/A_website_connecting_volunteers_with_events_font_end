import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LocalDataService, Event, EventRegistration, Volunteer } from '../../services/local-data';
import { EventFormComponent } from './event-form.component';

interface VolunteerWithRegistration extends Volunteer {
  registrationId?: number;
  registrationStatus?: string;
  registrationDate?: string;
}

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EventFormComponent],
  templateUrl: './event-management.component.html',
  styleUrls: ['./event-management.component.css']
})
export class EventManagementComponent implements OnInit {
  // Dữ liệu của tổ chức
  organizationId: number = 0;
  organizationName: string = '';
  
  // Dữ liệu sự kiện
  events: Event[] = [];
  selectedEvent: Event | null = null;
  showEventForm = false;
  editingEvent: Event | null = null;
  
  // Dữ liệu đăng ký
  registrations: EventRegistration[] = [];
  
  // Tab và filter
  activeTab: 'all' | 'active' | 'draft' | 'completed' | 'cancelled' = 'all';
  searchTerm: string = '';
  
  // Xem tình nguyện viên
  selectedVolunteers: VolunteerWithRegistration[] = [];
  selectedEventForVolunteers: Event | null = null;
  viewingVolunteersForEvent = false;
  
  // Xem chi tiết tình nguyện viên
  selectedVolunteer: VolunteerWithRegistration | null = null;
  viewingVolunteerDetail = false;

  constructor(public dataService: LocalDataService) {}

  ngOnInit(): void {
    // Trong thực tế, lấy ID tổ chức từ người dùng đã đăng nhập
    // Tạm thời dùng ID cứng để demo
    this.loadOrgInfo();
    this.loadEvents();
  }
  
  private loadOrgInfo(): void {
    // Demo với tổ chức ID 1
    this.organizationId = 1;
    const org = this.dataService.getOrganizationById(this.organizationId);
    if (org) {
      this.organizationName = org.name;
    }
  }

  loadEvents(filter: 'all' | 'active' | 'draft' | 'completed' | 'cancelled' = 'all'): void {
    this.activeTab = filter;
    let events = this.dataService.getEventsByOrganization(this.organizationId);
    
    // Lọc theo tab
    if (filter !== 'all') {
      events = events.filter(e => e.status === filter);
    }
    
    // Lọc theo từ khóa tìm kiếm nếu có
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      events = events.filter(e => 
        e.title.toLowerCase().includes(searchLower) || 
        e.description.toLowerCase().includes(searchLower) ||
        e.location.toLowerCase().includes(searchLower)
      );
    }
    
    // Sắp xếp theo thời gian tạo, mới nhất lên trước
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    this.events = events;
  }

  search(): void {
    this.loadEvents(this.activeTab);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadEvents(this.activeTab);
  }

  // QUẢN LÝ SỰ KIỆN
  createNewEvent(): void {
    this.editingEvent = null;
    this.showEventForm = true;
  }

  editEvent(event: Event): void {
    this.editingEvent = { ...event };
    this.showEventForm = true;
  }

  cancelEventForm(): void {
    this.showEventForm = false;
    this.editingEvent = null;
  }

  handleEventSubmit(data: { eventData: any, id?: number }): void {
    if (data.id) {
      // Cập nhật sự kiện
      this.dataService.updateEvent(data.id, {
        ...data.eventData,
        organizationId: this.organizationId,
        organizationName: this.organizationName
      });
      alert('Đã cập nhật sự kiện thành công!');
    } else {
      // Tạo sự kiện mới
      this.dataService.createEvent({
        ...data.eventData,
        organizationId: this.organizationId,
        organizationName: this.organizationName
      });
      alert('Đã tạo sự kiện thành công!');
    }
    
    this.showEventForm = false;
    this.loadEvents(this.activeTab);
  }

  cancelEvent(eventId: number): void {
    if (confirm('Bạn có chắc muốn hủy sự kiện này?')) {
      const success = this.dataService.deleteEvent(eventId);
      if (success) {
        alert('Đã hủy sự kiện thành công!');
        this.loadEvents(this.activeTab);
      } else {
        alert('Không thể hủy sự kiện!');
      }
    }
  }

  // QUẢN LÝ TÌNH NGUYỆN VIÊN ĐĂNG KÝ
  viewVolunteers(event: Event): void {
    this.selectedEventForVolunteers = event;
    this.viewingVolunteersForEvent = true;
    this.loadVolunteersForEvent(event.id);
  }

  loadVolunteersForEvent(eventId: number): void {
    // Lấy các đăng ký cho sự kiện này
    const registrations = this.dataService.getRegistrationsByEvent(eventId);
    this.registrations = registrations;
    
    // Lấy thông tin chi tiết của từng tình nguyện viên
    const volunteers: VolunteerWithRegistration[] = [];
    
    registrations.forEach(reg => {
      const volunteer = this.dataService.getVolunteerById(reg.volunteerId);
      if (volunteer) {
        volunteers.push({
          ...volunteer,
          registrationId: reg.id,
          registrationStatus: reg.status,
          registrationDate: reg.registrationDate
        });
      }
    });
    
    this.selectedVolunteers = volunteers;
  }

  approveVolunteer(registrationId: number): void {
    const success = this.dataService.approveRegistration(registrationId);
    if (success) {
      alert('Đã phê duyệt tình nguyện viên!');
      this.loadVolunteersForEvent(this.selectedEventForVolunteers!.id);
    } else {
      alert('Không thể phê duyệt!');
    }
  }

  rejectVolunteer(registrationId: number): void {
    const reason = prompt('Vui lòng nhập lý do từ chối:');
    if (reason === null) return;
    
    const success = this.dataService.rejectRegistration(registrationId, reason);
    if (success) {
      alert('Đã từ chối tình nguyện viên!');
      this.loadVolunteersForEvent(this.selectedEventForVolunteers!.id);
    } else {
      alert('Không thể từ chối!');
    }
  }

  backToEvents(): void {
    this.viewingVolunteersForEvent = false;
    this.selectedEventForVolunteers = null;
    this.selectedVolunteers = [];
  }

  // XEM CHI TIẾT TNV
  viewVolunteerDetail(volunteer: VolunteerWithRegistration): void {
    this.selectedVolunteer = volunteer;
    this.viewingVolunteerDetail = true;
  }

  backToVolunteerList(): void {
    this.viewingVolunteerDetail = false;
    this.selectedVolunteer = null;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-success';
      case 'draft': return 'bg-secondary';
      case 'completed': return 'bg-info';
      case 'cancelled': return 'bg-danger';
      case 'pending': return 'bg-warning text-dark';
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
  
  getApprovedRegistrationsCount(eventId: number): number {
    const registrations = this.dataService.getRegistrationsByEvent(eventId);
    return registrations.filter(r => r.status === 'approved').length;
  }
  
  getSkillName(skillId: number): string {
    const skill = this.dataService.getSkills().find(s => s.id === skillId);
    return skill?.name || 'Không xác định';
  }
  
  getFieldName(fieldId: number): string {
    const field = this.dataService.getFields().find(f => f.id === fieldId);
    return field?.name || 'Không xác định';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Đang hoạt động';
      case 'draft': return 'Bản nháp';
      case 'completed': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã hủy';
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return 'Không xác định';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
