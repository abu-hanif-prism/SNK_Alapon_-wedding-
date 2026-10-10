export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "HOST" | "ADMIN";
  phoneVerifiedAt: string | null;
};
export type Plan = {
  id: string;
  code: string;
  name: string;
  edition: number;
  maxEvents: number;
  storageLimitBytes: string;
  price: string;
  currency: string;
  durationMonths: number | null;
  billingPeriod: string;
  isActive: boolean;
};
export type Subscription = {
  id: string;
  status: string;
  edition: number;
  maxEvents: number;
  storageLimitBytes: string;
  usedBytes: string;
  endsAt: string | null;
  plan: Plan;
};
export type Template = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  versions: { id: string; edition: number; version: string }[];
};
export type Event = {
  id: string;
  title: string;
  coupleNames: string;
  brideName: string | null;
  groomName: string | null;
  slug: string;
  eventDate: string;
  location: string;
  venue: string | null;
  timezone: string;
  status: string;
  photoCount: number;
  edition: number;
  approvalRequired: boolean;
  allowViewerDownload: boolean;
  requireGuestName: boolean;
  allowGuestNotes: boolean;
  perGuestUploadLimit: number;
  eventUploadLimit: number | null;
  accessPin: string | null;
  templateVersionId: string;
  subscriptionId: string;
  content: Record<string, string> | null;
  subscription?: Subscription;
};
export type Photo = {
  id: string;
  originalFilename: string;
  thumbnailUrl: string | null;
  approvalStatus: string;
  processingStatus: string;
  guestName: string | null;
  caption: string | null;
  deletedAt: string | null;
};
export type PageData<T> = {
  items: T[];
  page: number;
  total: number;
  limit: number;
};
export type GalleryPhoto = {
  id: string;
  caption?: string | null;
  credit?: string | null;
  urls: { web: string; thumbnail: string };
};
export type GalleryData = {
  event: {
    slug: string;
    coupleNames: string;
    location: string;
    eventDate: string;
    canDownload: boolean;
    readOnly: boolean;
    content: Record<string, string> | null;
    cover: GalleryPhoto | null;
  };
  template: { code: string; name: string };
  sections: {
    id: string;
    title: string;
    subtitle?: string | null;
    blocks: { id: string; type: { code: string }; photos: GalleryPhoto[] }[];
  }[];
};
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export const bytes = (value: string | number) =>
  `${(Number(value) / 1073741824).toFixed(1)} GB`;
