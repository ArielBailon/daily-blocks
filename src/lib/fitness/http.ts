import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("JSON inválido", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: jsonError(parsed.error.issues[0].message, 400) };
  }
  return { data: parsed.data };
}

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function queryParams(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}
