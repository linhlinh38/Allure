import { Entity, Column, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { BannerConfig } from "./bannerConfig.entity";
import { oneDay, oneMinute, oneMonth, oneWeek } from "../utils/time";

@Entity("master_configs")
export class MasterConfig extends BaseEntity {
  @Column({ type: "varchar", default: "Allure" })
  name: string;

  @Column({ type: "varchar", default: "Allure logo" })
  logo: string;

  @Column({ name: "max_level_category", type: "int", default: 4 })
  maxLevelCategory: number;

  @OneToMany(() => BannerConfig, (banner) => banner.masterConfig, {
    nullable: true,
  })
  banners?: BannerConfig[];

  @Column({
    name: "group_buying_remaining_time",
    type: "int",
    default: 5 * oneMinute,
  })
  groupBuyingRemainingTime: number;

  @Column({
    name: "auto_cancel_order_time",
    type: "bigint",
    default: oneDay,
  })
  autoCancelOrderTime: number;

  @Column({
    name: "auto_complete_order_time",
    type: "bigint",
    default: oneWeek,
  })
  autoCompleteOrderTime: number;

  @Column({
    name: "auto_approve_refund_request_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  autoApproveRefundRequestTime: number;

  @Column({
    name: "feedback_time_expired",
    type: "bigint",
    default: oneMonth,
  })
  feedbackTimeExpired: number;

  @Column({
    name: "refund_time_expired",
    type: "bigint",
    default: 15 * oneDay,
  })
  refundTimeExpired: number;

  @Column({
    name: "maximum_update_brand_profile_time",
    type: "int",
    default: 3,
  })
  maximumUpdateBrandProfileTime: number;

  @Column({
    name: "complaint_time_expired",
    type: "int",
    default: 2 * oneDay,
  })
  complaintTimeExpired: number;

  @Column({
    name: "auto_update_order_to_refunded_status_time",
    type: "bigint",
    default: 1 * oneDay,
  })
  autoUpdateOrderToRefundedStatusTime: number;

  @Column({
    name: "expired_received_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  expiredReceivedTime: number;

  @Column({
    name: "max_feedback_images",
    type: "int",
    default: 4,
  })
  maxFeedbackImages: number;

  @Column({
    name: "max_feedback_videos",
    type: "int",
    default: 1,
  })
  maxFeedbackVideos: number;

  @Column({
    name: "max_feedback_size",
    type: "bigint",
    default: 10 * 1024 * 1024,
  })
  maxFeedbackSize: number;

  @Column({
    name: "max_product_images",
    type: "int",
    default: 7,
  })
  maxProductImages: number;

  @Column({
    name: "max_product_classification_images",
    type: "int",
    default: 4,
  })
  maxProductClassificationImages: number;

  @Column({
    name: "amount_product_warning",
    type: "int",
    default: 15,
  })
  amountProductWarning: number;

  @Column({
    name: "max_evidence_images",
    type: "int",
    default: 4,
  })
  maxEvidenceImages: number;

  @Column({
    name: "max_evidence_videos",
    type: "int",
    default: 2,
  })
  maxEvidenceVideos: number;

  @Column({
    name: "max_evidence_size",
    type: "bigint",
    default: 15 * 1024 * 1024,
  })
  maxEvidenceSize: number;

  @Column({
    name: "sample_consultation_criteria_sections_url",
    type: "varchar",
    nullable: true,
  })
  sampleConsultationCriteriaSectionsUrl: string;

  @Column({
    name: "sample_consultation_criteria_sections_name",
    type: "varchar",
    nullable: true,
  })
  sampleConsultationCriteriaSectionsName: string;

  @Column({
    name: "request_return_order_max_images",
    type: "int",
    default: 4,
  })
  requestReturnOrderMaxImages: number;

  @Column({
    name: "request_return_order_max_videos",
    type: "int",
    default: 1,
  })
  requestReturnOrderMaxVideos: number;

  @Column({
    name: "request_return_order_max_size",
    type: "bigint",
    default: 10 * 1024 * 1024,
  })
  requestReturnOrderMaxSize: number;

  @Column({
    name: "pending_admin_check_reject_refund_request_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  pendingAdminCheckRejectRefundRequestTime: number;

  @Column({
    name: "pending_admin_check_complaint_request_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  pendingAdminCheckComplaintRequestTime: number;

  @Column({
    name: "expired_customer_received_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  expiredCustomerReceivedTime: number;

  @Column({
    name: "pending_customer_shipping_return_time",
    type: "bigint",
    default: 2 * oneDay,
  })
  pendingCustomerShippingReturnTime: number;

  @Column({
    name: "commission_fee",
    default: 0.1,
    type: "numeric",
  })
  commissionFee: number;

  @Column({
    name: "expired_booking_to_pay",
    type: "bigint",
    default: oneDay,
  })
  expiredBookingToPay: number;

  @Column({
    name: "expired_booking_wait_for_confirm",
    type: "bigint",
    default: 2 * oneDay,
  })
  expiredBookingWaitForConfirm: number;

  @Column({
    name: "expired_booking_confirmed",
    type: "bigint",
    default: 2 * oneDay,
  })
  expiredBookingConfirmed: number;

  @Column({
    name: "expired_booking_form_submited",
    type: "bigint",
    default: 4 * oneDay,
  })
  expiredBookinFormSubmited: number;

  @Column({
    name: "expired_booking_completed_call",
    type: "bigint",
    default: 2 * oneDay,
  })
  expiredBookinCompletedCall: number;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
