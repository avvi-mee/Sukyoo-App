import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gift,
  Home,
  LogOut,
  Mic,
  Package,
  Pause,
  Phone,
  Pill,
  Play,
  Settings,
  Shield,
  ShoppingCart,
  Stethoscope,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../theme/tokens';

// Mirrors apps/senior/src/components/Icon.tsx — same semantic-name approach,
// smaller set because this app has fewer surfaces. Duplicated per app for the
// same reason notify.ts is: each app owns its own theme tokens.
const ICONS = {
  home: Home,
  health: Stethoscope,
  vitals: Activity,
  medication: Pill,
  record: FileText,
  claim: ClipboardList,
  emergency: AlertTriangle,
  story: Mic,
  play: Play,
  pause: Pause,
  orders: ShoppingCart,
  product: Package,
  gift: Gift,
  family: Users,
  link: UserPlus,
  phone: Phone,
  video: Video,
  settings: Settings,
  shield: Shield,
  signOut: LogOut,
  calendar: Calendar,
  verified: CheckCircle2,
  back: ChevronLeft,
  forward: ChevronRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
