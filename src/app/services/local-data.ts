import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Event {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizationId: number;
  organizationName: string;
  maxVolunteers: number;
  requireSkills: number[];
  fields: number[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface EventRegistration {
  id: number;
  eventId: number;
  volunteerId: number;
  volunteerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  registrationDate: string;
  reason?: string; // Lý do từ chối hoặc hủy
}

export interface Volunteer {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  introduction?: string;
  avatarUrl?: string;
  skills: number[];
  fields: number[];
  rating: number;
  eventsCompleted: number;
  status: 'active' | 'inactive';
}

export interface Organization {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: OrganizationDocument[];
  rating: number;
  eventCount: number;
  rejectionReason?: string;
}

export interface OrganizationDocument {
  id: number;
  organizationId: number;
  name: string;
  type: string;
  description?: string;
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface Skill {
  id: number;
  name: string;
}

export interface Field {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalDataService {
  private events = new BehaviorSubject<Event[]>([]);
  private registrations = new BehaviorSubject<EventRegistration[]>([]);
  private volunteers = new BehaviorSubject<Volunteer[]>([]);
  private organizations = new BehaviorSubject<Organization[]>([]);
  private skills = new BehaviorSubject<Skill[]>([]);
  private fields = new BehaviorSubject<Field[]>([]);
  private documents = new BehaviorSubject<OrganizationDocument[]>([]);

  events$ = this.events.asObservable();
  registrations$ = this.registrations.asObservable();
  volunteers$ = this.volunteers.asObservable();
  organizations$ = this.organizations.asObservable();
  skills$ = this.skills.asObservable();
  fields$ = this.fields.asObservable();
  documents$ = this.documents.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Load data from localStorage or initialize with sample data
    this.loadEvents();
    this.loadRegistrations();
    this.loadVolunteers();
    this.loadOrganizations();
    this.loadSkillsAndFields();
    this.loadDocuments();
  }

  // EVENTS
  private loadEvents(): void {
    const storedEvents = localStorage.getItem('events');
    if (storedEvents) {
      this.events.next(JSON.parse(storedEvents));
    } else {
      // Sample data
      const sampleEvents: Event[] = [
        {
          id: 1,
          title: 'Dọn rác bãi biển Đà Nẵng',
          description: 'Hoạt động dọn dẹp môi trường biển, bảo vệ hệ sinh thái.',
          startDate: '2025-10-25T08:00',
          endDate: '2025-10-25T11:00',
          location: 'Bãi biển Mỹ Khê, Đà Nẵng',
          organizationId: 1,
          organizationName: 'Hội Bảo vệ Môi trường',
          maxVolunteers: 50,
          requireSkills: [1, 4],
          fields: [4, 3],
          status: 'active',
          createdAt: '2025-10-01T10:00'
        },
        {
          id: 2,
          title: 'Hiến máu tình nguyện',
          description: 'Chương trình hiến máu nhân đạo hàng quý.',
          startDate: '2025-11-10T07:30',
          endDate: '2025-11-10T16:30',
          location: 'Trung tâm Huyết học TP.HCM',
          organizationId: 2,
          organizationName: 'Hội Chữ thập đỏ',
          maxVolunteers: 100,
          requireSkills: [6],
          fields: [2, 3],
          status: 'active',
          createdAt: '2025-10-05T14:30'
        }
      ];
      this.events.next(sampleEvents);
      this.saveEvents();
    }
  }

  private saveEvents(): void {
    localStorage.setItem('events', JSON.stringify(this.events.value));
  }

  // REGISTRATIONS
  private loadRegistrations(): void {
    const storedRegistrations = localStorage.getItem('registrations');
    if (storedRegistrations) {
      this.registrations.next(JSON.parse(storedRegistrations));
    } else {
      // Sample data
      this.registrations.next([]);
      this.saveRegistrations();
    }
  }

  private saveRegistrations(): void {
    localStorage.setItem('registrations', JSON.stringify(this.registrations.value));
  }

  // VOLUNTEERS
  private loadVolunteers(): void {
    const storedVolunteers = localStorage.getItem('volunteers');
    if (storedVolunteers) {
      this.volunteers.next(JSON.parse(storedVolunteers));
    } else {
      // Sample data
      const sampleVolunteers: Volunteer[] = [
        {
          id: 1,
          userId: 3,
          name: 'Nguyễn Văn An',
          email: 'nguyenvanan@gmail.com',
          phone: '0901234567',
          birthDate: '1995-05-15',
          gender: 'Nam',
          address: 'Quận 1, TP.HCM',
          introduction: 'Sinh viên năm cuối ngành CNTT.',
          avatarUrl: '/assets/avatars/volunteer1.jpg',
          skills: [1, 3, 5],
          fields: [2, 4],
          rating: 4.5,
          eventsCompleted: 12,
          status: 'active'
        },
        {
          id: 2,
          userId: 4,
          name: 'Trần Thị Bình',
          email: 'tranbinh@gmail.com',
          phone: '0912345678',
          birthDate: '1998-10-20',
          gender: 'Nữ',
          address: 'Quận Cầu Giấy, Hà Nội',
          introduction: 'Giáo viên tiểu học, thích các hoạt động cộng đồng.',
          avatarUrl: '/assets/avatars/volunteer2.jpg',
          skills: [2, 6],
          fields: [1, 3],
          rating: 4.8,
          eventsCompleted: 8,
          status: 'active'
        }
      ];
      this.volunteers.next(sampleVolunteers);
      this.saveVolunteers();
    }
  }

  private saveVolunteers(): void {
    localStorage.setItem('volunteers', JSON.stringify(this.volunteers.value));
  }

  // ORGANIZATIONS
  private loadOrganizations(): void {
    const storedOrganizations = localStorage.getItem('organizations');
    if (storedOrganizations) {
      this.organizations.next(JSON.parse(storedOrganizations));
    } else {
      // Sample data
      const sampleOrganizations: Organization[] = [
        {
          id: 1,
          userId: 1,
          name: 'Hội Bảo vệ Môi trường',
          email: 'moitruongxanh@gmail.com',
          phone: '02839123456',
          address: 'Quận 3, TP.HCM',
          description: 'Tổ chức phi lợi nhuận hoạt động trong lĩnh vực bảo vệ môi trường.',
          logoUrl: '/assets/logos/org1.jpg',
          verificationStatus: 'verified',
          rating: 4.7,
          eventCount: 25
        },
        {
          id: 2,
          userId: 2,
          name: 'Hội Chữ thập đỏ',
          email: 'chuthapdo@gmail.com',
          phone: '02438241234',
          address: 'Quận Hai Bà Trưng, Hà Nội',
          description: 'Tổ chức nhân đạo hoạt động trong lĩnh vực y tế, cứu trợ.',
          logoUrl: '/assets/logos/org2.jpg',
          verificationStatus: 'verified',
          rating: 4.9,
          eventCount: 38
        }
      ];
      this.organizations.next(sampleOrganizations);
      this.saveOrganizations();
    }
  }

  private saveOrganizations(): void {
    localStorage.setItem('organizations', JSON.stringify(this.organizations.value));
  }

  // SKILLS & FIELDS
  private loadSkillsAndFields(): void {
    const storedSkills = localStorage.getItem('skills');
    if (storedSkills) {
      this.skills.next(JSON.parse(storedSkills));
    } else {
      // Sample skills
      const sampleSkills: Skill[] = [
        { id: 1, name: 'Lập trình' },
        { id: 2, name: 'Giáo dục' },
        { id: 3, name: 'Nấu ăn' },
        { id: 4, name: 'Thể thao' },
        { id: 5, name: 'Kỹ năng giao tiếp' },
        { id: 6, name: 'Chăm sóc y tế' }
      ];
      this.skills.next(sampleSkills);
      this.saveSkills();
    }

    const storedFields = localStorage.getItem('fields');
    if (storedFields) {
      this.fields.next(JSON.parse(storedFields));
    } else {
      // Sample fields
      const sampleFields: Field[] = [
        { id: 1, name: 'Giáo dục' },
        { id: 2, name: 'Y tế' },
        { id: 3, name: 'Cộng đồng' },
        { id: 4, name: 'Môi trường' },
        { id: 5, name: 'Văn hóa' },
        { id: 6, name: 'Thể thao' }
      ];
      this.fields.next(sampleFields);
      this.saveFields();
    }
  }

  private saveSkills(): void {
    localStorage.setItem('skills', JSON.stringify(this.skills.value));
  }

  private saveFields(): void {
    localStorage.setItem('fields', JSON.stringify(this.fields.value));
  }

  // DOCUMENTS
  private loadDocuments(): void {
    const storedDocuments = localStorage.getItem('documents');
    if (storedDocuments) {
      this.documents.next(JSON.parse(storedDocuments));
    } else {
      // Sample data
      const sampleDocuments: OrganizationDocument[] = [
        {
          id: 1,
          organizationId: 1,
          name: 'Giấy phép hoạt động',
          type: 'legal',
          description: 'Giấy phép hoạt động của tổ chức.',
          url: '/assets/documents/permit1.pdf',
          status: 'verified',
          createdAt: '2025-09-15T10:30'
        },
        {
          id: 2,
          organizationId: 2,
          name: 'Giấy chứng nhận đăng ký',
          type: 'registration',
          description: 'Giấy chứng nhận đăng ký tổ chức.',
          url: '/assets/documents/certificate1.pdf',
          status: 'verified',
          createdAt: '2025-09-10T11:45'
        }
      ];
      this.documents.next(sampleDocuments);
      this.saveDocuments();
    }
  }

  private saveDocuments(): void {
    localStorage.setItem('documents', JSON.stringify(this.documents.value));
  }

  // PUBLIC METHODS - EVENTS
  getEvents(): Event[] {
    return this.events.value;
  }

  getEventsByOrganization(orgId: number): Event[] {
    return this.events.value.filter(e => e.organizationId === orgId);
  }

  getEventById(id: number): Event | undefined {
    return this.events.value.find(e => e.id === id);
  }

  createEvent(event: Omit<Event, 'id' | 'createdAt'>): Event {
    const newId = Math.max(0, ...this.events.value.map(e => e.id)) + 1;
    const newEvent: Event = {
      ...event,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const updatedEvents = [...this.events.value, newEvent];
    this.events.next(updatedEvents);
    this.saveEvents();
    return newEvent;
  }

  updateEvent(id: number, eventData: Partial<Event>): Event | null {
    const currentEvents = this.events.value;
    const index = currentEvents.findIndex(e => e.id === id);
    
    if (index === -1) return null;
    
    const updatedEvent = {
      ...currentEvents[index],
      ...eventData
    };
    
    const updatedEvents = [
      ...currentEvents.slice(0, index),
      updatedEvent,
      ...currentEvents.slice(index + 1)
    ];
    
    this.events.next(updatedEvents);
    this.saveEvents();
    return updatedEvent;
  }

  deleteEvent(id: number): boolean {
    const currentEvents = this.events.value;
    const index = currentEvents.findIndex(e => e.id === id);
    
    if (index === -1) return false;
    
    // Mark event as cancelled instead of deleting
    const updatedEvent = {
      ...currentEvents[index],
      status: 'cancelled' as const
    };
    
    const updatedEvents = [
      ...currentEvents.slice(0, index),
      updatedEvent,
      ...currentEvents.slice(index + 1)
    ];
    
    this.events.next(updatedEvents);
    this.saveEvents();
    
    // Update related registrations
    this.cancelEventRegistrations(id);
    
    return true;
  }

  // PUBLIC METHODS - REGISTRATIONS
  getRegistrations(): EventRegistration[] {
    return this.registrations.value;
  }

  getRegistrationsByEvent(eventId: number): EventRegistration[] {
    return this.registrations.value.filter(r => r.eventId === eventId);
  }

  getRegistrationsByVolunteer(volunteerId: number): EventRegistration[] {
    return this.registrations.value.filter(r => r.volunteerId === volunteerId);
  }

  createRegistration(registration: Omit<EventRegistration, 'id' | 'registrationDate'>): EventRegistration | null {
    // Check if volunteer already registered for this event
    const existing = this.registrations.value.find(
      r => r.eventId === registration.eventId && r.volunteerId === registration.volunteerId
    );
    
    if (existing) return null;
    
    // Check if event exists and has space
    const event = this.getEventById(registration.eventId);
    if (!event || event.status !== 'active') return null;
    
    const currentRegistrations = this.getRegistrationsByEvent(registration.eventId)
                                   .filter(r => r.status === 'approved').length;
    
    if (currentRegistrations >= event.maxVolunteers) return null;
    
    const newId = Math.max(0, ...this.registrations.value.map(r => r.id)) + 1;
    const newRegistration: EventRegistration = {
      ...registration,
      id: newId,
      registrationDate: new Date().toISOString()
    };
    
    const updatedRegistrations = [...this.registrations.value, newRegistration];
    this.registrations.next(updatedRegistrations);
    this.saveRegistrations();
    return newRegistration;
  }

  updateRegistrationStatus(id: number, status: 'approved' | 'rejected' | 'cancelled', reason?: string): boolean {
    const currentRegistrations = this.registrations.value;
    const index = currentRegistrations.findIndex(r => r.id === id);
    
    if (index === -1) return false;
    
    const updatedRegistration = {
      ...currentRegistrations[index],
      status,
      reason: reason || currentRegistrations[index].reason
    };
    
    const updatedRegistrations = [
      ...currentRegistrations.slice(0, index),
      updatedRegistration,
      ...currentRegistrations.slice(index + 1)
    ];
    
    this.registrations.next(updatedRegistrations);
    this.saveRegistrations();
    return true;
  }

  cancelRegistration(id: number, reason?: string): boolean {
    return this.updateRegistrationStatus(id, 'cancelled', reason);
  }

  approveRegistration(id: number): boolean {
    return this.updateRegistrationStatus(id, 'approved');
  }

  rejectRegistration(id: number, reason: string): boolean {
    return this.updateRegistrationStatus(id, 'rejected', reason);
  }

  cancelEventRegistrations(eventId: number): void {
    const currentRegistrations = this.registrations.value;
    const updatedRegistrations = currentRegistrations.map(reg => 
      reg.eventId === eventId ? { ...reg, status: 'cancelled' as const, reason: 'Sự kiện đã bị hủy' } : reg
    );
    
    this.registrations.next(updatedRegistrations);
    this.saveRegistrations();
  }

  // PUBLIC METHODS - VOLUNTEERS
  getVolunteers(): Volunteer[] {
    return this.volunteers.value;
  }

  getVolunteerById(id: number): Volunteer | undefined {
    return this.volunteers.value.find(v => v.id === id);
  }

  getVolunteerByUserId(userId: number): Volunteer | undefined {
    return this.volunteers.value.find(v => v.userId === userId);
  }

  updateVolunteer(id: number, data: Partial<Volunteer>): Volunteer | null {
    const currentVolunteers = this.volunteers.value;
    const index = currentVolunteers.findIndex(v => v.id === id);
    
    if (index === -1) return null;
    
    const updatedVolunteer = {
      ...currentVolunteers[index],
      ...data
    };
    
    const updatedVolunteers = [
      ...currentVolunteers.slice(0, index),
      updatedVolunteer,
      ...currentVolunteers.slice(index + 1)
    ];
    
    this.volunteers.next(updatedVolunteers);
    this.saveVolunteers();
    return updatedVolunteer;
  }

  deleteVolunteer(id: number): boolean {
    // Check if volunteer has active registrations
    const activeRegistrations = this.registrations.value.some(
      r => r.volunteerId === id && 
           (r.status === 'approved' || r.status === 'pending') &&
           this.getEventById(r.eventId)?.status === 'active'
    );
    
    if (activeRegistrations) return false;
    
    // Mark as inactive instead of deleting
    const currentVolunteers = this.volunteers.value;
    const index = currentVolunteers.findIndex(v => v.id === id);
    
    if (index === -1) return false;
    
    const updatedVolunteer = {
      ...currentVolunteers[index],
      status: 'inactive' as const
    };
    
    const updatedVolunteers = [
      ...currentVolunteers.slice(0, index),
      updatedVolunteer,
      ...currentVolunteers.slice(index + 1)
    ];
    
    this.volunteers.next(updatedVolunteers);
    this.saveVolunteers();
    return true;
  }

  // PUBLIC METHODS - ORGANIZATIONS
  getOrganizations(): Organization[] {
    return this.organizations.value;
  }

  getOrganizationById(id: number): Organization | undefined {
    return this.organizations.value.find(o => o.id === id);
  }

  getOrganizationByUserId(userId: number): Organization | undefined {
    return this.organizations.value.find(o => o.userId === userId);
  }

  updateOrganization(id: number, data: Partial<Organization>): Organization | null {
    const currentOrganizations = this.organizations.value;
    const index = currentOrganizations.findIndex(o => o.id === id);
    
    if (index === -1) return null;
    
    const updatedOrganization = {
      ...currentOrganizations[index],
      ...data
    };
    
    const updatedOrganizations = [
      ...currentOrganizations.slice(0, index),
      updatedOrganization,
      ...currentOrganizations.slice(index + 1)
    ];
    
    this.organizations.next(updatedOrganizations);
    this.saveOrganizations();
    return updatedOrganization;
  }

  deleteOrganization(id: number): boolean {
    // Check if organization has active events
    const activeEvents = this.events.value.some(
      e => e.organizationId === id && 
           (e.status === 'active' || e.status === 'draft')
    );
    
    if (activeEvents) return false;
    
    const currentOrganizations = this.organizations.value;
    const index = currentOrganizations.findIndex(o => o.id === id);
    
    if (index === -1) return false;
    
    // Remove organization
    const updatedOrganizations = [
      ...currentOrganizations.slice(0, index),
      ...currentOrganizations.slice(index + 1)
    ];
    
    this.organizations.next(updatedOrganizations);
    this.saveOrganizations();
    
    // Update events
    const eventsToUpdate = this.events.value.filter(e => e.organizationId === id);
    eventsToUpdate.forEach(event => {
      this.updateEvent(event.id, { status: 'cancelled' });
    });
    
    return true;
  }

  verifyOrganization(id: number): boolean {
    const org = this.getOrganizationById(id);
    if (!org) return false;
    
    return !!this.updateOrganization(id, { verificationStatus: 'verified' });
  }

  rejectOrganization(id: number, reason: string): boolean {
    const org = this.getOrganizationById(id);
    if (!org) return false;
    
    return !!this.updateOrganization(id, { 
      verificationStatus: 'rejected',
      rejectionReason: reason
    });
  }

  // PUBLIC METHODS - SKILLS & FIELDS
  getSkills(): Skill[] {
    return this.skills.value;
  }

  getFields(): Field[] {
    return this.fields.value;
  }

  // PUBLIC METHODS - DOCUMENTS
  getDocuments(): OrganizationDocument[] {
    return this.documents.value;
  }

  getDocumentsByOrganization(orgId: number): OrganizationDocument[] {
    return this.documents.value.filter(d => d.organizationId === orgId);
  }

  addDocument(doc: Omit<OrganizationDocument, 'id' | 'createdAt'>): OrganizationDocument {
    const newId = Math.max(0, ...this.documents.value.map(d => d.id)) + 1;
    const newDoc: OrganizationDocument = {
      ...doc,
      id: newId,
      createdAt: new Date().toISOString()
    };
    
    const updatedDocs = [...this.documents.value, newDoc];
    this.documents.next(updatedDocs);
    this.saveDocuments();
    return newDoc;
  }

  updateDocumentStatus(id: number, status: 'verified' | 'rejected'): boolean {
    const currentDocs = this.documents.value;
    const index = currentDocs.findIndex(d => d.id === id);
    
    if (index === -1) return false;
    
    const updatedDoc = {
      ...currentDocs[index],
      status
    };
    
    const updatedDocs = [
      ...currentDocs.slice(0, index),
      updatedDoc,
      ...currentDocs.slice(index + 1)
    ];
    
    this.documents.next(updatedDocs);
    this.saveDocuments();
    return true;
  }

  deleteDocument(id: number): boolean {
    const currentDocs = this.documents.value;
    const index = currentDocs.findIndex(d => d.id === id);
    
    if (index === -1) return false;
    
    const updatedDocs = [
      ...currentDocs.slice(0, index),
      ...currentDocs.slice(index + 1)
    ];
    
    this.documents.next(updatedDocs);
    this.saveDocuments();
    return true;
  }

  // Clear all data (for testing/reset)
  clearAllData(): void {
    localStorage.removeItem('events');
    localStorage.removeItem('registrations');
    localStorage.removeItem('volunteers');
    localStorage.removeItem('organizations');
    localStorage.removeItem('skills');
    localStorage.removeItem('fields');
    localStorage.removeItem('documents');
    
    this.loadInitialData();
  }
}