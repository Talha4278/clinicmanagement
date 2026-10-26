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

export interface ParsedBranding {
  brandingMode: 'badge' | 'logo';
  logoUrl: string;
  badgeIcon: string;
  isCustomLogo: boolean;
}

export function parseClinicBranding(
  logoUrl?: string | null,
  badgeIcon?: string | null
): ParsedBranding {
  const rawLogo = (logoUrl || '').trim();
  const rawBadge = (badgeIcon || '').trim();

  // If logo specifies a database badge: identifier
  if (rawLogo.startsWith('badge:') || rawLogo.startsWith('icon:')) {
    const extractedBadge = rawLogo.replace(/^(badge|icon):/, '').trim();
    return {
      brandingMode: 'badge',
      logoUrl: '',
      badgeIcon: extractedBadge || rawBadge || 'stethoscope',
      isCustomLogo: false,
    };
  }

  // If logo is a real custom image (data URI, remote URL, or local path)
  if (
    rawLogo.startsWith('data:') ||
    rawLogo.startsWith('http://') ||
    rawLogo.startsWith('https://') ||
    rawLogo.startsWith('/') ||
    rawLogo.includes('.png') ||
    rawLogo.includes('.jpg') ||
    rawLogo.includes('.webp') ||
    rawLogo.includes('.svg')
  ) {
    return {
      brandingMode: 'logo',
      logoUrl: rawLogo,
      badgeIcon: rawBadge || 'stethoscope',
      isCustomLogo: true,
    };
  }

  // Otherwise badge mode
  return {
    brandingMode: 'badge',
    logoUrl: '',
    badgeIcon: rawBadge || 'stethoscope',
    isCustomLogo: false,
  };
}
