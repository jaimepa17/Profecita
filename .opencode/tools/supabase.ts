/// <reference types="node" />
import { tool } from "@opencode-ai/plugin";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function getSupabaseConfig() {
  const authPath = join(homedir(), ".local/share/opencode/mcp-auth.json");
  const authData = JSON.parse(readFileSync(authPath, "utf8"));
  const supabaseConfig = authData.supabase;
  
  const urlMatch = supabaseConfig.serverUrl.match(/project_ref=([^&]+)/);
  const projectRef = urlMatch ? urlMatch[1] : null;
  
  return {
    accessToken: supabaseConfig.tokens.accessToken,
    projectRef,
    baseUrl: `https://${projectRef}.supabase.co`,
  };
}

async function supabasePostRpc(functionName: string, params: Record<string, unknown> = {}) {
  const config = getSupabaseConfig();
  
  const response = await fetch(`${config.baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": config.accessToken,
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error ${response.status}: ${error}`);
  }
  
  return response.json();
}

async function supabaseGet(endpoint: string) {
  const config = getSupabaseConfig();
  
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    headers: {
      "apikey": config.accessToken,
      "Authorization": `Bearer ${config.accessToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error ${response.status}: ${error}`);
  }
  
  return response.json();
}

async function supabasePost(endpoint: string, body: Record<string, unknown>) {
  const config = getSupabaseConfig();
  
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "apikey": config.accessToken,
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error ${response.status}: ${error}`);
  }
  
  return response.json();
}

export const listTables = tool({
  description: "List all tables in the Supabase database",
  args: {},
  async execute() {
    const tables = await supabasePostRpc("pg_tables", { p_schema: "public" });
    return JSON.stringify(tables, null, 2);
  },
});

export const listSchemas = tool({
  description: "List all schemas in the database",
  args: {},
  async execute() {
    const schemas = await supabasePostRpc("pg_namespace_list");
    return JSON.stringify(schemas, null, 2);
  },
});

export const getProjectInfo = tool({
  description: "Get Supabase project information",
  args: {},
  async execute() {
    const config = getSupabaseConfig();
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${config.projectRef}`,
      {
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
        },
      }
    );
    const data = await response.json();
    return JSON.stringify({
      projectRef: config.projectRef,
      name: data.name,
      region: data.region,
      status: data.status,
      createdAt: data.inserted_at,
    }, null, 2);
  },
});

export const listTablesSimple = tool({
  description: "List all tables using direct query",
  args: {},
  async execute() {
    const data = await supabaseGet("/rest/v1/carreras?select=id&limit=1");
    return JSON.stringify({ message: "Connection successful. Tables exist.", sample: data }, null, 2);
  },
});

export const listAllTables = tool({
  description: "List all tables in public schema",
  args: {},
  async execute() {
    const data = await supabaseGet("/rest/v1/?apitable=carreras&select=id&limit=1");
    return JSON.stringify(data, null, 2);
  },
});

export const executeSql = tool({
  description: "Execute a SQL query via RPC function",
  args: {
    functionName: tool.schema.string().describe("Name of the RPC function to call"),
    params: tool.schema.record(tool.schema.string(), tool.schema.any()).optional().describe("Parameters to pass to the function"),
  },
  async execute(args) {
    try {
      const result = await supabasePostRpc(args.functionName, args.params || {});
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return JSON.stringify({ error: (error as Error).message }, null, 2);
    }
  },
});

export const getTableInfo = tool({
  description: "Get information about a specific table",
  args: {
    tableName: tool.schema.string().describe("Name of the table"),
  },
  async execute(args) {
    const config = getSupabaseConfig();
    const response = await fetch(
      `${config.baseUrl}/rest/v1/${args.tableName}?select=*&limit=1`,
      {
        headers: {
          "apikey": config.accessToken,
          "Authorization": `Bearer ${config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      return JSON.stringify({ error: `Table '${args.tableName}' not found or no access` }, null, 2);
    }
    
    return JSON.stringify({
      table: args.tableName,
      message: "Table exists and is accessible",
      columns: Object.keys(await response.json()),
    }, null, 2);
  },
});

export const getDatabaseSize = tool({
  description: "Get database size information",
  args: {},
  async execute() {
    const config = getSupabaseConfig();
    const response = await fetch(
      `${config.baseUrl}/rest/v1/rpc/pg_database_size`,
      {
        method: "POST",
        headers: {
          "apikey": config.accessToken,
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );
    
    if (!response.ok) {
      return JSON.stringify({ error: "Could not get database size" }, null, 2);
    }
    
    const size = await response.json();
    return JSON.stringify({
      size_bytes: size,
      size_mb: (size / (1024 * 1024)).toFixed(2) + " MB",
    }, null, 2);
  },
});
