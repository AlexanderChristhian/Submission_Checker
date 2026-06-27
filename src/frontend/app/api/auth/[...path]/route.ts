import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  return proxyRequest(request, `${BACKEND_URL}/api/auth`, "/api/auth");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, `${BACKEND_URL}/api/auth`, "/api/auth");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, `${BACKEND_URL}/api/auth`, "/api/auth");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, `${BACKEND_URL}/api/auth`, "/api/auth");
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, `${BACKEND_URL}/api/auth`, "/api/auth");
}
