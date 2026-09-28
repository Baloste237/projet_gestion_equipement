import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  role?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  role: 'ADMIN' | 'RESPONSABLE' | 'EMPLOYE' | 'AUDITEUR';
  departmentId?: string;
  avatarUrl?: string;
  isActive?: boolean;
  status?: 'ACTIF' | 'INACTIF';
  createdAt?: string;
  updatedAt?: string;
  department?: {
    id: string;
    name: string;
  };
}

export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  authUserId?: string;
  role?: 'ADMIN' | 'RESPONSABLE' | 'EMPLOYE' | 'AUDITEUR';
  departmentId?: string;
  avatarUrl?: string;
  isActive?: boolean;
  status?: 'ACTIF' | 'INACTIF';
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  status?: 'ACTIF' | 'INACTIF';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  usersCount?: number;
  users?: User[];
}

export interface CreateDepartmentDTO {
  name: string;
  description?: string;
  status?: 'ACTIF' | 'INACTIF';
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EquipmentStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED';

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  status: EquipmentStatus;
  categoryId: string;
  category?: Category;
  supplierId?: string | null;
  supplier?: Supplier | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEquipmentDTO {
  name: string;
  serialNumber: string;
  categoryId: string;
  supplierId?: string | null;
  status?: EquipmentStatus;
  imageUrl?: string | null;
}

export interface UpdateEquipmentDTO {
  name?: string;
  serialNumber?: string;
  categoryId?: string;
  supplierId?: string | null;
  status?: EquipmentStatus;
  imageUrl?: string | null;
}

export const authService = {
  login: (credentials: LoginDTO) => api.post('/auth/login', credentials),
  register: (userData: RegisterDTO) => api.post('/auth/register', userData),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: CreateUserDTO) => api.post('/users', data),
  updateProfile: (id: string, data: Partial<CreateUserDTO>) => api.patch(`/users/${id}`, data),
  updateRole: (id: string, data: { role?: string; departmentId?: string; isActive?: boolean; status?: string }) => api.patch(`/users/${id}/role`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: CreateDepartmentDTO) => api.post('/departments', data),
  update: (id: string, data: Partial<CreateDepartmentDTO>) => api.patch(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

export const equipmentService = {
  getAll: () => api.get('/equipments'),
  getById: (id: string) => api.get(`/equipments/${id}`),
  create: (data: CreateEquipmentDTO) => api.post('/equipments', data),
  update: (id: string, data: UpdateEquipmentDTO) => api.patch(`/equipments/${id}`, data),
  delete: (id: string) => api.delete(`/equipments/${id}`),
  transfer: (id: string, data: { toUserId?: string; toDepartmentId?: string; reason?: string }) =>
    api.post(`/equipments/${id}/transfer`, data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/equipments/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const categoryService = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/categories', data),
};

export interface Assignment {
  id: string;
  equipmentId: string;
  userId: string;
  assignedAt: string;
  expectedReturnDate?: string | null;
  handoverCondition?: string | null;
  status: 'ACTIVE' | 'TRANSFERRED' | 'RETURNED';
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: User | null;
  equipment?: Equipment | null;
  transfers?: any[];
  returnInfo?: {
    id: string;
    condition: 'GOOD' | 'DAMAGED' | 'LOST';
    note?: string;
    returnDate: string;
  } | null;
}

export interface CreateAssignmentDTO {
  equipmentId: string;
  userId: string;
  notes?: string;
  expectedReturnDate?: string;
  handoverCondition?: string;
}

export interface TransferAssignmentDTO {
  toUserId: string;
  reason?: string;
}

export interface ReturnAssignmentDTO {
  condition: 'GOOD' | 'DAMAGED' | 'LOST';
  note?: string;
}

export const supplierService = {
  getAll: () => api.get('/suppliers'),
  getById: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: { name: string; contactInfo?: string }) => api.post('/suppliers', data),
};

export const assignmentService = {
  getAll: () => api.get('/assignments'),
  getById: (id: string) => api.get(`/assignments/${id}`),
  create: (data: CreateAssignmentDTO) => api.post('/assignments', data),
  transfer: (id: string, data: TransferAssignmentDTO) => api.post(`/assignments/${id}/transfer`, data),
  return: (id: string, data: ReturnAssignmentDTO) => api.post(`/assignments/${id}/return`, data),
};

export interface InventoryItem {
  id: string;
  inventoryId: string;
  equipmentId: string;
  found: boolean;
  note?: string | null;
  checkedAt?: string | null;
  equipment?: Equipment | null;
}

export interface Inventory {
  id: string;
  title: string;
  startedAt: string;
  completedAt?: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  items?: InventoryItem[];
}

export interface CreateInventoryDTO {
  title: string;
  autoPopulate?: boolean;
}

export interface CheckInventoryItemDTO {
  found: boolean;
  note?: string;
}

export const inventoryService = {
  getAll: () => api.get('/inventories'),
  getById: (id: string) => api.get(`/inventories/${id}`),
  create: (data: CreateInventoryDTO) => api.post('/inventories', data),
  addItem: (id: string, data: { equipmentId: string }) => api.post(`/inventories/${id}/items`, data),
  checkItem: (itemId: string, data: CheckInventoryItemDTO) => api.patch(`/inventories/items/${itemId}/check`, data),
  complete: (id: string) => api.patch(`/inventories/${id}/complete`),
};

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  serviceName: string;
  metadata?: any;
  createdAt: string;
}

export const auditLogService = {
  getAll: () => api.get('/audit-logs'),
  getById: (id: string) => api.get(`/audit-logs/${id}`),
};



