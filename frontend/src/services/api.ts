import axios from 'axios';
import { cleanParams, type EquipmentSortField, type PageMeta, type SortOrder } from '../utils/listParams';

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

// Client sans jeton ni redirection vers la connexion : pour la fiche publique ouverte par scan d'un QR code
const publicApi = axios.create({ baseURL: API_BASE_URL });

export type PublicAssignee =
  | { state: 'ASSIGNED'; type: 'USER' | 'DEPARTMENT' | 'POSITION'; name: string | null }
  | { state: 'UNASSIGNED' }
  | { state: 'UNAVAILABLE' };

/** Fiche publique d'un équipement : ni prix, ni fournisseur, ni notes */
export interface PublicEquipmentSheet {
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string;
  barcode: string | null;
  status: string;
  condition: string;
  location: string | null;
  imageUrl: string | null;
  commissionedAt: string | null;
  decommissionedAt: string | null;
  warrantyEndDate: string | null;
  assignee: PublicAssignee;
}

export const publicEquipmentService = {
  getSheet: (id: string) => publicApi.get<{ data: PublicEquipmentSheet }>(`/public/equipments/${encodeURIComponent(id)}`),
};

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
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
  // false : aucune fiche reliée à un compte de connexion (rôle et état sans effet sur l'accès)
  linked?: boolean;
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

export interface Position {
  id: string;
  name: string;
  description?: string | null;
  departmentId: string;
  department?: Pick<Department, 'id' | 'name' | 'isActive' | 'status'>;
  status?: 'ACTIF' | 'INACTIF';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePositionDTO {
  name: string;
  departmentId: string;
  description?: string | null;
  status?: 'ACTIF' | 'INACTIF';
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  /** Nombre d'équipements rattachés (renvoyé par la liste) */
  equipmentCount?: number;
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

export type EquipmentStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'A_COMPLETER';

export type EquipmentCondition = 'FONCTIONNEL' | 'NON_FONCTIONNEL';

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
  condition?: EquipmentCondition;
  purchaseDate?: string | null;
  commissionedAt?: string | null;
  decommissionedAt?: string | null;
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
  condition?: EquipmentCondition;
  commissionedAt?: string | null;
  decommissionedAt?: string | null;
}

export interface UpdateEquipmentDTO {
  name?: string;
  serialNumber?: string;
  categoryId?: string;
  supplierId?: string | null;
  status?: EquipmentStatus;
  imageUrl?: string | null;
  condition?: EquipmentCondition;
  commissionedAt?: string | null;
  decommissionedAt?: string | null;
}

export const authService = {
  login: (credentials: LoginDTO) => api.post('/auth/login', credentials),
  register: (userData: RegisterDTO) => api.post('/auth/register', userData),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  // Fiche de l'utilisateur connecté (retrouvée par son compte)
  getMe: () => api.get('/users/me'),
  create: (data: CreateUserDTO) => api.post('/users', data),
  updateProfile: (id: string, data: Partial<CreateUserDTO>) => api.patch(`/users/${id}`, data),
  updateRole: (id: string, data: { role?: string; departmentId?: string; isActive?: boolean; status?: string }) => api.patch(`/users/${id}/role`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  purge: (password: string) => api.post<{ success: boolean; message: string; deletedCount: number }>('/users/purge', { password }),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: CreateDepartmentDTO) => api.post('/departments', data),
  update: (id: string, data: Partial<CreateDepartmentDTO>) => api.patch(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
  purge: (password: string) => api.post<{ success: boolean; message: string; deletedCount: number }>('/departments/purge', { password }),
};

export const positionService = {
  getAll: (departmentId?: string) => api.get('/positions', { params: departmentId ? { departmentId } : undefined }),
  getById: (id: string) => api.get(`/positions/${id}`),
  create: (data: CreatePositionDTO) => api.post('/positions', data),
  update: (id: string, data: Partial<CreatePositionDTO>) => api.patch(`/positions/${id}`, data),
  delete: (id: string) => api.delete(`/positions/${id}`),
  purge: (password: string) => api.post<{ success: boolean; message: string; deletedCount: number }>('/positions/purge', { password }),
};

export interface ImportPreview {
  headers: string[];
  /** Numéro de la ligne d'en-tête détectée (un titre peut la précéder) */
  headerRow: number;
  /** Lignes vides ou réduites à « () » ignorées après l'en-tête */
  ignoredRowCount: number;
  rowCount: number;
  sampleRows: { row: number; values: Record<string, string | number | boolean | null> }[];
  /** { "En-tête du fichier": "champ" } pour les colonnes reconnues automatiquement */
  suggestedMapping: Record<string, string>;
  fields: string[];
}

export type ImportUnassignedReason =
  | 'USER_NOT_FOUND'
  | 'USER_AMBIGUOUS'
  | 'USER_INACTIVE'
  | 'EQUIPMENT_TO_COMPLETE'
  | 'ASSIGNMENT_REFUSED'
  | 'ASSIGNMENT_UNAVAILABLE';

export interface ImportUnassignedRow {
  row: number;
  assigneeName: string;
  reason: ImportUnassignedReason;
  /** Nombre d'équipements de la ligne concernés */
  count: number;
}

export interface ImportResult {
  mapping: Record<string, string>;
  headerRow: number;
  ignoredRowCount: number;
  rowCount: number;
  createdCount: number;
  toCompleteCount: number;
  /** Équipements affectés automatiquement à l'import */
  assignedCount: number;
  /** Lignes dont le bénéficiaire nommé n'a pas pu être affecté */
  unassigned: ImportUnassignedRow[];
  /** Équipements créés par l'import (identifiant, numéro de série, statut) */
  equipments: { id: string; serialNumber: string; status: string }[];
}

const importFormData = (file: File, mapping?: Record<string, string>) => {
  const formData = new FormData();
  formData.append('file', file);
  if (mapping) formData.append('mapping', JSON.stringify(mapping));
  return formData;
};

// Sans `page` ni `pageSize`, le serveur renvoie la liste complète (`data` seul) ; avec l'un des deux, une page et son `meta`
export interface EquipmentListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: string;
  status?: string;
  /** Date de tri, aussi date de la période `from` / `to` */
  sort?: EquipmentSortField;
  order?: SortOrder;
  from?: string;
  to?: string;
}

export interface PagedResponse<T> {
  success: boolean;
  data: T[];
  meta?: PageMeta;
}

export const equipmentService = {
  getAll: (params?: EquipmentListParams) => api.get('/equipments', { params: cleanParams({ ...params }) }),
  getById: (id: string) => api.get(`/equipments/${id}`),
  create: (data: CreateEquipmentDTO) => api.post('/equipments', data),
  update: (id: string, data: UpdateEquipmentDTO) => api.patch(`/equipments/${id}`, data),
  delete: (id: string) => api.delete(`/equipments/${id}`),
  transfer: (id: string, data: { toUserId?: string; toDepartmentId?: string; reason?: string }) =>
    api.post(`/equipments/${id}/transfer`, data),
  // L'instance envoie du JSON par défaut : les envois de fichiers forcent multipart/form-data (comme uploadImage)
  previewImport: (file: File) =>
    api.post('/equipments/import/preview', importFormData(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importFile: (file: File, mapping: Record<string, string>) =>
    api.post('/equipments/import', importFormData(file, mapping), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportFile: (format: 'csv' | 'xlsx') =>
    api.get('/equipments/export', { params: { format }, responseType: 'blob' }),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/equipments/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  purge: (password: string) => api.post<{ success: boolean; message: string; deletedCount: number }>('/equipments/purge', { password }),
};

// Rapport de l'import des catégories : les catégories déjà existantes sont laissées inchangées
export interface CategoryImportResult {
  rowCount: number;
  createdCount: number;
  existingCount: number;
  duplicateInFileCount: number;
  existingNames: string[];
}

export const categoryService = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/categories', data),
  update: (id: string, data: { name?: string; description?: string }) => api.patch(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  // Comme les équipements : l'instance envoie du JSON par défaut, l'envoi d'un fichier force multipart/form-data
  importFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ data: CategoryImportResult }>('/categories/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  purge: (password: string) => api.post<{ success: boolean; message: string; deletedCount: number }>('/categories/purge', { password }),
};

export type AssigneeType = 'USER' | 'DEPARTMENT' | 'POSITION';

/** Bénéficiaire résolu par assignment-service (utilisateur, département ou poste) */
export type AssigneeInfo = Partial<User> & {
  id: string;
  name?: string;
  isActive?: boolean;
  department?: { id: string; name: string } | null;
};

export interface Assignment {
  id: string;
  equipmentId: string;
  assigneeType: AssigneeType;
  assigneeId: string;
  /** Ancien champ, conservé pour compatibilité : n'est plus renvoyé par le backend */
  userId?: string;
  assignee?: AssigneeInfo | null;
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
  assigneeType: AssigneeType;
  assigneeId: string;
  notes?: string;
  expectedReturnDate?: string;
  handoverCondition?: string;
}

export interface CreateBulkAssignmentDTO {
  equipmentIds: string[];
  assigneeType: AssigneeType;
  assigneeId: string;
  notes?: string;
  expectedReturnDate?: string;
  handoverCondition?: string;
}

/** Équipement refusé par une affectation groupée (aucune affectation n'est alors créée) */
export interface BulkRefusal {
  equipmentId: string;
  name?: string;
  serialNumber?: string;
  reason: 'NOT_FOUND' | 'NOT_AVAILABLE';
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
  createBulk: (data: CreateBulkAssignmentDTO) => api.post('/assignments/bulk', data),
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

export interface DashboardKpis {
  equipments: {
    total: number;
    /** Nombre d'équipements par statut (clés : AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, A_COMPLETER) */
    byStatus: Record<string, number>;
    byCategory: { categoryId: string; name: string | null; total: number; available: number }[];
  };
  assignments: {
    active: number;
    byAssigneeType: Record<AssigneeType, number>;
  };
  inventories: { inProgress: number };
  /** false tant que les compteurs n'ont jamais été alimentés (à reconstruire) */
  synchronized: boolean;
  updatedAt: string | null;
}

export interface KpiRebuildSummary {
  equipmentCount: number;
  activeAssignmentCount: number;
}

export const dashboardService = {
  getKpis: () => api.get('/dashboard/kpis'),
  rebuildKpis: () => api.post('/dashboard/kpis/rebuild'),
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

export type AuditCategory = 'AUTHENTICATION' | 'DATA_MUTATION' | 'SYSTEM_EVENT';

/** Compteurs de tout le journal, sans tenir compte des filtres (réponse paginée uniquement) */
export interface AuditSummary {
  total: number;
  authCount: number;
  mutationCount: number;
  failedCount: number;
}

export interface AuditListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: AuditCategory;
  /** Jour au format AAAA-MM-JJ */
  date?: string;
}

export const auditLogService = {
  getAll: (params?: AuditListParams) => api.get('/audit-logs', { params: cleanParams({ ...params }) }),
  getById: (id: string) => api.get(`/audit-logs/${id}`),
};



