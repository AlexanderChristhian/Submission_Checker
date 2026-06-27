import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  return proxyRequest(request, RAG_SERVICE_URL, "/api/rag-service");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, RAG_SERVICE_URL, "/api/rag-service");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, RAG_SERVICE_URL, "/api/rag-service");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, RAG_SERVICE_URL, "/api/rag-service");
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, RAG_SERVICE_URL, "/api/rag-service");
}
