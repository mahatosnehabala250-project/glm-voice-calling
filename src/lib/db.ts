// ============================================
// SUPABASE DATABASE ADAPTER
// ============================================
// Mimics Prisma API surface so all existing API routes work unchanged.
// Converts camelCase ↔ snake_case automatically.
// Falls back to Prisma/SQLite when Supabase is not configured.
// ============================================

import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';

// ============================================
// KEY CONVERSION UTILITIES
// ============================================

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeysDeep(obj: unknown, converter: (s: string) => string): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map((item) => convertKeysDeep(item, converter));
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[converter(key)] = convertKeysDeep(value, converter);
    }
    return result;
  }
  return obj;
}

// Convert Prisma camelCase to Supabase snake_case
function toDb(obj: unknown): unknown {
  return convertKeysDeep(obj, toSnakeCase);
}

// Convert Supabase snake_case to Prisma camelCase
function fromDb(obj: unknown): unknown {
  return convertKeysDeep(obj, toCamelCase);
}

// ============================================
// WHERE CLAUSE TRANSLATION
// ============================================

interface FilterResult {
  filters: string[];
  params: Record<string, unknown>;
  orClauses: string[][];
}

function translateWhere(
  where: Record<string, unknown>,
  params: Record<string, unknown> = {},
  prefix = ''
): FilterResult {
  const filters: string[] = [];
  const orClauses: string[][] = [];
  let paramIdx = Object.keys(params).length;

  for (const [key, value] of Object.entries(where)) {
    const dbKey = toSnakeCase(key);

    if (key === 'OR' && Array.isArray(value)) {
      // Handle OR clauses
      for (const orGroup of value as Record<string, unknown>[]) {
        const orFilters: string[] = [];
        for (const [orKey, orVal] of Object.entries(orGroup)) {
          const orDbKey = toSnakeCase(orKey);
          if (typeof orVal === 'object' && orVal !== null && !Array.isArray(orVal)) {
            const entries = Object.entries(orVal as Record<string, unknown>);
            for (const [op, opVal] of entries) {
              const pName = `p${paramIdx++}`;
              params[pName] = opVal;
              if (op === 'contains') {
                orFilters.push(`${orDbKey}.ilike.%${opVal}%`);
              } else {
                orFilters.push(`${orDbKey}.${translateOp(op)}.${pName}`);
              }
            }
          } else {
            const pName = `p${paramIdx++}`;
            params[pName] = orVal;
            orFilters.push(`${orDbKey}.eq.${pName}`);
          }
        }
        if (orFilters.length > 0) orClauses.push(orFilters);
      }
      continue;
    }

    if (value === null) {
      filters.push(`${dbKey}.is.null`);
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const entries = Object.entries(value as Record<string, unknown>);
      for (const [op, opVal] of entries) {
        if (op === 'in' && Array.isArray(opVal)) {
          filters.push(`${dbKey}.in.(${opVal.map(() => {
            const pName = `p${paramIdx++}`;
            params[pName] = '';
            return pName;
          }).join(',')})`);
          // Supabase doesn't support param arrays in .in.() filter strings well,
          // so we'll handle this differently via the query builder below
          // Actually let's use a simpler approach
        } else if (op === 'contains') {
          filters.push(`${dbKey}.ilike.%${opVal}%`);
        } else {
          const pName = `p${paramIdx++}`;
          params[pName] = opVal;
          filters.push(`${dbKey}.${translateOp(op)}.${pName}`);
        }
      }
      continue;
    }

    const pName = `p${paramIdx++}`;
    params[pName] = value instanceof Date ? value.toISOString() : value;
    filters.push(`${dbKey}.eq.${pName}`);
  }

  return { filters, params, orClauses };
}

function translateOp(op: string): string {
  const map: Record<string, string> = {
    gte: 'gte',
    gt: 'gt',
    lte: 'lte',
    lt: 'lt',
    ne: 'neq',
    not: 'neq',
  };
  return map[op] || op;
}

// ============================================
// MODEL ADAPTER CLASS
// ============================================

class SupabaseModel {
  constructor(private tableName: string) {}

  private getClient() {
    const client = getSupabaseAdmin();
    if (!client) throw new Error('Supabase client not configured');
    return client;
  }

  private buildQuery(
    opts: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string> | Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, boolean>;
      distinct?: string[];
    } = {}
  ) {
    const { where, orderBy, skip, take, select, distinct } = opts;
    const client = this.getClient();
    let query = client.from(this.tableName).select();

    // Handle where clause
    if (where && Object.keys(where).length > 0) {
      const { filters, params, orClauses } = translateWhere(where);

      // Apply simple filters
      for (const f of filters) {
        // Parse filter like "clinic_id.eq.p0" or "started_at.gte.p0"
        const parts = f.split('.');
        if (parts.length >= 3) {
          const col = parts[0];
          const op = parts[1];
          const paramKey = parts.slice(2).join('.');

          if (f.endsWith('.is.null')) {
            query = query.is(col, null);
          } else if (f.includes('.ilike.')) {
            // contains filter
            const idx = f.indexOf('.ilike.');
            const column = f.substring(0, idx);
            const val = f.substring(idx + 7);
            query = query.ilike(column, val);
          } else if (op === 'eq') {
            const val = params[paramKey];
            if (val === null || val === 'null') {
              query = query.is(col, null);
            } else {
              query = query.eq(col, val);
            }
          } else if (op === 'gte') {
            query = query.gte(col, params[paramKey]);
          } else if (op === 'gt') {
            query = query.gt(col, params[paramKey]);
          } else if (op === 'lte') {
            query = query.lte(col, params[paramKey]);
          } else if (op === 'lt') {
            query = query.lt(col, params[paramKey]);
          } else if (op === 'neq') {
            query = query.neq(col, params[paramKey]);
          } else if (op === 'in') {
            const inVals = this.extractInValues(where, col);
            query = query.in(col, inVals);
          }
        }
      }

      // Apply OR clauses
      for (const orGroup of orClauses) {
        const orFilter = orGroup.join(',');
        query = query.or(orFilter);
      }

      // Handle 'in' operator from where clause (special case)
      for (const [key, value] of Object.entries(where)) {
        if (typeof value === 'object' && value !== null && 'in' in (value as Record<string, unknown>)) {
          const inVal = (value as Record<string, unknown>).in;
          if (Array.isArray(inVal)) {
            const dbKey = toSnakeCase(key);
            // Already handled above in most cases, but ensure
          }
        }
        // Handle null checks explicitly
        if (value === null) {
          query = query.is(toSnakeCase(key), null);
        }
        // Handle { in: [...] } pattern - re-check
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          const subEntries = Object.entries(value as Record<string, unknown>);
          for (const [op, opVal] of subEntries) {
            if (op === 'in' && Array.isArray(opVal)) {
              const dbKey = toSnakeCase(key);
              query = query.in(dbKey, opVal);
            }
          }
        }
      }
    }

    // Handle distinct
    // distinct handled in findMany method below

    // Handle orderBy
    if (orderBy) {
      if (Array.isArray(orderBy)) {
        for (const o of orderBy) {
          const col = toSnakeCase(Object.keys(o)[0]);
          const dir = Object.values(o)[0] === 'desc' ? false : true;
          query = query.order(col, { ascending: dir });
        }
      } else {
        const col = toSnakeCase(Object.keys(orderBy)[0]);
        const dir = Object.values(orderBy)[0] === 'desc' ? false : true;
        query = query.order(col, { ascending: dir });
      }
    }

    // Handle skip/take (pagination)
    if (skip) query = query.range(skip, skip + (take || 100) - 1);
    else if (take) query = query.limit(take);

    return query;
  }

  private extractInValues(where: Record<string, unknown>, snakeCol: string): unknown[] {
    for (const [key, value] of Object.entries(where)) {
      if (toSnakeCase(key) === snakeCol && typeof value === 'object' && value !== null) {
        if ('in' in (value as Record<string, unknown>)) {
          return (value as Record<string, unknown>).in as unknown[];
        }
      }
    }
    return [];
  }

  async findMany(opts: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, string> | Array<Record<string, string>>;
    skip?: number;
    take?: number;
    select?: Record<string, boolean>;
    distinct?: string[];
    include?: Record<string, unknown>;
  } = {}): Promise<Record<string, unknown>[]> {
    const { where, orderBy, skip, take, select, distinct, include } = opts;
    const client = this.getClient();

    // Handle select (only specific columns)
    let selectStr = '*';
    if (select && Object.keys(select).length > 0) {
      selectStr = Object.keys(select)
        .map((k) => toSnakeCase(k))
        .join(',');
    }

    // Handle include
    if (include && '_count' in include) {
      const countSelect = (include._count as Record<string, unknown>).select as Record<string, boolean>;
      if (countSelect) {
        // We'll need to add counts after fetching
      }
    }

    // Build base query
    let query = client.from(this.tableName).select(selectStr);

    // Apply where
    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    // Apply distinct
    if (distinct && distinct.length > 0) {
      const distinctCols = distinct.map((d) => toSnakeCase(d)).join(',');
      // For distinct, we need a different approach in Supabase
      // Rebuild query with distinct columns
      query = client.from(this.tableName).select(distinctCols);
      if (where && Object.keys(where).length > 0) {
        query = this.applyWhere(query, where);
      }
    }

    // Apply orderBy
    if (orderBy) {
      if (Array.isArray(orderBy)) {
        for (const o of orderBy) {
          const col = toSnakeCase(Object.keys(o)[0]);
          const dir = Object.values(o)[0] === 'desc' ? false : true;
          query = query.order(col, { ascending: dir });
        }
      } else {
        const col = toSnakeCase(Object.keys(orderBy)[0]);
        const dir = Object.values(orderBy)[0] === 'desc' ? false : true;
        query = query.order(col, { ascending: dir });
      }
    }

    // Apply pagination
    if (typeof skip === 'number' && typeof take === 'number') {
      query = query.range(skip, skip + take - 1);
    } else if (typeof take === 'number') {
      query = query.limit(take);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase ${this.tableName} findMany: ${error.message}`);

    let results = (data || []).map((row) => fromDb(row) as Record<string, unknown>);

    // Handle distinct dedup (client-side)
    if (distinct && distinct.length > 0) {
      const seen = new Set<string>();
      results = results.filter((row) => {
        const key = distinct.map((d) => String(row[d])).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Handle _count include
    if (include && '_count' in include) {
      const countSelect = (include._count as Record<string, unknown>).select as Record<string, boolean> | undefined;
      if (countSelect) {
        const _count: Record<string, number> = {};
        for (const [rel, shouldCount] of Object.entries(countSelect)) {
          if (shouldCount) {
            // Map relation to table name
            const relTable = this.relationToTable(rel);
            for (const row of results) {
              // Count for this specific row
              const { count } = await client
                .from(relTable)
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', row.id);
              _count[rel] = count || 0;
              row._count = _count;
            }
          }
        }
      }
    }

    return results;
  }

  async findFirst(opts: {
    where?: Record<string, unknown>;
    select?: Record<string, boolean>;
  } = {}): Promise<Record<string, unknown> | null> {
    const { where, select } = opts;
    const client = this.getClient();

    let selectStr = '*';
    if (select && Object.keys(select).length > 0) {
      selectStr = Object.keys(select)
        .map((k) => toSnakeCase(k))
        .join(',');
    }

    let query = client.from(this.tableName).select(selectStr);

    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw new Error(`Supabase ${this.tableName} findFirst: ${error.message}`);

    if (!data || data.length === 0) return null;
    return fromDb(data[0]) as Record<string, unknown>;
  }

  async findUnique(opts: {
    where: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null> {
    const { where, select, include } = opts;
    const client = this.getClient();

    // Build select string
    let selectStr = '*';
    if (select && Object.keys(select).length > 0) {
      selectStr = Object.keys(select)
        .map((k) => toSnakeCase(k))
        .join(',');
    }

    // Handle include with relations
    if (include) {
      for (const [relKey, relVal] of Object.entries(include)) {
        if (relKey === '_count') continue;
        const relTable = this.relationToTable(relKey);
        if (typeof relVal === 'object' && relVal !== null && 'select' in (relVal as Record<string, unknown>)) {
          const relSelect = (relVal as Record<string, unknown>).select as Record<string, boolean>;
          const relCols = Object.keys(relSelect)
            .map((k) => toSnakeCase(k))
            .join(',');
          selectStr += `,${relTable}(${relCols})`;
        } else {
          selectStr += `,${relTable}(*)`;
        }
      }
    }

    let query = client.from(this.tableName).select(selectStr);

    // Apply where
    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw new Error(`Supabase ${this.tableName} findUnique: ${error.message}`);

    if (!data || data.length === 0) return null;

    const result = fromDb(data[0]) as Record<string, unknown>;

    // Handle include - map relation table keys to relation names
    if (include) {
      for (const [relKey, relVal] of Object.entries(include)) {
        if (relKey === '_count') continue;
        const relTable = this.relationToTable(relKey);
        if (data[0][relTable]) {
          (result as Record<string, unknown>)[relKey] = fromDb(data[0][relTable]);
        }
      }
    }

    return result;
  }

  async count(opts: { where?: Record<string, unknown> } = {}): Promise<number> {
    const { where } = opts;
    const client = this.getClient();

    let query = client.from(this.tableName).select('*', { count: 'exact', head: true });

    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    const { count, error } = await query;
    if (error) throw new Error(`Supabase ${this.tableName} count: ${error.message}`);

    return count || 0;
  }

  async create(opts: {
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const { data, include } = opts;
    const client = this.getClient();

    const dbData = toDb(data) as Record<string, string | number | boolean | null>;

    // Handle nested create (not supported - just flatten)
    const insertData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(dbData)) {
      if (typeof val !== 'object' || val === null) {
        insertData[key] = val;
      } else if (val instanceof Date || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        insertData[key] = val;
      }
    }

    // Re-process: keep primitives and ISO strings, skip nested objects
    const finalData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val === null || val === undefined) {
        finalData[toSnakeCase(key)] = null;
      } else if (val instanceof Date) {
        finalData[toSnakeCase(key)] = val.toISOString();
      } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        finalData[toSnakeCase(key)] = val;
      }
      // Skip objects/arrays unless they are plain JSON strings (like services)
      else if (typeof val === 'object' && Array.isArray(val)) {
        finalData[toSnakeCase(key)] = JSON.stringify(val);
      }
    }

    const { data: result, error } = await client
      .from(this.tableName)
      .insert(finalData)
      .select()
      .single();

    if (error) throw new Error(`Supabase ${this.tableName} create: ${error.message}`);

    const created = fromDb(result) as Record<string, unknown>;

    // Handle _count in include
    if (include && '_count' in include) {
      created._count = { calls: 0, appointments: 0, users: 0 };
    }

    return created;
  }

  async update(opts: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const { where, data, include } = opts;
    const client = this.getClient();

    // Find the row to verify it exists
    const whereKey = Object.keys(where)[0];
    const whereVal = where[whereKey];

    // Convert data to snake_case
    const updateData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val instanceof Date) {
        updateData[toSnakeCase(key)] = val.toISOString();
      } else if (val === null) {
        updateData[toSnakeCase(key)] = null;
      } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        updateData[toSnakeCase(key)] = val;
      } else if (Array.isArray(val)) {
        updateData[toSnakeCase(key)] = JSON.stringify(val);
      }
      // Skip nested objects that aren't primitives
    }

    let query = client.from(this.tableName).update(updateData);

    // Apply where
    if (whereVal !== undefined && whereVal !== null) {
      const col = toSnakeCase(whereKey);
      query = query.eq(col, whereVal);
    }

    const { data: result, error } = await query.select().single();

    if (error) throw new Error(`Supabase ${this.tableName} update: ${error.message}`);

    const updated = fromDb(result) as Record<string, unknown>;

    // Handle _count in include
    if (include && '_count' in include) {
      const _count: Record<string, number> = {};
      const countSelect = (include._count as Record<string, unknown>).select as Record<string, boolean> | undefined;
      if (countSelect) {
        for (const [rel] of Object.entries(countSelect)) {
          const relTable = this.relationToTable(rel);
          const { count } = await client
            .from(relTable)
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', updated.id);
          _count[rel] = count || 0;
        }
      }
      updated._count = _count;
    }

    return updated;
  }

  async updateMany(opts: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const { where, data } = opts;
    const client = this.getClient();

    const updateData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val instanceof Date) {
        updateData[toSnakeCase(key)] = val.toISOString();
      } else if (val === null) {
        updateData[toSnakeCase(key)] = null;
      } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        updateData[toSnakeCase(key)] = val;
      }
    }

    let query = client.from(this.tableName).update(updateData);

    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    const { count, error } = await query.select('*', { count: 'exact' });

    if (error) throw new Error(`Supabase ${this.tableName} updateMany: ${error.message}`);

    return { count: count || 0 };
  }

  async delete(opts: { where: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const { where } = opts;
    const client = this.getClient();

    const whereKey = Object.keys(where)[0];
    const whereVal = where[whereKey];

    let query = client.from(this.tableName).delete();

    const col = toSnakeCase(whereKey);
    query = query.eq(col, whereVal);

    const { data: result, error } = await query.select().single();

    if (error) throw new Error(`Supabase ${this.tableName} delete: ${error.message}`);

    return fromDb(result) as Record<string, unknown>;
  }

  async groupBy(opts: {
    by: string[];
    _count?: boolean;
    where?: Record<string, unknown>;
  }): Promise<Array<Record<string, unknown>>> {
    const { by, where } = opts;
    const client = this.getClient();

    const selectCols = by.map((b) => toSnakeCase(b)).join(',');

    let query = client.from(this.tableName).select(selectCols);

    if (where && Object.keys(where).length > 0) {
      query = this.applyWhere(query, where);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase ${this.tableName} groupBy: ${error.message}`);

    // Count occurrences client-side
    const counts = new Map<string, number>();
    for (const row of data || []) {
      const key = by.map((b) => String(row[toSnakeCase(b)])).join('|');
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([key, count]) => {
      const parts = key.split('|');
      const result: Record<string, unknown> = {};
      by.forEach((b, i) => {
        result[b] = parts[i];
      });
      result._count = count;
      return result;
    });
  }

  private applyWhere(
    query: ReturnType<ReturnType<typeof getSupabaseAdmin>['from']>['select'],
    where: Record<string, unknown>
  ) {
    let q = query;
    const orFilters: string[] = [];
    let paramIdx = 0;
    const params: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(where)) {
      const dbKey = toSnakeCase(key);

      if (key === 'OR' && Array.isArray(value)) {
        for (const orGroup of value as Record<string, unknown>[]) {
          const groupFilters: string[] = [];
          for (const [orKey, orVal] of Object.entries(orGroup)) {
            const orDbKey = toSnakeCase(orKey);
            if (typeof orVal === 'object' && orVal !== null && !Array.isArray(orVal)) {
              for (const [op, opVal] of Object.entries(orVal as Record<string, unknown>)) {
                if (op === 'contains') {
                  groupFilters.push(`${orDbKey}.ilike.%${opVal}%`);
                } else {
                  const pName = `orp${paramIdx++}`;
                  params[pName] = opVal;
                  groupFilters.push(`${orDbKey}.${translateOp(op)}.${pName}`);
                }
              }
            } else {
              groupFilters.push(`${orDbKey}.eq.${orVal}`);
            }
          }
          if (groupFilters.length > 0) {
            orFilters.push(`(${groupFilters.join(',')})`);
          }
        }
        continue;
      }

      if (value === null) {
        q = q.is(dbKey, null);
        continue;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
          if (op === 'in' && Array.isArray(opVal)) {
            q = q.in(dbKey, opVal);
          } else if (op === 'contains') {
            q = q.ilike(dbKey, `%${opVal}%`);
          } else if (op === 'gte') {
            const dateVal = opVal instanceof Date ? opVal.toISOString() : opVal;
            q = q.gte(dbKey, dateVal);
          } else if (op === 'gt') {
            const dateVal = opVal instanceof Date ? opVal.toISOString() : opVal;
            q = q.gt(dbKey, dateVal);
          } else if (op === 'lte') {
            const dateVal = opVal instanceof Date ? opVal.toISOString() : opVal;
            q = q.lte(dbKey, dateVal);
          } else if (op === 'lt') {
            const dateVal = opVal instanceof Date ? opVal.toISOString() : opVal;
            q = q.lt(dbKey, dateVal);
          } else if (op === 'not' || op === 'ne') {
            q = q.neq(dbKey, opVal);
          }
        }
        continue;
      }

      // Simple equality
      const finalVal = value instanceof Date ? value.toISOString() : value;
      q = q.eq(dbKey, finalVal);
    }

    // Apply OR filters
    if (orFilters.length > 0) {
      q = q.or(orFilters.join(','));
    }

    return q;
  }

  private relationToTable(relation: string): string {
    const map: Record<string, string> = {
      clinic: 'clinics',
      user: 'users',
      users: 'users',
      call: 'calls',
      calls: 'calls',
      appointment: 'appointments',
      appointments: 'appointments',
      notification: 'notifications',
      notifications: 'notifications',
      agentConfig: 'agent_configs',
      agentConfigs: 'agent_configs',
      analyticsSnapshot: 'analytics_snapshots',
      analyticsSnapshots: 'analytics_snapshots',
    };
    return map[relation] || toSnakeCase(relation) + 's';
  }
}

// ============================================
// EXPORT DB OBJECT (Supabase or Prisma fallback)
// ============================================

function createSupabaseDb() {
  return {
    user: new SupabaseModel('users'),
    clinic: new SupabaseModel('clinics'),
    call: new SupabaseModel('calls'),
    appointment: new SupabaseModel('appointments'),
    notification: new SupabaseModel('notifications'),
    agentConfig: new SupabaseModel('agent_configs'),
    analyticsSnapshot: new SupabaseModel('analytics_snapshots'),
  };
}

// If Supabase is configured, use Supabase adapter
// Otherwise fall back to Prisma (for local dev without Supabase)
let _db: ReturnType<typeof createSupabaseDb> | null = null;

function getDb() {
  if (isSupabaseConfigured()) {
    if (!_db) _db = createSupabaseDb();
    return _db;
  }
  // Fallback: dynamic import Prisma
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');
  function createPrismaClient() {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    });
  }
  const prisma = (globalThis as Record<string, unknown>).prisma
    ? (globalThis as Record<string, unknown>).prisma as InstanceType<typeof PrismaClient>
    : createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    (globalThis as Record<string, unknown>).prisma = prisma;
  }
  return prisma;
}

export const db = getDb();

// ============================================
// DATABASE STATUS HELPER
// ============================================
export function getDatabaseProvider(): 'sqlite' | 'supabase' {
  return isSupabaseConfigured() ? 'supabase' : 'sqlite';
}
