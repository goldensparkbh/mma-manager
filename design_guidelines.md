# Design Guidelines: Sports Club Management & Store System

## Design Approach

**Framework**: Material Design System adapted for RTL (Arabic) interface
**Justification**: Utility-focused application requiring clear hierarchy, efficient navigation, and support for both management tools and e-commerce functionality.

## Core Design Elements

### Typography
- **Primary Font**: Cairo (Google Fonts) - excellent Arabic support
- **Hierarchy**:
  - H1: 24px, weight 700 (page titles)
  - H2: 18px, weight 600 (section headers)
  - H3: 16px, weight 600 (card titles)
  - Body: 14px, weight 400
  - Small/Labels: 12px, weight 500
  - Captions: 11px, weight 400

### Layout System
**Spacing Units**: Tailwind primitives - 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-6
- Section margins: mb-6, mb-8
- Card gaps: gap-4
- Grid gaps: gap-6

### Component Library

**Navigation**
- Dark sidebar (bg-slate-900): 260px width, fixed position
- Responsive: Bottom tab bar on mobile (≤768px)
- Active state: Blue background (bg-blue-500/20) with border accent
- Navigation icons from Heroicons

**Dashboard Cards**
- White backgrounds with subtle shadows (shadow-sm)
- Rounded corners: rounded-xl (12px)
- Consistent padding: p-6
- Stats grid: 4 columns desktop, 2 columns mobile

**Store Section Design**
- Product grid: 3 columns desktop, 2 tablet, 1 mobile
- Product cards: Image (16:9 aspect), title, price, "Add to Cart" button
- Shopping cart: Slide-over panel from right side
- Product categories: Horizontal scrolling tabs
- Featured products: Larger hero cards at top

**Tables**
- Zebra striping for rows
- Compact spacing (py-3)
- Sticky headers on scroll
- Action buttons: Icon-only on mobile, text+icon on desktop

**Forms**
- Input fields: rounded-lg, border-gray-300
- Focus state: ring-2 ring-blue-500
- Labels: text-sm font-medium mb-2
- Button: rounded-full, px-6 py-2.5

**Data Displays**
- Stat cards: Icon + label + value + trend indicator
- Status badges: rounded-full with color coding (green=active, yellow=pending, red=expired)
- Progress bars: rounded-full, 8px height

## RTL Implementation
- All layouts use `dir="rtl"` on root
- Flex/grid directions automatically reverse
- Text alignment: text-right by default
- Shadows and borders: mirror on RTL axis
- Icons: Use non-directional icons where possible

## Store-Specific Components

**Product Card**
- Image container: aspect-video, object-cover
- Price: text-xl font-bold
- Quick actions: Favorite icon (top-right absolute)
- Hover state: subtle scale (scale-105) and shadow increase

**Cart Summary**
- Fixed position slide-over panel
- Line items: thumbnail + name + quantity controls + price
- Subtotal/total section: sticky at bottom
- Checkout button: full-width, prominent

**Product Detail Modal**
- Large image gallery (swipeable on mobile)
- Size/variant selector: Pill-style buttons
- Quantity stepper: - / input / + buttons
- Add to cart: Primary CTA button

## Images
- **Product Images**: Required for all store items (placeholder: 400x225px sport equipment/merchandise photos)
- **Hero Section**: NOT required for this admin/utility application
- **Icons**: Heroicons library via CDN for all UI icons
- **User Avatars**: Circle avatars with initials fallback

## Animations
**Minimal approach** - use only where functional:
- Page transitions: Fade in (200ms)
- Modal/drawer: Slide in from edge (250ms)
- Button clicks: Scale down slightly (100ms)
- NO scroll-triggered animations
- NO decorative animations

## Responsive Breakpoints
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (3-4 columns, sidebar visible)

## Accessibility
- All interactive elements: min 44px touch target
- Keyboard navigation: visible focus rings
- Form inputs: Associated labels with htmlFor
- Color contrast: WCAG AA minimum (4.5:1)
- Screen reader: aria-labels for icon-only buttons