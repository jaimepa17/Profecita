/// <reference types="node" />
import { tool } from "@opencode-ai/plugin";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Leer token y configuración del archivo de auth de MCP
function getVercelConfig() {
  try {
    const authPath = join(homedir(), ".local/share/opencode/mcp-auth.json");
    const authData = JSON.parse(readFileSync(authPath, "utf8"));
    const vercelConfig = authData.vercel;
    if (!vercelConfig) {
      throw new Error("Vercel MCP no encontrado en archivo de autenticación");
    }
    
    // Extraer teamId y projectSlug de la URL del MCP
    const url = vercelConfig.serverUrl;
    const match = url.match(/\/([^\/]+)\/([^\/]+)$/);
    const teamSlug = match ? match[1] : null;
    const projectSlug = match ? match[2] : null;
    
    return {
      accessToken: vercelConfig.tokens.accessToken,
      teamSlug,
      projectSlug,
      baseUrl: "https://api.vercel.com"
    };
  } catch (error) {
    console.error("Error leyendo configuración de Vercel:", error);
    throw error;
  }
}

// Función auxiliar para hacer requests a la API de Vercel
async function vercelApi(endpoint: string, options: RequestInit = {}) {
  const config = getVercelConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers = {
    "Authorization": `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vercel API error ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// Herramienta para listar deployments
export const listDeployments = tool({
  description: "List deployments for the Vercel project",
  args: {
    limit: tool.schema.number().optional().describe("Number of deployments to return (default: 10)"),
    state: tool.schema.string().optional().describe("Filter by state: READY, ERROR, BUILDING, etc."),
  },
  async execute(args) {
    const config = getVercelConfig();
    const params = new URLSearchParams();
    params.append("projectId", config.projectSlug!);
    params.append("teamId", config.teamSlug!);
    params.append("limit", (args.limit || 10).toString());
    if (args.state) params.append("state", args.state);
    
    const data = await vercelApi(`/v6/deployments?${params.toString()}`);
    return JSON.stringify(data, null, 2);
  },
});

// Herramienta para obtener detalles de un deployment específico
export const getDeployment = tool({
  description: "Get details of a specific deployment",
  args: {
    deploymentId: tool.schema.string().describe("ID of the deployment (e.g., dpl_xxx)"),
  },
  async execute(args) {
    const config = getVercelConfig();
    const params = new URLSearchParams();
    if (config.teamSlug) params.append("teamId", config.teamSlug);
    
    const data = await vercelApi(`/v6/deployments/${args.deploymentId}?${params.toString()}`);
    return JSON.stringify(data, null, 2);
  },
});

// Herramienta para obtener logs de un deployment
export const getDeploymentLogs = tool({
  description: "Get build logs for a deployment",
  args: {
    deploymentId: tool.schema.string().describe("ID of the deployment"),
    limit: tool.schema.number().optional().describe("Number of log lines to return"),
  },
  async execute(args) {
    const config = getVercelConfig();
    const params = new URLSearchParams();
    if (config.teamSlug) params.append("teamId", config.teamSlug);
    if (args.limit) params.append("limit", args.limit.toString());
    
    const data = await vercelApi(`/v3/deployments/${args.deploymentId}/events?${params.toString()}`);
    return JSON.stringify(data, null, 2);
  },
});

// Herramienta para listar proyectos
export const listProjects = tool({
  description: "List all Vercel projects",
  args: {
    limit: tool.schema.number().optional().describe("Number of projects to return"),
  },
  async execute(args) {
    const config = getVercelConfig();
    const params = new URLSearchParams();
    if (config.teamSlug) params.append("teamId", config.teamSlug);
    if (args.limit) params.append("limit", args.limit.toString());
    
    const data = await vercelApi(`/v4/projects?${params.toString()}`);
    return JSON.stringify(data, null, 2);
  },
});

// Herramienta para obtener estado actual del proyecto
export const getProjectStatus = tool({
  description: "Get current status and latest deployments for the project",
  args: {},
  async execute() {
    const config = getVercelConfig();
    
    // Obtener proyecto
    const projectParams = new URLSearchParams();
    if (config.teamSlug) projectParams.append("teamId", config.teamSlug);
    const project = await vercelApi(`/v4/projects/${config.projectSlug}?${projectParams.toString()}`);
    
    // Obtener deployments recientes
    const deploymentsParams = new URLSearchParams();
    deploymentsParams.append("projectId", config.projectSlug!);
    deploymentsParams.append("teamId", config.teamSlug!);
    deploymentsParams.append("limit", "5");
    const deployments = await vercelApi(`/v6/deployments?${deploymentsParams.toString()}`);
    
    const result = {
      project: {
        name: project.name,
        id: project.id,
        framework: project.framework,
        latestDeployments: project.latestDeployments?.slice(0, 3) || [],
      },
      recentDeployments: deployments.deployments?.slice(0, 5) || [],
    };
    
    return JSON.stringify(result, null, 2);
  },
});

// Herramienta para trigger redeploy
export const triggerRedeploy = tool({
  description: "Trigger a new deployment for the project",
  args: {
    branch: tool.schema.string().optional().describe("Git branch to deploy (default: main)"),
  },
  async execute(args) {
    const config = getVercelConfig();
    const body = {
      name: config.projectSlug,
      gitBranch: args.branch || "main",
      target: "preview",
      source: "cli",
    };
    
    const data = await vercelApi(`/v13/deployments?teamId=${config.teamSlug}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    
    return JSON.stringify({
      message: "Deployment triggered successfully",
      deploymentId: data.id,
      url: data.url,
      status: data.readyState,
    }, null, 2);
  },
});