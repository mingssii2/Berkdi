'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useStore, Role } from './store';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './components/ui/command';
import { Home, FileText, CheckSquare, DollarSign, Settings, LogOut, FolderKanban, Check, ChevronsUpDown, UserCog } from 'lucide-react';
import { cn } from './lib/utils';
import { format } from 'date-fns';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { 
    currentUser, switchRole, logout, 
    projects, claims,
    globalFilterProject, setGlobalFilterProject,
    globalFilterPeriod, setGlobalFilterPeriod
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [projectOpen, setProjectOpen] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">ProExpense</h1>
          <p className="text-gray-600 mb-6">Please log in to continue</p>
          <Button onClick={() => router.push('/login')}>Log In with Google</Button>
        </div>
      </div>
    );
  }

  const role = currentUser.activeRole;

  const navItems = [
    { name: 'Home', path: '/', icon: Home, roles: ['staff', 'manager', 'ceo'] },
    { name: 'My Claims', path: '/claims', icon: FileText, roles: ['staff'] },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['manager', 'ceo'] },
    { name: 'My Projects', path: '/my-projects', icon: FolderKanban, roles: ['staff', 'manager', 'ceo'] },
    { name: 'Accounting', path: '/accounting', icon: DollarSign, roles: ['accounting'] },
    { name: 'Admin', path: '/admin', icon: Settings, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: UserCog, roles: ['staff', 'manager', 'ceo', 'accounting', 'admin'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(role));

  // Get unique periods from claims for the filter, and ensure current month is included
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const uniquePeriods = Array.from(new Set([...claims.map(c => c.periodMonth), currentMonthStr])).sort().reverse();

  const selectedProject = globalFilterProject === 'all' 
    ? { id: 'all', code: 'ALL', name: 'ทั้งหมด' } 
    : projects.find(p => p.id === globalFilterProject);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-64 bg-white border-r fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/" className="text-xl font-bold text-blue-600">ProExpense</Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col sm:ml-64 min-h-screen min-w-0">
        {/* Header (Mobile & Desktop) */}
        <header className="bg-white border-b sticky top-0 z-10 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center sm:hidden">
            <Link href="/" className="text-xl font-bold text-blue-600">ProExpense</Link>
          </div>
          
          {/* Global Filters (Moved to a secondary bar below) */}
          <div className="flex items-center space-x-4 ml-auto">
            <div className="text-sm text-gray-600 hidden md:block">
              สวัสดี, {currentUser.name}
            </div>
            <Select value={role} onValueChange={(val) => { switchRole(val as Role); router.push('/'); }}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {currentUser.roles.map(r => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => { logout(); router.push('/login'); }}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Secondary Filter Bar */}
        <div className="bg-white border-b px-4 sm:px-6 py-3 space-y-3 shadow-sm z-0 w-full overflow-hidden flex flex-col sm:flex-row sm:space-y-0 sm:gap-4 items-start sm:items-center">
          {/* Project Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap shrink-0">โครงการ:</span>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger 
                render={
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectOpen}
                    className="w-full sm:w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {selectedProject ? (selectedProject.id === 'all' ? 'ทั้งหมด' : `${selectedProject.code} - ${selectedProject.name}`) : "เลือกโครงการ..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                }
              />
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="ค้นหาโครงการ..." />
                  <CommandList>
                    <CommandEmpty>ไม่พบโครงการ</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setGlobalFilterProject('all');
                          setProjectOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            globalFilterProject === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        ทั้งหมด
                      </CommandItem>
                      {projects.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.code} ${p.name}`}
                          onSelect={() => {
                            setGlobalFilterProject(p.id);
                            setProjectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              globalFilterProject === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.code} - {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap shrink-0">รอบบัญชี:</span>
            <Select value={globalFilterPeriod} onValueChange={setGlobalFilterPeriod}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="เลือกรอบบัญชี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {uniquePeriods.map(period => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 w-full bg-white border-t flex justify-around pb-safe z-20">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                "flex flex-col items-center py-3 px-2 text-[10px] font-medium w-full",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="truncate w-full text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
