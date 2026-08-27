import React, { useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Clock,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Wallet,
  Activity,
  Target,
  Sparkles,
  Plus,
  Settings2,
} from 'lucide-react';
import { ModuleRoute } from '../../types';
import { Haptics } from '../../services/haptics';

interface NavigationRailProps {
  currentRoute: ModuleRoute;
  onNavigate: (route: ModuleRoute) => void;
  onOpenQuickAdd?: () => void;
  onOpenSettings?: (tab?: any) => void;
  badges?: Record<string, string | number>;
}

const NAV_ITEMS: {
  route: ModuleRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  { route: 'overview', label: 'Overview', icon: LayoutDashboard, accentColor: 'var(--md-sys-color-primary)' },
  { route: 'timeline', label: 'Timeline', icon: Clock, accentColor: '#C77DFF' },
  { route: 'journal', label: 'Journal', icon: BookOpen, accentColor: '#2D6A4F' },
  { route: 'study', label: 'Study', icon: GraduationCap, accentColor: '#22A566' },
  { route: 'recovery', label: 'Unbound', icon: ShieldCheck, accentColor: '#D3A346' },
  { route: 'finance', label: 'Finance', icon: Wallet, accentColor: '#4FA9E0' },
  { route: 'checkin', label: 'Pulse', icon: Activity, accentColor: '#F0A8C4' },
  { route: 'goals', label: 'Goals', icon: Target, accentColor: '#E8B368' },
];

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentRoute,
  onNavigate,
  onOpenQuickAdd,
  onOpenSettings,
  badges = {},
}) => {
  const mobileNavContainerRef = useRef<HTMLDivElement>(null);
  const activeMobileItemRef = useRef<HTMLButtonElement | null>(null);

  // Smoothly scroll active item into center view on mobile
  useEffect(() => {
    if (activeMobileItemRef.current && mobileNavContainerRef.current) {
      activeMobileItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentRoute]);

  const handleNavClick = (route: ModuleRoute) => {
    Haptics.selection();
    onNavigate(route);
  };

  const handleQuickAddClick = () => {
    Haptics.light();
    onOpenQuickAdd?.();
  };

  const handleSettingsClick = () => {
    Haptics.selection();
    onOpenSettings?.();
  };

  return (
    <>
      {/* Desktop Navigation Rail */}
      <aside
        className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r shrink-0 z-40 select-none transition-colors"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        {/* Brand */}
        <div className="p-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-secondary) 100%)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-base font-bold font-display tracking-tight text-on-surface flex items-center gap-1.5">
                <span>Meridian</span>
              </div>
              <div className="text-[11px] font-mono tracking-wider uppercase text-on-surface-variant">
                Personal Systems
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Action Button in Rail */}
        {onOpenQuickAdd && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={handleQuickAddClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all shadow-sm active:scale-[0.98] hover:shadow"
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Quick Log (Q)</span>
            </button>
          </div>
        )}

        {/* Divider */}
        <div
          className="h-[2px] mx-5 my-1 rounded-full opacity-60"
          style={{
            background: 'linear-gradient(90deg, var(--md-sys-color-primary), var(--md-sys-color-tertiary), var(--md-sys-color-secondary))',
          }}
        />

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            const badgeValue = badges?.[item.route];

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs md:text-sm font-medium transition-all group relative m3-ripple ${
                  isActive ? 'shadow-sm font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full"
                    style={{ backgroundColor: 'var(--md-sys-color-primary)' }}
                  />
                )}

                {/* Icon in container */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'scale-105' : 'group-hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--md-sys-color-primary)' : 'transparent',
                    color: isActive ? 'var(--md-sys-color-on-primary)' : 'inherit',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <span className="truncate flex-1 text-left">{item.label}</span>

                {/* Badge if present */}
                {badgeValue !== undefined && badgeValue !== '' && (
                  <span
                    className="px-2 py-0.5 text-[10.5px] font-mono rounded-full font-semibold shrink-0"
                    style={{
                      backgroundColor: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                      color: isActive ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                    }}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Rail Footer (Settings + Systems status) */}
        <div
          className="p-3 border-t text-[11px] text-on-surface-variant space-y-2"
          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
        >
          <button
            type="button"
            onClick={handleSettingsClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold text-on-surface"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              <Settings2 className="w-4 h-4" />
            </div>
            <span>Settings</span>
          </button>

          <div className="flex items-center justify-between font-mono px-1">
            <span>Systems Online</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-emerald-400 font-semibold">6 Modules</span>
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant/80 px-1">Offline-first · Material You v3</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Horizontally scrollable with smooth auto-centering & edge gradient hints) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl select-none"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-high, rgba(30, 32, 28, 0.96))',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div
          ref={mobileNavContainerRef}
          className="overflow-x-auto no-scrollbar scroll-smooth flex items-center justify-start sm:justify-center gap-1.5 px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] w-full touch-pan-x"
        >
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            const badgeValue = badges?.[item.route];

            return (
              <button
                key={item.route}
                ref={isActive ? activeMobileItemRef : null}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[62px] px-2 py-1 relative rounded-2xl transition-all active:scale-95 select-none focus:outline-none ${
                  isActive ? 'font-semibold' : 'opacity-85 hover:opacity-100'
                }`}
                style={{
                  color: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                {/* Icon Container Pill */}
                <div
                  className={`px-4 py-1.5 rounded-full transition-all flex items-center justify-center relative ${
                    isActive ? 'scale-105 shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'inherit',
                  }}
                >
                  <Icon className="w-4 h-4" />

                  {/* Mobile Badge if present */}
                  {badgeValue !== undefined && badgeValue !== '' && (
                    <span
                      className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] text-[8.5px] font-mono font-bold rounded-full flex items-center justify-center border"
                      style={{
                        backgroundColor: 'var(--md-sys-color-primary)',
                        color: 'var(--md-sys-color-on-primary)',
                        borderColor: 'var(--md-sys-color-surface)',
                      }}
                    >
                      {badgeValue}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className="text-[10px] font-medium leading-tight tracking-tight whitespace-nowrap text-center mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Settings button on mobile navigation bar */}
          <button
            type="button"
            onClick={handleSettingsClick}
            className="shrink-0 flex flex-col items-center justify-center min-w-[62px] px-2 py-1 relative rounded-2xl transition-all active:scale-95 select-none focus:outline-none opacity-85 hover:opacity-100 text-on-surface-variant"
          >
            <div className="px-4 py-1.5 rounded-full transition-all flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-tight tracking-tight whitespace-nowrap text-center mt-0.5">
              Settings
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
