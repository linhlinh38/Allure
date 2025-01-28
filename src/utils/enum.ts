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
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
  DENIED = "DENIED",
}

export enum ShippingStatusEnum {
  JOIN_GROUP_BUYING = 'JOIN_GROUP_BUYING',
  TO_PAY = 'TO_PAY',
  WAIT_FOR_CONFIRMATION = 'WAIT_FOR_CONFIRMATION',
  PREPARING_ORDER = 'PREPARING_ORDER',
  TO_SHIP = 'TO_SHIP',
  TO_RECEIVED = 'TO_RECEIVED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  RETURNING = 'RETURNING',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
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
  USED = 'USED',
  NOT_USED = 'NOT_USED',
}

export enum VoucherUnavailableReasonEnum {
  MINIMUM_ORDER_NOT_MET = 'MINIMUM_ORDER_NOT_MET',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  NOT_START_YET = 'NOT_START_YET',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum CancelOrderRequestStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TransactionEnum {
  ORDER = 'ORDER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethodEnum {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}