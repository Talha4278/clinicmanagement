import React from 'react';
import {
  Stethoscope,
  HeartPulse,
  Activity,
  Shield,
  Sparkles,
  Building2,
  LucideIcon,
} from 'lucide-react';

export interface PresetBadgeIcon {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const PRESET_BADGE_ICONS: PresetBadgeIcon[] = [
  { id: 'stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { id: 'heartpulse', label: 'Heart Pulse', icon: HeartPulse },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'shield', label: 'Shield Care', icon: Shield },
  { id: 'sparkles', label: 'Aesthetics', icon: Sparkles },
  { id: 'building', label: 'Clinic', icon: Building2 },
];

export function getClinicBadgeComponent(iconId?: string): LucideIcon {
  const found = PRESET_BADGE_ICONS.find((p) => p.id === iconId);
  return found ? found.icon : Stethoscope;
}

interface ClinicBadgeIconProps {
  iconId?: string;
  className?: string;
  size?: number;
}

export function ClinicBadgeIcon({
  iconId,
  className = 'w-5 h-5 text-white',
  size = 20,
}: ClinicBadgeIconProps) {
  const IconComp = getClinicBadgeComponent(iconId);
  return <IconComp className={className} size={size} />;
}
