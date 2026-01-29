import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface DetectedStack {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
}

export interface McpSuggestion {
  name: string;
  description: string;
  url: string;
  reason: string;
}

export async function detectTechStack(directory: string): Promise<DetectedStack> {
  const stack: DetectedStack = {
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
  };

  // Check for package.json (Node.js)
  const packageJsonPath = join(directory, "package.json");
  if (existsSync(packageJsonPath)) {
    stack.languages.push("javascript", "typescript");
    
    try {
      const content = await readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);
      
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps["next"]) stack.frameworks.push("nextjs");
      if (deps["react"]) stack.frameworks.push("react");
      if (deps["vue"]) stack.frameworks.push("vue");
      if (deps["express"]) stack.frameworks.push("express");
      if (deps["nestjs"]) stack.frameworks.push("nestjs");
      if (deps["prisma"]) stack.tools.push("prisma");
      if (deps["drizzle-orm"]) stack.tools.push("drizzle");
    } catch {
      // Ignore parse errors
    }
  }

  // Check for Python
  if (existsSync(join(directory, "requirements.txt")) || 
      existsSync(join(directory, "pyproject.toml")) ||
      existsSync(join(directory, "setup.py"))) {
    stack.languages.push("python");
  }

  // Check for Docker
  if (existsSync(join(directory, "docker-compose.yml")) ||
      existsSync(join(directory, "Dockerfile"))) {
    stack.tools.push("docker");
    
    // Try to detect databases from docker-compose
    const composePath = join(directory, "docker-compose.yml");
    if (existsSync(composePath)) {
      try {
        const content = await readFile(composePath, "utf-8");
        if (content.includes("postgres") || content.includes("postgresql")) {
          stack.databases.push("postgresql");
        }
        if (content.includes("mysql")) stack.databases.push("mysql");
        if (content.includes("mongodb")) stack.databases.push("mongodb");
        if (content.includes("redis")) stack.databases.push("redis");
      } catch {
        // Ignore read errors
      }
    }
  }

  // Check for Rust
  if (existsSync(join(directory, "Cargo.toml"))) {
    stack.languages.push("rust");
  }

  // Check for Go
  if (existsSync(join(directory, "go.mod"))) {
    stack.languages.push("go");
  }

  return stack;
}

export function suggestMcpServers(stack: DetectedStack): McpSuggestion[] {
  const suggestions: McpSuggestion[] = [];

  // Database MCPs
  if (stack.databases.includes("postgresql")) {
    suggestions.push({
      name: "postgres-mcp",
      description: "Query and manage PostgreSQL databases",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
      reason: "PostgreSQL detected in docker-compose.yml",
    });
  }

  if (stack.databases.includes("mysql")) {
    suggestions.push({
      name: "mysql-mcp",
      description: "Query and manage MySQL databases",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/mysql",
      reason: "MySQL detected in docker-compose.yml",
    });
  }

  // Language-specific MCPs
  if (stack.languages.includes("javascript") || stack.languages.includes("typescript")) {
    suggestions.push({
      name: "nodejs-mcp",
      description: "Node.js runtime and package management",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/node",
      reason: "Node.js project detected (package.json)",
    });
  }

  if (stack.languages.includes("python")) {
    suggestions.push({
      name: "python-mcp",
      description: "Python environment and package management",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/python",
      reason: "Python project detected",
    });
  }

  // Framework-specific MCPs
  if (stack.frameworks.includes("nextjs")) {
    suggestions.push({
      name: "vercel-mcp",
      description: "Vercel deployment and management",
      url: "https://github.com/vercel/mcp-server-vercel",
      reason: "Next.js project detected",
    });
  }

  // Tool-specific MCPs
  if (stack.tools.includes("docker")) {
    suggestions.push({
      name: "docker-mcp",
      description: "Docker container management",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/docker",
      reason: "Docker configuration detected",
    });
  }

  if (stack.tools.includes("prisma")) {
    suggestions.push({
      name: "prisma-mcp",
      description: "Prisma ORM database operations",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/prisma",
      reason: "Prisma ORM detected",
    });
  }

  return suggestions;
}
