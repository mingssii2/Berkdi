import { create } from 'zustand';
import { format } from 'date-fns';

export type Role = 'staff' | 'manager' | 'ceo' | 'accounting' | 'admin';

export interface PresetRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
}

export interface User {
  id: string;
  name: string;
  roles: Role[];
  activeRole: Role;
  managerId?: string;
  homeAddress?: string;
  officeAddress?: string;
  presetRoutes?: PresetRoute[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  managerId: string;
  isPublic: boolean;
}

export type ItemType = 'travel' | 'misc';
export type ItemStatus = 'draft' | 'waiting' | 'ceo_pending' | 'approved' | 'paid' | 'rejected' | 'deleted';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
}

export interface ProjectRoute {
  id: string;
  projectId: string;
  origin: string;
  destination: string;
  distance: number;
  originLatLng?: { lat: number, lng: number };
  destLatLng?: { lat: number, lng: number };
}

export interface ExpenseItem {
  id: string;
  userId: string;
  projectCodeId: string;
  type: ItemType;
  amount: number;
  date: string;
  status: ItemStatus;
  claimId: string | null;
  description?: string;
  origin?: string;
  destination?: string;
  distance?: number;
  receiptUrl?: string;
  createdAt: string;
}

export type ClaimStatus = 'draft' | 'waiting' | 'approved' | 'partial_approved' | 'ceo_pending' | 'ceo_approved' | 'ready_to_pay' | 'paid' | 'rejected';

export interface ExpenseClaim {
  id: string;
  userId: string;
  periodMonth: string; // YYYY-MM
  status: ClaimStatus;
  totalAmount: number;
  items: string[]; // item IDs
  createdAt: string;
  isSpecial?: boolean;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  projectMembers: ProjectMember[];
  projectRoutes: ProjectRoute[];
  items: ExpenseItem[];
  claims: ExpenseClaim[];
  
  globalFilterProject: string;
  globalFilterPeriod: string;
  globalFilterUser: string;
  isFilterOpen: boolean;
  setGlobalFilterProject: (projectId: string) => void;
  setGlobalFilterPeriod: (period: string) => void;
  setGlobalFilterUser: (userId: string) => void;
  toggleFilter: () => void;
  
  login: (userId: string) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
  
  addExpenseItem: (item: Omit<ExpenseItem, 'id' | 'createdAt' | 'status' | 'claimId'>) => void;
  updateItemStatus: (id: string, status: ItemStatus) => void;
  updateItem: (id: string, data: Partial<ExpenseItem>) => void;
  
  createClaim: (itemIds: string[], isSpecial?: boolean) => void;
  submitClaim: (claimId: string) => void;
  approveClaim: (claimId: string, itemStatuses: Record<string, ItemStatus>) => void;
  rejectClaim: (claimId: string, reason: string) => void;
  ceoApproveClaim: (claimId: string) => void;
  ceoReturnClaim: (claimId: string, reason: string) => void;
  
  markReadyToPay: (claimIds: string[]) => void;
  markPaid: (claimIds: string[]) => void;

  addProjectMember: (projectId: string, userId: string) => void;
  removeProjectMember: (id: string) => void;
  addProjectRoute: (route: Omit<ProjectRoute, 'id'>) => void;
  removeProjectRoute: (id: string) => void;
  
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  updateUserSettings: (userId: string, settings: Partial<User>) => void;
  
  // Mock actions
  runCronJob: () => void;
}

const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'สมชาย (All Roles)', 
    roles: ['staff', 'manager', 'ceo', 'accounting', 'admin'], 
    activeRole: 'staff', 
    managerId: 'u2',
    homeAddress: 'บ้าน — ลาดพร้าว 71 กรุงเทพฯ',
    officeAddress: 'สำนักงาน อย. นนทบุรี',
    presetRoutes: [
      { id: 'pr_u1_1', name: 'บ้าน -> ที่ทำงาน', origin: 'บ้าน — ลาดพร้าว 71 กรุงเทพฯ', destination: 'สำนักงาน อย. นนทบุรี', distance: 17 },
      { id: 'pr_u1_2', name: 'ที่ทำงาน -> บ้าน', origin: 'สำนักงาน อย. นนทบุรี', destination: 'บ้าน — ลาดพร้าว 71 กรุงเทพฯ', distance: 16 }
    ]
  },
  { id: 'u2', name: 'ผู้จัดการ เอ (Manager)', roles: ['staff', 'manager'], activeRole: 'manager' },
  { id: 'u3', name: 'ท่านประธาน (CEO)', roles: ['ceo'], activeRole: 'ceo' },
  { id: 'u4', name: 'สมหญิง (Accounting)', roles: ['accounting'], activeRole: 'accounting' },
  { id: 'u5', name: 'แอดมิน (Admin)', roles: ['admin'], activeRole: 'admin' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', code: 'BKK', name: 'Bangkok Branch', managerId: 'u2', isPublic: true },
  { id: 'p2', code: 'OPM', name: 'Operations', managerId: 'u2', isPublic: false },
  { id: 'p3', code: 'DEV', name: 'Development Team', managerId: 'u1', isPublic: true },
];

export const useStore = create<AppState>((set, get) => ({
  currentUser: MOCK_USERS[0],
  users: MOCK_USERS,
  projects: MOCK_PROJECTS,
  projectMembers: [
    { id: 'pm1', projectId: 'p3', userId: 'u1' },
    { id: 'pm2', projectId: 'p3', userId: 'u2' },
  ],
  projectRoutes: [
    { id: 'pr1', projectId: 'p3', origin: 'บ้าน', destination: 'Promes', distance: 15.3, originLatLng: { lat: 13.7563, lng: 100.5018 }, destLatLng: { lat: 13.7463, lng: 100.5318 } },
    { id: 'pr2', projectId: 'p3', origin: 'Promes', destination: 'ลูกค้า A', distance: 10.5, originLatLng: { lat: 13.7463, lng: 100.5318 }, destLatLng: { lat: 13.7363, lng: 100.5518 } },
  ],
  items: [
    { id: 'i1', userId: 'u1', projectCodeId: 'p1', type: 'travel', amount: 214, date: '2026-03-15', status: 'draft', claimId: null, origin: 'บ้าน', destination: 'Promes', distance: 30.6, createdAt: new Date().toISOString(), receiptUrl: 'https://picsum.photos/seed/map1/600/400' },
    { id: 'i2', userId: 'u1', projectCodeId: 'p1', type: 'misc', amount: 350, date: '2026-03-18', status: 'draft', claimId: null, description: 'Grab receipt', createdAt: new Date().toISOString(), receiptUrl: 'https://picsum.photos/seed/receipt1/400/600' },
    { id: 'i3', userId: 'u2', projectCodeId: 'p3', type: 'misc', amount: 1500, date: '2026-03-20', status: 'draft', claimId: 'c4', description: 'Team Lunch', createdAt: new Date().toISOString(), receiptUrl: 'https://picsum.photos/seed/receipt2/400/600' },
  ],
  claims: [
    { id: 'c1', userId: 'u1', periodMonth: '2026-02', status: 'waiting', totalAmount: 1500, items: [], createdAt: new Date().toISOString() },
    { id: 'c2', userId: 'u1', periodMonth: '2026-02', status: 'ceo_pending', totalAmount: 45000, items: [], createdAt: new Date().toISOString() },
    { id: 'c3', userId: 'u1', periodMonth: '2026-01', status: 'approved', totalAmount: 2500, items: [], createdAt: new Date().toISOString() },
    { id: 'c4', userId: 'u2', periodMonth: '2026-03', status: 'waiting', totalAmount: 1500, items: ['i3'], createdAt: new Date().toISOString() },
  ],

  globalFilterProject: 'all',
  globalFilterPeriod: format(new Date(), 'yyyy-MM'),
  globalFilterUser: 'all',
  isFilterOpen: false,
  setGlobalFilterProject: (projectId) => set({ globalFilterProject: projectId }),
  setGlobalFilterPeriod: (period) => set({ globalFilterPeriod: period }),
  setGlobalFilterUser: (userId) => set({ globalFilterUser: userId }),
  toggleFilter: () => set((state) => ({ isFilterOpen: !state.isFilterOpen })),

  login: (userId) => set((state) => ({ currentUser: state.users.find(u => u.id === userId) || null })),
  logout: () => set({ currentUser: null }),
  switchRole: (role) => set((state) => {
    if (!state.currentUser) return state;
    return { currentUser: { ...state.currentUser, activeRole: role } };
  }),

  addExpenseItem: (item) => set((state) => {
    const newItem: ExpenseItem = {
      ...item,
      id: `i${Date.now()}`,
      status: 'draft',
      claimId: null,
      createdAt: new Date().toISOString(),
    };
    return { items: [...state.items, newItem] };
  }),

  updateItemStatus: (id, status) => set((state) => ({
    items: state.items.map(i => i.id === id ? { ...i, status } : i)
  })),

  updateItem: (id, data) => set((state) => ({
    items: state.items.map(i => i.id === id ? { ...i, ...data } : i)
  })),

  submitClaim: (claimId) => set((state) => ({
    claims: state.claims.map(c => c.id === claimId ? { ...c, status: 'waiting' } : c)
  })),

  approveClaim: (claimId, itemStatuses) => set((state) => {
    const claim = state.claims.find(c => c.id === claimId);
    if (!claim) return state;
    
    let newStatus: ClaimStatus = 'approved';
    if (claim.totalAmount >= 30000) {
      newStatus = 'ceo_pending';
    }
    
    const hasRejects = Object.values(itemStatuses).some(s => s === 'rejected');
    if (hasRejects && newStatus === 'approved') newStatus = 'partial_approved';

    return {
      claims: state.claims.map(c => c.id === claimId ? { ...c, status: newStatus } : c),
      items: state.items.map(i => itemStatuses[i.id] ? { ...i, status: itemStatuses[i.id] } : i)
    };
  }),

  rejectClaim: (claimId, reason) => set((state) => ({
    claims: state.claims.map(c => c.id === claimId ? { ...c, status: 'rejected' } : c)
  })),

  ceoApproveClaim: (claimId) => set((state) => ({
    claims: state.claims.map(c => c.id === claimId ? { ...c, status: 'ceo_approved' } : c)
  })),

  ceoReturnClaim: (claimId, reason) => set((state) => {
    const claim = state.claims.find(c => c.id === claimId);
    if (!claim) return state;
    return {
      claims: state.claims.map(c => c.id === claimId ? { ...c, status: 'waiting' } : c),
      items: state.items.map(i => claim.items.includes(i.id) ? { ...i, status: 'draft' } : i)
    };
  }),

  markReadyToPay: (claimIds) => set((state) => ({
    claims: state.claims.map(c => claimIds.includes(c.id) ? { ...c, status: 'ready_to_pay' } : c)
  })),

  markPaid: (claimIds) => set((state) => ({
    claims: state.claims.map(c => claimIds.includes(c.id) ? { ...c, status: 'paid' } : c)
  })),

  addProjectMember: (projectId, userId) => set((state) => ({
    projectMembers: [...state.projectMembers, { id: `pm${Date.now()}`, projectId, userId }]
  })),

  removeProjectMember: (id) => set((state) => ({
    projectMembers: state.projectMembers.filter(pm => pm.id !== id)
  })),

  addProjectRoute: (route) => set((state) => ({
    projectRoutes: [...state.projectRoutes, { ...route, id: `pr${Date.now()}` }]
  })),

  removeProjectRoute: (id) => set((state) => ({
    projectRoutes: state.projectRoutes.filter(pr => pr.id !== id)
  })),

  addProject: (project) => set((state) => ({
    projects: [...state.projects, { ...project, id: `p${Date.now()}` }]
  })),

  updateProject: (id, project) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...project } : p)
  })),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id)
  })),

  updateUserSettings: (userId, settings) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, ...settings } : u),
    currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...settings } : state.currentUser
  })),

  createClaim: (itemIds, isSpecial) => set((state) => {
    const itemsToClaim = state.items.filter(i => itemIds.includes(i.id));
    if (itemsToClaim.length === 0) return state;

    const periodMonth = format(new Date(), 'yyyy-MM');
    
    // Group by user and project
    const groups: Record<string, ExpenseItem[]> = {};
    itemsToClaim.forEach(item => {
      const key = `${item.userId}_${item.projectCodeId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const newClaims: ExpenseClaim[] = [];
    let updatedItems = [...state.items];

    Object.values(groups).forEach(groupItems => {
      const claimId = `c${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = groupItems.reduce((sum, item) => sum + item.amount, 0);
      
      newClaims.push({
        id: claimId,
        userId: groupItems[0].userId,
        periodMonth,
        status: 'waiting', // Directly to waiting for manager approval
        totalAmount,
        items: groupItems.map(i => i.id),
        createdAt: new Date().toISOString(),
        isSpecial
      });

      updatedItems = updatedItems.map(i => 
        groupItems.some(gi => gi.id === i.id) 
          ? { ...i, status: 'waiting', claimId } // Keep item status waiting until manager reviews
          : i
      );
    });

    return {
      claims: [...state.claims, ...newClaims],
      items: updatedItems
    };
  }),

  runCronJob: () => set((state) => {
    const periodMonth = format(new Date(), 'yyyy-MM');
    const draftItems = state.items.filter(i => i.status === 'draft' && i.claimId === null);
    
    // Group by user and project
    const groups: Record<string, ExpenseItem[]> = {};
    draftItems.forEach(item => {
      const key = `${item.userId}_${item.projectCodeId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const newClaims: ExpenseClaim[] = [];
    let updatedItems = [...state.items];

    Object.values(groups).forEach(groupItems => {
      const claimId = `c${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = groupItems.reduce((sum, item) => sum + item.amount, 0);
      
      newClaims.push({
        id: claimId,
        userId: groupItems[0].userId,
        periodMonth,
        status: 'draft',
        totalAmount,
        items: groupItems.map(i => i.id),
        createdAt: new Date().toISOString()
      });

      updatedItems = updatedItems.map(i => 
        groupItems.find(gi => gi.id === i.id) ? { ...i, claimId } : i
      );
    });

    return {
      claims: [...state.claims, ...newClaims],
      items: updatedItems
    };
  })
}));
