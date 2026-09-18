# Lebse shared design system

Implemented reusable React components for the marketplace. The visual language follows the approved Ethiopian Contemporary identity: warm cream, dark brown, terracotta, modern sans-serif type, modest corner radii, generous editorial spacing, and photography first.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Cream | `#F8F5EE` | Main canvas |
| Paper | `#FCFAF5` | Fields and surfaces |
| Dark brown | `#382C26` | Main text, selected chips |
| Terracotta | `#A64E35` | Main actions, saved hearts, active navigation |
| Muted brown | `#74695F` | Secondary labels and descriptions |
| Warm border | `#DBD2C7` | Fields, cards, dividers |
| Surface | `#EEE7DC` | Soft fills and counts |
| Corner radius | 5px | Buttons, fields, cards |
| Type | DM Sans with system sans-serif fallback | Consistent marketplace typography |

Main form text is 16px. Secondary copy generally uses 14px; small badges and navigation labels retain distinct compact roles. Interactive controls have a minimum 44px target. The spacing rhythm uses 8px steps with small optical adjustments. Product images use a 4:5 ratio. All shared styles use the `ui-` prefix to avoid collisions.

## Components and behavior

| Component | Contract | States and interactions |
| --- | --- | --- |
| Button | `variant`, `loading`, `disabled`, `type`, `icon`, children, native button props | Primary, secondary, text, and danger variants. Defaults to `type="button"`. Loading blocks duplicate activation and exposes busy state. |
| IconButton | `label`, `icon` or children, native button props | Accessible name, visible focus, hover, disabled, pressed when supplied. |
| Tabs | `items: [{value,label,count,panelId?}]`, `value`, `onChange`, `label` | Selected tab, optional counts, scrolling on narrow screens. Arrow keys, Home, and End move selection and focus. |
| Chip | `active`, `onClick`, children | Selected/unselected states communicated by both color and `aria-pressed`. |
| Field | `label`, `error`, `hint`, `required`, one native form control child | Links label, hint, and validation error to its control; supports input, select, and textarea styling, focus, disabled, and invalid states. |
| SearchField | `value`, `onChange`, `onSubmit?`, `placeholder`, `label` | Controlled search, clear action, optional submit action and Enter submission. `onChange` receives the string value. |
| Badge | `status`, optional children | Human-readable listing, offer, payment, order, and delivery state. Color accompanies text. No unearned seller verification claims. |
| ProductCard | `product`, `saved`, `onSave`, `onOpen`, `onSeller` | Image/title open the listing; heart toggles saved state; seller row opens closet. Reserved/sold states remain viewable and visibly labeled. Images load lazily. Missing or broken photos show a neutral fallback. |
| SellerCard | `seller`, `onOpen`, `onFollow?`, `following` | Opens the closet; optional follow action. Uses genuine provided name, location, and listing count. No fabricated ratings or verification. |
| BottomNav | `items: [{id,label,icon}]`, `active`, `onChange`, `unread` | Mobile navigation, current-page semantics, unread counts, prominent Sell action. `unread` can be a number for Inbox or an object keyed by destination. |
| Modal | `title`, `onClose`, children, `actions?`, `description?` | Native dialog, background inertness, focus containment, Escape close, outside click close, body scroll lock, and focus restoration. |
| Sheet | Same as Modal | Bottom sheet on mobile; centered dialog on larger screens. Content scrolls within the viewport. |
| Toast | `message`, `onClose?` | Polite live status message and optional dismissal. Screen owns timing. Positioned above mobile navigation. |
| LoadingState | `label`, `count` | Busy announcement plus responsive product skeletons. Reduced-motion support. |
| EmptyState | `title`, `description`, `action`, `onAction`, `icon`, children | Purpose-specific empty message and optional recovery action. |
| ErrorState | `message`, `onRetry` | Alert announcement with retry action. |
| PageHeader | `title`, `description`, `onBack?`, `eyebrow?`, children | Consistent page title, optional back action, and optional page-level controls. |

## Product and seller data mapping

Product cards accept `id` or `listing_id`; price in `priceETB`, `price_etb`, or `price`; photo in `image` or the first media entry; and seller identity in `seller_name`/`seller_id` or a nested seller object. `onOpen` and `onSave` receive the product; `onSeller` receives the seller ID. Seller-card callbacks receive the seller object.

Dates, inventory, payment amounts, permissions, and business decisions belong in the application and service layers. Components display supplied state and emit actions; they do not invent fulfillment or payment success. Modal callers control whether their modal is mounted. Toast callers determine how long a status message remains visible.

## Responsive and accessibility requirements

- Product skeletons follow four, three, then two columns as width decreases.
- Sheets fit the dynamic viewport and respect mobile safe-area insets.
- All action controls have visible keyboard focus and accessible names.
- Field errors remain visible and associated with their specific controls.
- Save and follow actions expose pressed state; navigation exposes current page.
- Dialogs contain focus, make background content inert, and restore the previous focus on exit.
- Status remains readable as text without relying on color alone.
- Movement and shimmer stop when reduced motion is requested.

Screen-level acceptance testing should verify real routes and connected actions in addition to these shared component states.
