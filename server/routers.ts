import { z } from "zod";

import {
  assignRequestToProvider,
  createComplaint,
  createRefund,
  createServiceRequest,
  cancelServiceRequest,
  createCustomerReview,
  createReviewReport,
  listAdminCategories,
  listAdminComplaints,
  listAdminProviders,
  listAdminRefunds,
  listAdminServices,
  listAdminZones,
  listAssignableProviders,
  listCustomerComplaints,
  processRefund,
  resolveComplaint,
  reviewProvider,
  saveCategory,
  saveService,
  saveZone,
  getCustomerTracking,
  getAdminAnalytics,
  acceptQuote,
  createProviderQuote,
  declarePayment,
  getCustomerPayment,
  listAdminPayments,
  listAdminRequests,
  listRequestQuotes,
  listConversationMessages,
  getProviderReviewSummary,
  getProviderWorkspace,
  listAdminReviewReports,
  listAdminReviews,
  listCatalog,
  listNotifications,
  listCustomerRequests,
  listZones,
  markConversationMessagesRead,
  markAllNotificationsRead,
  markNotificationRead,
  moderateReview,
  respondToMission,
  sendConversationMessage,
  resolveReviewReport,
  saveProviderProfile,
  rejectQuote,
  transitionPaymentStatus,
  updateProviderMissionStatus,
  updateProviderLocation,
} from "./db";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure
      .input(z.object({ search: z.string().trim().max(120).optional(), categorySlug: z.string().trim().max(64).optional() }).optional())
      .query(({ input }) => listCatalog(input?.search, input?.categorySlug)),
    zones: publicProcedure.query(() => listZones()),
  }),
  requests: router({
    mine: protectedProcedure.query(({ ctx }) => listCustomerRequests(ctx.user.id)),
    tracking: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) => getCustomerTracking(ctx.user.id, input.requestId)),
    create: protectedProcedure
      .input(z.object({
        serviceId: z.number().int().positive().optional(),
        description: z.string().trim().min(12).max(4000),
        commune: z.string().trim().min(2).max(96),
        quartier: z.string().trim().min(2).max(120),
        landmark: z.string().trim().max(180).optional(),
        address: z.string().trim().max(1000).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        desiredSlot: z.string().datetime().optional(),
        idempotencyKey: z.string().trim().min(12).max(96),
      }).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), { message: "Latitude et longitude doivent être fournies ensemble" }))
      .mutation(({ ctx, input }) => createServiceRequest({ ...input, customerId: ctx.user.id, desiredSlot: input.desiredSlot ? new Date(input.desiredSlot) : undefined })),
    cancel: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => cancelServiceRequest({ ...input, userId: ctx.user.id, actor: "customer" })),
  }),
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1200).optional(),
      }))
      .mutation(({ ctx, input }) => createCustomerReview({ ...input, userId: ctx.user.id })),
    report: protectedProcedure
      .input(z.object({ reviewId: z.number().int().positive(), reason: z.string().trim().min(3).max(160), details: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => createReviewReport({ ...input, userId: ctx.user.id })),
  }),
  quotes: router({
    mine: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) => listRequestQuotes({ ...input, userId: ctx.user.id })),
    accept: protectedProcedure
      .input(z.object({ quoteId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => acceptQuote({ ...input, userId: ctx.user.id })),
    reject: protectedProcedure
      .input(z.object({ quoteId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => rejectQuote({ ...input, userId: ctx.user.id })),
  }),
  payments: router({
    mine: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) => getCustomerPayment({ ...input, userId: ctx.user.id })),
    declare: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), method: z.enum(["cash", "mobile_money", "external"]), idempotencyKey: z.string().trim().min(12).max(96) }))
      .mutation(({ ctx, input }) => declarePayment({ ...input, userId: ctx.user.id })),
  }),
  notifications: router({
    mine: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markNotificationRead({ ...input, userId: ctx.user.id })),
    markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
  }),
  messages: router({
    list: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) => listConversationMessages(ctx.user.id, input.requestId)),
    send: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), idempotencyKey: z.string().trim().min(12).max(96) }))
      .mutation(({ ctx, input }) => sendConversationMessage({ ...input, userId: ctx.user.id })),
    markRead: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markConversationMessagesRead({ ...input, userId: ctx.user.id })),
  }),
  complaints: router({
    mine: protectedProcedure.query(({ ctx }) => listCustomerComplaints(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), subject: z.string().trim().min(3).max(180), description: z.string().trim().min(12).max(4000) }))
      .mutation(({ ctx, input }) => createComplaint({ ...input, userId: ctx.user.id })),
  }),
  provider: router({
    me: protectedProcedure.query(({ ctx }) => getProviderWorkspace(ctx.user.id)),
    reviews: protectedProcedure.query(({ ctx }) => getProviderReviewSummary(ctx.user.id)),
    saveProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().trim().min(2).max(160),
        bio: z.string().trim().max(2000).optional(),
        skills: z.string().trim().max(1000).optional(),
        availabilityNotes: z.string().trim().max(1000).optional(),
        serviceIds: z.array(z.number().int().positive()).min(1).max(20),
        zoneIds: z.array(z.number().int().positive()).min(1).max(30),
      }))
      .mutation(({ ctx, input }) => saveProviderProfile({ ...input, userId: ctx.user.id })),
    respond: protectedProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        decision: z.enum(["accepted", "refused"]),
        reason: z.string().trim().max(500).optional(),
        idempotencyKey: z.string().trim().min(12).max(96),
      }))
      .mutation(({ ctx, input }) => respondToMission({ ...input, userId: ctx.user.id })),
    sendQuote: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), amountXof: z.number().int().positive(), travelFeeXof: z.number().int().min(0), note: z.string().trim().max(1200).optional(), idempotencyKey: z.string().trim().min(12).max(96) }))
      .mutation(({ ctx, input }) => createProviderQuote({ ...input, userId: ctx.user.id })),
    updateMissionStatus: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), status: z.enum(["ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"]) }))
      .mutation(({ ctx, input }) => updateProviderMissionStatus({ ...input, userId: ctx.user.id })),
    cancelMission: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => cancelServiceRequest({ ...input, userId: ctx.user.id, actor: "provider" })),
    location: router({
      update: protectedProcedure
        .input(z.object({ requestId: z.number().int().positive(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().min(0).max(10000).optional(), sharingStatus: z.enum(["shared", "paused"]) }))
        .mutation(({ ctx, input }) => updateProviderLocation({ ...input, userId: ctx.user.id })),
    }),
  }),
  admin: router({
    analytics: adminProcedure
      .input(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }).optional())
      .query(({ input }) => getAdminAnalytics(input?.days ?? 30)),
    reviews: adminProcedure.query(() => listAdminReviews()),
    reports: adminProcedure.query(() => listAdminReviewReports()),
    payments: adminProcedure.query(() => listAdminPayments()),
    requests: adminProcedure.query(() => listAdminRequests()),
    providers: adminProcedure.query(() => listAdminProviders()),
    assignableProviders: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ input }) => listAssignableProviders(input.requestId)),
    reviewProvider: adminProcedure
      .input(z.object({ providerId: z.number().int().positive(), status: z.enum(["pending", "verified", "suspended"]), note: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => reviewProvider({ ...input, adminUserId: ctx.user.id })),
    assignRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive(), providerId: z.number().int().positive(), note: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => assignRequestToProvider({ ...input, adminUserId: ctx.user.id })),
    categories: adminProcedure.query(() => listAdminCategories()),
    saveCategory: adminProcedure
      .input(z.object({ id: z.number().int().positive().optional(), slug: z.string().trim().max(64).optional(), name: z.string().trim().min(2).max(120), description: z.string().trim().max(2000).optional(), active: z.boolean().optional(), sortOrder: z.number().int().min(0).max(9999).optional() }))
      .mutation(({ ctx, input }) => saveCategory({ ...input, adminUserId: ctx.user.id })),
    services: adminProcedure.query(() => listAdminServices()),
    saveService: adminProcedure
      .input(z.object({
        id: z.number().int().positive().optional(),
        categoryId: z.number().int().positive(),
        slug: z.string().trim().max(96).optional(),
        name: z.string().trim().min(2).max(160),
        description: z.string().trim().min(10).max(4000),
        pricingMode: z.enum(["fixed", "quote"]),
        fixedPriceXof: z.number().int().positive().optional(),
        diagnosticRequired: z.boolean(),
        durationMinutes: z.number().int().positive().max(720).optional(),
        travelTerms: z.string().trim().max(2000).optional(),
        excludedSupplies: z.string().trim().max(2000).optional(),
        safetyNotes: z.string().trim().max(2000).optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
      }))
      .mutation(({ ctx, input }) => saveService({ ...input, adminUserId: ctx.user.id })),
    zones: adminProcedure.query(() => listAdminZones()),
    saveZone: adminProcedure
      .input(z.object({ id: z.number().int().positive().optional(), commune: z.string().trim().min(2).max(96), quartier: z.string().trim().min(2).max(120), active: z.boolean().optional() }))
      .mutation(({ ctx, input }) => saveZone({ ...input, adminUserId: ctx.user.id })),
    complaints: adminProcedure.query(() => listAdminComplaints()),
    resolveComplaint: adminProcedure
      .input(z.object({ complaintId: z.number().int().positive(), status: z.enum(["in_progress", "resolved", "dismissed"]), resolutionNote: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => resolveComplaint({ ...input, adminUserId: ctx.user.id })),
    refunds: adminProcedure.query(() => listAdminRefunds()),
    createRefund: adminProcedure
      .input(z.object({ paymentId: z.number().int().positive(), reason: z.string().trim().min(5).max(1200) }))
      .mutation(({ ctx, input }) => createRefund({ ...input, adminUserId: ctx.user.id })),
    processRefund: adminProcedure
      .input(z.object({ refundId: z.number().int().positive(), status: z.enum(["completed", "rejected"]), note: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => processRefund({ ...input, adminUserId: ctx.user.id })),
    transitionPayment: adminProcedure
      .input(z.object({ paymentId: z.number().int().positive(), status: z.enum(["confirmed", "failed"]), note: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => transitionPaymentStatus({ ...input, adminUserId: ctx.user.id })),
    cancelRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().max(500).optional() }))
      .mutation(({ ctx, input }) => cancelServiceRequest({ ...input, userId: ctx.user.id, actor: "admin" })),
    moderateReview: adminProcedure
      .input(z.object({ reviewId: z.number().int().positive(), status: z.enum(["published", "flagged", "hidden"]), note: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => moderateReview({ ...input, adminUserId: ctx.user.id })),
    resolveReport: adminProcedure
      .input(z.object({ reportId: z.number().int().positive(), status: z.enum(["resolved", "dismissed"]), resolutionNote: z.string().trim().max(1200).optional() }))
      .mutation(({ ctx, input }) => resolveReviewReport({ ...input, adminUserId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;
