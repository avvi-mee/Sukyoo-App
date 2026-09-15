import {
  Activity,
  AlertTriangle,
  Apple,
  BookOpen,
  Brain,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChessKnight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Dices,
  Dumbbell,
  FileText,
  Film,
  Gamepad2,
  Gift,
  Headphones,
  Heart,
  Home,
  Map,
  MessageSquare,
  Mic,
  Music,
  Package,
  Palette,
  PersonStanding,
  Phone,
  Pill,
  PlayCircle,
  Plus,
  Radio,
  RotateCw,
  Search,
  Settings,
  Share2,
  Shield,
  Flag,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Spade,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  Truck,
  UserRound,
  Users,
  Video,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../theme/tokens';

// Semantic name → glyph. Screens name what a thing IS, never which glyph to
// draw, so the icon set can be swapped in one place. Lucide's 2px rounded
// stroke is what the mockups are drawn in.
const ICONS = {
  // Health
  stethoscope: Stethoscope,
  vitals: Activity,
  medication: Pill,
  emergency: AlertTriangle,
  homeCare: Home,
  wellness: PersonStanding,
  insurance: ShieldCheck,
  syringe: Syringe,
  physio: Dumbbell,
  palliative: Heart,
  labTest: CalendarCheck,
  record: FileText,
  claim: ClipboardList,

  // Commerce
  cart: ShoppingCart,
  product: Package,
  groceries: ShoppingBasket,
  apparel: Shirt,
  nutrition: Apple,
  device: Smartphone,
  subscribe: RotateCw,
  services: Wrench,
  verified: CheckCircle2,
  returns: RotateCw,
  payment: CreditCard,
  gift: Gift,

  // Events
  events: Map,
  calendar: Calendar,
  travel: Map,
  clubs: Users,
  transport: Truck,
  accessible: PersonStanding,
  volunteer: Sparkles,

  // Entertainment
  entertainment: PlayCircle,
  play: PlayCircle,
  film: Film,
  music: Music,
  audiobook: Headphones,
  radio: Radio,
  games: Gamepad2,
  // The four games are named individually: a single controller glyph for all
  // of them would make the 2x2 grid unreadable at a glance.
  chess: ChessKnight,
  ludo: Dices,
  cards: Spade,
  memory: Brain,
  learning: BookOpen,
  art: Palette,
  community: MessageSquare,
  story: Mic,
  celebration: Gift,

  // Shell / actions
  home: Home,
  person: Users,
  // One named individual — a doctor's card, an emergency contact. `person` is
  // the plural glyph, which reads as a group next to a single name.
  profile: UserRound,
  family: Users,
  phone: Phone,
  video: Video,
  search: Search,
  settings: Settings,
  share: Share2,
  add: Plus,
  check: Check,
  close: X,
  remove: Trash2,
  back: ChevronLeft,
  forward: ChevronRight,
  clock: Clock,
  shield: Shield,
  // Used only by the "tell us about this" control on a livestream — a report is
  // a safeguarding path, so it gets its own glyph rather than a generic warning.
  flag: Flag,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

// The mockups draw each icon chip as a pale wash with the glyph in the same
// hue at full strength. Callers pass only the tint; this keeps the pairing
// consistent instead of every screen restating it.
const GLYPH_FOR_TINT: Record<string, string> = {
  [colors.coralTint]: colors.coral,
  [colors.greenTint]: colors.green,
  [colors.amberTint]: colors.amber,
  [colors.redTint]: colors.red,
};

export function glyphColorFor(tint: string | undefined) {
  return (tint && GLYPH_FOR_TINT[tint]) ?? colors.coral;
}

export function Icon({
  name,
  size = 24,
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
