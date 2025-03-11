export enum RoleEnum {
  CUSTOMER = "CUSTOMER",
  MANAGER = "MANAGER",
  CONSULTANT = "CONSULTANT",
  STAFF = "STAFF",
  KOL = "KOL",
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
}

export enum GenderEnum {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum StatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
}

export enum AccountStatusEnum {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
  DENIED = "DENIED",
}

export enum BrandStatusEnum {
  PENDING_REVIEW = "PENDING_REVIEW", // chờ xét duyệt hồ sơ
  NEED_ADDITIONAL_DOCUMENTS = "NEED_ADDITIONAL_DOCUMENTS", // cần bổ sung hồ sơ
  PRE_APPROVED_FOR_MEETING = "PRE_APPROVED_FOR_MEETING", // Được chấp thuận hồ sơ trước khi xác nhận lại trong buổi meeting
  DONE_MEETING = "DONE_MEETING",
  DENIED = "DENIED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
}

export enum ShippingStatusEnum {
  JOIN_GROUP_BUYING = "JOIN_GROUP_BUYING",
  TO_PAY = "TO_PAY",
  WAIT_FOR_CONFIRMATION = "WAIT_FOR_CONFIRMATION",
  PREPARING_ORDER = "PREPARING_ORDER",
  TO_SHIP = "TO_SHIP",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  RETURNING = "RETURNING",
  BRAND_RECEIVED = "BRAND_RECEIVED",
  REFUNDED = "REFUNDED",
  RETURNED_FAIL = "RETURNED_FAIL",
  CANCELLED = "CANCELLED",
}

export enum AddressEnum {
  HOME = "HOME",
  OFFICE = "OFFICE",
  OTHER = "OTHER",
}

export enum ProductEnum {
  FLASH_SALE = "FLASH_SALE",
  OFFICIAL = "OFFICIAL",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
}

export enum PreOrderProductEnum {
  ACTIVE = "ACTIVE",
  SOLD_OUT = "SOLD_OUT",
  WAITING = "WAITING",
  INACTIVE = "INACTIVE",
  CANCELLED = "CANCELLED",
}

export enum ProductDiscountEnum {
  ACTIVE = "ACTIVE",
  SOLD_OUT = "SOLD_OUT",
  WAITING = "WAITING",
  INACTIVE = "INACTIVE",
  CANCELLED = "CANCELLED",
}

export enum LiveStreamEnum {
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  ENDED = "ENDED",
  CANCELLED = "CANCELLED",
}

export enum FileEnum {
  CERTIFICATE = "CERTIFICATE",
  AVATAR = "AVATAR",
  PRODUCT_IMAGE = "PRODUCT_IMAGE",
  POPUP_IMAGE = "POPUP_IMAGE",
  BRAND_IMAGE = "BRAND_IMAGE",
  BRAND_LOGO = "BRAND_LOGO",
  BRAND_DOCUMENT = "BRAND_DOCUMENT",
  SERVICE_IMAGE = "SERVICE_IMAGE",
}

export enum DiscountTypeEnum {
  PERCENTAGE = "PERCENTAGE",
  AMOUNT = "AMOUNT",
}

export enum OrderEnum {
  PRE_ORDER = "PRE_ORDER",
  NORMAL = "NORMAL",
  GROUP_BUYING = "GROUP_BUYING",
  FLASH_SALE = "FLASH_SALE",
  LIVE_STREAM = "LIVE_STREAM",
}

export enum ServiceTypeEnum {
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
}

export enum BookingTypeEnum {
  SERVICE = "SERVICE",
  INTERVIEW = "INTERVIEW",
}

export enum BookingStatusEnum {
  TO_PAY = "TO_PAY",
  WAIT_FOR_CONFIRMATION = "WAIT_FOR_CONFIRMATION",
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  SERVICE_BOOKING_FORM_SUBMITED = "SERVICE_BOOKING_FORM_SUBMITED",
  SENDED_RESULT_SHEET = "SENDED_RESULT_SHEET",
  COMPLETED = "COMPLETED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum QuestionTypeEnum {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TEXT = "TEXT",
}

export enum ClassificationTypeEnum {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
}

export enum VoucherApplyTypeEnum {
  ALL = "ALL",
  SPECIFIC = "SPECIFIC",
}

export enum VoucherVisibilityEnum {
  WALLET = "WALLET",
  PUBLIC = "PUBLIC",
  GROUP = "GROUP",
}

export enum VoucherWalletStatus {
  USED = "USED",
  NOT_USED = "NOT_USED",
}

export enum VoucherUnavailableReasonEnum {
  MINIMUM_ORDER_NOT_MET = "MINIMUM_ORDER_NOT_MET",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  NOT_START_YET = "NOT_START_YET",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export enum RequestStatusEnum {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum TransactionEnum {
  ORDER = "ORDER",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PaymentMethodEnum {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  WALLET = "WALLET",
}

export enum WeekDay {
  MONDAY = 2,
  TUESDAY = 3,
  WEDNESDAY = 4,
  THURSDAY = 5,
  FRIDAY = 6,
  SATURDAY = 7,
  SUNDAY = 8,
}

export enum TransactionTypeEnum {
  PURCHASE = "PURCHASE",
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
}

export enum TransactionStatusEnum {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum FeedbackFilterEnum {
  ALL = "ALL",
  RATING = "RATING",
  IMAGE_VIDEO = "IMAGE_VIDEO",
  CLASSIFICATION = "CLASSIFICATION",
}

export enum ProductTagEnum {
  BEST_SELLER = "BEST_SELLER",
  HOT = "HOT",
  NEW = "NEW",
}

export enum StatisticsTimeEnum {
  ALL_TIME = "ALL_TIME",
  SPECIFIC_TIME = "SPECIFIC_TIME",
}

export enum ReportTypeEnum {
  ORDER = "ORDER",
  TRANSACTION = "TRANSACTION",
  BOOKING = "BOOKING",
  SYSTEM_FEATURE = "SYSTEM_FEATURE",
  OTHER = "OTHER",
}

export enum ReportStatusEnum {
  PENDING = "PENDING",
  IN_PROCESSING = "IN_PROCESSING",
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}
