# Commands Reference

Comandos para verificar y usar MCPs (Vercel y Supabase) sin custom tools, más referencia de custom tools disponibles.

## Vercel MCP

### Verificación Rápida
```bash
opencode mcp list
opencode mcp debug vercel
```

### Token y Configuración
```bash
# Ver configuración completa
jq '.vercel' ~/.local/share/opencode/mcp-auth.json

# Solo access token
ACCESS_TOKEN=$(jq -r '.vercel.tokens.accessToken' ~/.local/share/opencode/mcp-auth.json)
echo "Token: ${ACCESS_TOKEN:0:20}..."
```

### Comandos curl
```bash
TEAM_SLUG="jaimepa17s-projects"
PROJECT_SLUG="control-notas"
ACCESS_TOKEN=$(jq -r '.vercel.tokens.accessToken' ~/.local/share/opencode/mcp-auth.json)

# Listar deployments
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$PROJECT_SLUG&teamId=$TEAM_SLUG&limit=5"

# Detalles de un deployment
DEPLOYMENT_ID="dpl_xxx"
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.vercel.com/v6/deployments/$DEPLOYMENT_ID?teamId=$TEAM_SLUG"
```

## Supabase MCP

### Verificación Rápida
```bash
opencode mcp list
opencode mcp debug supabase
```

### Token y Configuración
```bash
# Ver configuración completa
jq '.supabase' ~/.local/share/opencode/mcp-auth.json

# Extraer project ref
PROJECT_REF=$(jq -r '.supabase.serverUrl' ~/.local/share/opencode/mcp-auth.json | grep -oP 'project_ref=\K[^&]+')
echo "Project: $PROJECT_REF"
```

### API REST con curl
```bash
PROJECT_REF="emmpppsumpchcpfrxpmn"
ACCESS_TOKEN=$(jq -r '.supabase.tokens.accessToken' ~/.local/share/opencode/mcp-auth.json)

# Listar tablas
curl -s -H "apikey: $ACCESS_TOKEN" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://$PROJECT_REF.supabase.co/rest/v1/?table=pg_tables&select=*&schemaname=eq.public"

# Listar datos de una tabla
curl -s -H "apikey: $ACCESS_TOKEN" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://$PROJECT_REF.supabase.co/rest/v1/carreras?select=*"

# Ejecutar RPC (funciones)
curl -s -X POST -H "apikey: $ACCESS_TOKEN" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://$PROJECT_REF.supabase.co/rest/v1/rpc/get_grupos_stats" \
  -d '{"grupo_ids": ["id1", "id2"]}'
```

## Custom Tools Disponibles

### Vercel Tools (`.opencode/tools/vercel.ts`)
- `vercel_listDeployments` - Listar deployments del proyecto
- `vercel_getDeployment` - Detalles de un deployment específico
- `vercel_getDeploymentLogs` - Obtener logs de build
- `vercel_listProjects` - Listar todos los proyectos
- `vercel_getProjectStatus` - Estado actual y últimos deployments
- `vercel_triggerRedeploy` - Trigger nuevo deployment

### Supabase Tools (`.opencode/tools/supabase.ts`)
- `supabase_listTables` - Listar tablas de la base de datos
- `supabase_listSchemas` - Listar esquemas
- `supabase_getTableInfo` - Información de una tabla específica
- `supabase_listIndexes` - Listar índices
- `supabase_listRlsPolicies` - Listar políticas RLS
- `supabase_getTableStats` - Estadísticas de tablas
- `supabase_getConnectionStats` - Estadísticas de conexiones
- `supabase_getProjectInfo` - Información del proyecto
- `supabase_executeSql` - Ejecutar SQL (funciones RPC)
- `supabase_listMigrations` - Listar migraciones
- `supabase_getDatabaseSize` - Tamaño de la base de datos

## Solución de Problemas

### Token expirado
```bash
opencode mcp auth supabase
opencode mcp auth vercel
```

### Verificar conexión
```bash
opencode mcp list
opencode mcp debug <nombre_mcp>
```

## Notas

- **Reinicia OpenCode** para cargar las custom tools
- Los tokens OAuth se renuevan automáticamente cuando expiran
- Todas las custom tools usan los tokens almacenados en `~/.local/share/opencode/mcp-auth.json`
