import {
  and,
  count as analyticsCount,
  desc,
  eq,
  sum,
  type Analytics,
} from "@scrawn/analytics"
import { createServerFn } from "@tanstack/react-start"
import { createAnalytics } from "../scrawn"
import { validator } from "./core"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "../auth"
import { db } from "../db"
import { org, project } from "@/db/schema"
import { eq as drizzleEq, and as drizzleAnd } from "drizzle-orm"
import { getDashboardKey } from "./cache"

async function getProjectAnalytics(projectId: string): Promise<Analytics> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request?.headers })
  if (session) {
    const userOrg = await db.query.org.findFirst({
      where: drizzleEq(org.userId, session.user.id),
    })
    if (userOrg) {
      const userProject = await db.query.project.findFirst({
        where: drizzleAnd(
          drizzleEq(project.orgId, userOrg.orgId),
          drizzleEq(project.projectId, projectId)
        ),
      })
      if (userProject) {
        const apiKey = await getDashboardKey(userProject.projectId)
        if (apiKey) {
          return createAnalytics(apiKey)
        }
      }
    }
  }
  throw new Error("No API key available for analytics")
}

export const getUsageOverTime = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string; mode?: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const f = analytics.query.basicUsage.fields
    let q = analytics.query.basicUsage
      .aggregate(sum(f.debitAmount))
      .groupBy(f.ingestedTimestamp)
      .orderBy(desc(f.ingestedTimestamp))
      .limit(30)
    if (ctx.data.mode) {
      q = q.where(and(eq(f.mode, ctx.data.mode)))
    }
    const result = await q.execute()
    return result.rows
      .reverse()
      .filter((r) => r.groupValue != null)
      .map((r) => ({ groupValue: r.groupValue!, aggValue: r.aggValue }))
  })

export const getTopUsers = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const f = analytics.query.basicUsage.fields
    const result = await analytics.query.basicUsage
      .aggregate(sum(f.debitAmount))
      .groupBy(f.userId)
      .orderBy(desc(f.debitAmount))
      .limit(10)
      .execute()
    return result.rows.map((r) => ({
      groupValue: r.groupValue,
      aggValue: r.aggValue,
    }))
  }
)

export const getEventTypeDistribution = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
  const f = analytics.query.basicUsage.fields
  const result = await analytics.query.basicUsage
    .aggregate(analyticsCount())
    .groupBy(f.eventType)
    .execute()
  return result.rows.map((r) => ({
    groupValue: r.groupValue,
    aggValue: r.aggValue,
  }))
})

export const getAiTokenUsage = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string; mode?: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const f = analytics.query.aiToken.fields
    const mode = ctx.data.mode

    const mkQ = () => {
      let q = analytics.query.aiToken
        .aggregate(sum(f.inputTokens))
        .groupBy(f.model)
      if (mode) q = q.where(and(eq(f.mode, mode)))
      return q.execute()
    }
    const mkQ2 = () => {
      let q = analytics.query.aiToken
        .aggregate(sum(f.outputTokens))
        .groupBy(f.model)
      if (mode) q = q.where(and(eq(f.mode, mode)))
      return q.execute()
    }

    const [input, output] = await Promise.all([mkQ(), mkQ2()])
    return {
      input: input.rows.map((r) => ({
        groupValue: r.groupValue,
        aggValue: r.aggValue,
      })),
      output: output.rows.map((r) => ({
        groupValue: r.groupValue,
        aggValue: r.aggValue,
      })),
    }
  })

export const getAiTokenUsageOverTime = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
  const f = analytics.query.aiToken.fields
  const result = await analytics.query.aiToken
    .orderBy(desc(f.ingestedTimestamp))
    .limit(500)
    .execute()

  const groups = new Map<
    string,
    Map<string, { input: number; output: number }>
  >()
  for (const row of result.rows) {
    const date = (row.ingestedTimestamp ?? "").slice(0, 10)
    const model = row.model ?? "unknown"
    if (!groups.has(date)) groups.set(date, new Map())
    const modelMap = groups.get(date)!
    if (!modelMap.has(model)) modelMap.set(model, { input: 0, output: 0 })
    const acc = modelMap.get(model)!
    acc.input += row.inputTokens ?? 0
    acc.output += row.outputTokens ?? 0
  }

  const flat: Array<{
    date: string
    model: string
    inputTokens: number
    outputTokens: number
  }> = []
  for (const [date, modelMap] of groups) {
    for (const [model, counts] of modelMap) {
      flat.push({
        date,
        model,
        inputTokens: counts.input,
        outputTokens: counts.output,
      })
    }
  }

  return flat.sort((a, b) => a.date.localeCompare(b.date))
})

export const getPaymentHistory = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string; mode?: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const f = analytics.query.payment.fields
    const mode = ctx.data.mode
    let q = analytics.query.payment
      .aggregate(sum(f.creditAmount))
      .groupBy(f.ingestedTimestamp)
      .orderBy(desc(f.ingestedTimestamp))
      .limit(30)
    if (mode) q = q.where(and(eq(f.mode, mode)))
    const result = await q.execute()
    return result.rows
      .reverse()
      .filter((r) => r.groupValue != null)
      .map((r) => ({ groupValue: r.groupValue!, aggValue: r.aggValue }))
  })

export const getRecentEvents = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const f = analytics.query.basicUsage.fields
    const result = await analytics.query.basicUsage
      .orderBy(desc(f.ingestedTimestamp))
      .limit(10)
      .execute()
    return result.rows
  }
)

export const getFilteredEvents = createServerFn({ method: "GET" })
  .inputValidator(
    validator<{
      projectId: string
      apiKeyId?: string
      userId?: string
      eventType?: string
      mode?: string
      model?: string
      limit?: number
      offset?: number
    }>()
  )
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const bf = analytics.query.basicUsage.fields
    const af = analytics.query.aiToken.fields
    const limit = ctx.data.limit ?? 10
    const offset = ctx.data.offset ?? 0
    const fetchLimit = 500

    function mkBasicQuery() {
      const conds: import("@scrawn/analytics").FilterCondition[] = []
      if (ctx.data.apiKeyId) conds.push(eq(bf.apiKeyId, ctx.data.apiKeyId))
      if (ctx.data.userId) conds.push(eq(bf.userId, ctx.data.userId))
      if (ctx.data.mode) conds.push(eq(bf.mode, ctx.data.mode))
      let q = analytics.query.basicUsage
        .orderBy(desc(bf.ingestedTimestamp))
        .limit(fetchLimit)
      if (conds.length > 0) q = q.where(and(...conds))

      if (ctx.data.eventType && ctx.data.eventType !== "BASIC_USAGE") {
        return Promise.resolve({ rows: [], total: 0 } as unknown as Awaited<ReturnType<typeof q.execute>>)
      }
      return q.execute()
    }

    function mkAiQuery() {
      const conds: import("@scrawn/analytics").FilterCondition[] = []
      if (ctx.data.apiKeyId) conds.push(eq(af.apiKeyId, ctx.data.apiKeyId))
      if (ctx.data.userId) conds.push(eq(af.userId, ctx.data.userId))
      if (ctx.data.mode) conds.push(eq(af.mode, ctx.data.mode))
      if (ctx.data.model) conds.push(eq(af.model, ctx.data.model))
      let q = analytics.query.aiToken
        .orderBy(desc(af.ingestedTimestamp))
        .limit(fetchLimit)
      if (conds.length > 0) q = q.where(and(...conds))

      if (ctx.data.eventType && ctx.data.eventType !== "AI_TOKEN_USAGE") {
        return Promise.resolve({ rows: [], total: 0 } as unknown as Awaited<ReturnType<typeof q.execute>>)
      }
      return q.execute()
    }

    const [basicResult, aiResult] = await Promise.all([
      mkBasicQuery(),
      mkAiQuery(),
    ])

    const basicRows = basicResult.rows.map((r) => ({
      eventId: (r as { eventId?: string }).eventId ?? "",
      eventType: (r as { eventType?: string }).eventType ?? "",
      userId: (r as { userId?: string }).userId ?? "",
      reportedTimestamp:
        (r as { reportedTimestamp?: string }).reportedTimestamp ?? "",
      ingestedTimestamp:
        (r as { ingestedTimestamp?: string }).ingestedTimestamp ?? "",
      basicUsageType: (r as { basicUsageType?: string }).basicUsageType ?? "",
      debitAmount: Number((r as { debitAmount?: number }).debitAmount ?? 0),
    }))

    const aiRows = aiResult.rows.map((r) => ({
      eventId: (r as { eventId?: string }).eventId ?? "",
      eventType: (r as { eventType?: string }).eventType ?? "",
      userId: (r as { userId?: string }).userId ?? "",
      reportedTimestamp:
        (r as { reportedTimestamp?: string }).reportedTimestamp ?? "",
      ingestedTimestamp:
        (r as { ingestedTimestamp?: string }).ingestedTimestamp ?? "",
      basicUsageType: "",
      debitAmount: Number((r as { debitAmount?: number }).debitAmount ?? 0),
    }))

    const all = [...basicRows, ...aiRows].sort((a, b) =>
      b.ingestedTimestamp.localeCompare(a.ingestedTimestamp)
    )

    const total = (basicResult.total ?? 0) + (aiResult.total ?? 0)

    return {
      rows: all.slice(offset, offset + limit),
      total,
    }
  })

export const getApiKeySummary = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string; apiKeyId: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const sf = analytics.query.basicUsage.fields
    const af = analytics.query.aiToken.fields
    const pf = analytics.query.payment.fields
    const filter = and(eq(sf.apiKeyId, ctx.data.apiKeyId))

    const [
      basicDebit,
      basicCount,
      aiInput,
      aiOutput,
      aiCache,
      aiCount,
      creditSum,
    ] = await Promise.all([
      analytics.query.basicUsage
        .where(filter)
        .aggregate(sum(sf.debitAmount))
        .execute(),
      analytics.query.basicUsage
        .where(filter)
        .aggregate(analyticsCount())
        .execute(),
      analytics.query.aiToken
        .where(and(eq(af.apiKeyId, ctx.data.apiKeyId)))
        .aggregate(sum(af.inputDebitAmount))
        .execute(),
      analytics.query.aiToken
        .where(and(eq(af.apiKeyId, ctx.data.apiKeyId)))
        .aggregate(sum(af.outputDebitAmount))
        .execute(),
      analytics.query.aiToken
        .where(and(eq(af.apiKeyId, ctx.data.apiKeyId)))
        .aggregate(sum(af.inputCacheDebitAmount))
        .execute(),
      analytics.query.aiToken
        .where(and(eq(af.apiKeyId, ctx.data.apiKeyId)))
        .aggregate(analyticsCount())
        .execute(),
      analytics.query.payment
        .where(and(eq(pf.apiKeyId, ctx.data.apiKeyId)))
        .aggregate(sum(pf.creditAmount))
        .execute(),
    ])

    const aiDebit =
      Number(aiInput.rows[0]?.aggValue ?? 0) +
      Number(aiOutput.rows[0]?.aggValue ?? 0) +
      Number(aiCache.rows[0]?.aggValue ?? 0)
    const totalRevenue = (
      Number(basicDebit.rows[0]?.aggValue ?? 0) + aiDebit
    ).toString()
    const totalEvents = (
      Number(basicCount.rows[0]?.aggValue ?? 0) +
      Number(aiCount.rows[0]?.aggValue ?? 0)
    ).toString()

    return {
      totalRevenue,
      totalEvents,
      totalCredits: creditSum.rows[0]?.aggValue ?? "0",
    }
  })

export const getDashboardSummary = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string; mode?: string }>())
  .handler(async (ctx) => {
    const analytics = await getProjectAnalytics(ctx.data.projectId)
    const sf = analytics.query.basicUsage.fields
    const af = analytics.query.aiToken.fields
    const pf = analytics.query.payment.fields
    const mode = ctx.data.mode

    const [
      basicDebit,
      aiInput,
      aiOutput,
      aiCache,
      basicCount,
      aiCount,
      creditResult,
    ] = await Promise.all([
      mode
        ? await analytics.query.basicUsage
            .where(and(eq(sf.mode, mode)))
            .aggregate(sum(sf.debitAmount))
            .execute()
        : await analytics.query.basicUsage
            .aggregate(sum(sf.debitAmount))
            .execute(),
      mode
        ? await analytics.query.aiToken
            .where(and(eq(af.mode, mode)))
            .aggregate(sum(af.inputDebitAmount))
            .execute()
        : await analytics.query.aiToken
            .aggregate(sum(af.inputDebitAmount))
            .execute(),
      mode
        ? await analytics.query.aiToken
            .where(and(eq(af.mode, mode)))
            .aggregate(sum(af.outputDebitAmount))
            .execute()
        : await analytics.query.aiToken
            .aggregate(sum(af.outputDebitAmount))
            .execute(),
      mode
        ? await analytics.query.aiToken
            .where(and(eq(af.mode, mode)))
            .aggregate(sum(af.inputCacheDebitAmount))
            .execute()
        : await analytics.query.aiToken
            .aggregate(sum(af.inputCacheDebitAmount))
            .execute(),
      mode
        ? await analytics.query.basicUsage
            .where(and(eq(sf.mode, mode)))
            .aggregate(analyticsCount())
            .execute()
        : await analytics.query.basicUsage
            .aggregate(analyticsCount())
            .execute(),
      mode
        ? await analytics.query.aiToken
            .where(and(eq(af.mode, mode)))
            .aggregate(analyticsCount())
            .execute()
        : await analytics.query.aiToken.aggregate(analyticsCount()).execute(),
      mode
        ? await analytics.query.payment
            .where(and(eq(pf.mode, mode)))
            .aggregate(sum(pf.creditAmount))
            .execute()
        : await analytics.query.payment
            .aggregate(sum(pf.creditAmount))
            .execute(),
    ])

    const aiDebit =
      Number(aiInput.rows[0]?.aggValue ?? 0) +
      Number(aiOutput.rows[0]?.aggValue ?? 0) +
      Number(aiCache.rows[0]?.aggValue ?? 0)
    const totalRevenue = (
      Number(basicDebit.rows[0]?.aggValue ?? 0) + aiDebit
    ).toString()
    const totalEvents = (
      Number(basicCount.rows[0]?.aggValue ?? 0) +
      Number(aiCount.rows[0]?.aggValue ?? 0)
    ).toString()

    return {
      totalRevenue,
      totalEvents,
      totalCredits: creditResult.rows[0]?.aggValue ?? "0",
    }
  })
