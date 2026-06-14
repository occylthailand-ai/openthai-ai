"""
OpenThai.ai AI Engine - API Gateway
เครื่องมือ AI OpenThai.ai - API Gateway
=========================================

Unified API gateway that orchestrates RAG service, MCP servers, and Claude API.
API Gateway แบบรวมที่จัดการ RAG service, MCP servers, และ Claude API

This is the single entry point for all client applications.
นี่คือจุดเข้าใช้งานเดียวสำหรับ client applications ทั้งหมด

Author: OpenThai.ai Team
Date: May 21, 2026
"""

import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import redis.asyncio as redis
import asyncpg


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Configuration | การตั้งค่า
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Config:
    """Application configuration | การตั้งค่าแอปพลิเคชัน"""
    
    # Service URLs
    RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:8000")
    MCP_SERVICE_URL = os.getenv("MCP_SERVICE_URL", "http://mcp-server:8000")
    
    # Database
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB = os.getenv("POSTGRES_DB", "openthai_ai")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "openthai_admin")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "openthai_secure_2026")
    
    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    
    # Security
    API_KEY = os.getenv("API_KEY", "openthai_dev_key_change_me")
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Caching
    CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # 1 hour


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Application State | สถานะแอปพลิเคชัน
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AppState:
    """Shared application state | สถานะที่ใช้ร่วมกัน"""
    
    db_pool: Optional[asyncpg.Pool] = None
    redis_client: Optional[redis.Redis] = None
    http_client: Optional[httpx.AsyncClient] = None


state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management | จัดการวงจรชีวิต"""
    
    # Startup
    print("🚀 Starting OpenThai.ai API Gateway...")
    print("🚀 กำลังเริ่ม OpenThai.ai API Gateway...")
    
    # Initialize database pool
    state.db_pool = await asyncpg.create_pool(
        host=Config.POSTGRES_HOST,
        port=Config.POSTGRES_PORT,
        database=Config.POSTGRES_DB,
        user=Config.POSTGRES_USER,
        password=Config.POSTGRES_PASSWORD,
        min_size=5,
        max_size=20
    )
    print("✅ PostgreSQL connected")
    
    # Initialize Redis
    state.redis_client = redis.Redis(
        host=Config.REDIS_HOST,
        port=Config.REDIS_PORT,
        decode_responses=True
    )
    print("✅ Redis connected")
    
    # Initialize HTTP client
    state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(30.0),
        limits=httpx.Limits(max_connections=100)
    )
    print("✅ HTTP client ready")
    
    print("✅ OpenThai.ai API Gateway is ready!")
    print("✅ OpenThai.ai API Gateway พร้อมใช้งาน!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    if state.db_pool:
        await state.db_pool.close()
    if state.redis_client:
        await state.redis_client.close()
    if state.http_client:
        await state.http_client.aclose()
    print("✅ Shutdown complete")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FastAPI App | แอป FastAPI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="OpenThai.ai AI Engine API",
    description="""
    Unified AI Engine API for OpenThai.ai Platform
    API เครื่องมือ AI สำหรับแพลตฟอร์ม OpenThai.ai
    
    Features | คุณสมบัติ:
    - RAG-powered intelligent responses | คำตอบอัจฉริยะด้วย RAG
    - Multi-currency support (USDT/OTAI/THB) | รองรับหลายสกุลเงิน
    - Affiliate commission calculation | คำนวณ commission
    - Multilingual (Thai/Chinese/English) | หลายภาษา
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Authentication | การยืนยันตัวตน
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def verify_api_key(x_api_key: str = Header(None)):
    """Verify API key | ตรวจสอบ API key"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # TODO: Verify against database in production
    if x_api_key != Config.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return x_api_key


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Request/Response Models | โมเดล Request/Response
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class QueryRequest(BaseModel):
    """AI query request | คำขอ query AI"""
    query: str = Field(..., description="User query | คำถามผู้ใช้")
    user_id: Optional[str] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    market: Optional[str] = Field(None, description="Target market: thai/chinese/english")
    category: Optional[str] = Field(None, description="Category filter")
    language: Optional[str] = Field("thai", description="Response language")
    use_cache: bool = Field(True, description="Use cached results")


class QueryResponse(BaseModel):
    """AI query response | คำตอบ AI"""
    query: str
    response: str
    sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    cached: bool = False
    response_time_ms: int


class ProductSearchRequest(BaseModel):
    """Product search request | คำขอค้นหาสินค้า"""
    query: str
    market: Optional[str] = None
    category: Optional[str] = None
    limit: int = 10


class CommissionRequest(BaseModel):
    """Commission calculation request | คำขอคำนวณ commission"""
    product_id: str
    tier: int = Field(..., ge=1, le=2)
    quantity: int = Field(1, gt=0)
    target_currency: Optional[str] = None


class FeedbackRequest(BaseModel):
    """User feedback request | คำขอ feedback"""
    interaction_id: str
    rating: int = Field(..., ge=1, le=5)
    helpful: bool
    comment: Optional[str] = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Health Check Endpoints | จุดตรวจสอบสุขภาพ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/")
async def root():
    """Root endpoint | จุดเริ่มต้น"""
    return {
        "service": "OpenThai.ai AI Engine",
        "service_th": "เครื่องมือ AI OpenThai.ai",
        "version": "1.0.0",
        "status": "operational",
        "ceo": "Mythos (mythos@openthai.ai)",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint | ตรวจสอบสถานะ"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {}
    }
    
    # Check PostgreSQL
    try:
        async with state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        health_status["services"]["postgres"] = "healthy"
    except Exception as e:
        health_status["services"]["postgres"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        await state.redis_client.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check RAG service
    try:
        response = await state.http_client.get(f"{Config.RAG_SERVICE_URL}/health")
        health_status["services"]["rag_service"] = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception as e:
        health_status["services"]["rag_service"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check MCP service
    try:
        response = await state.http_client.get(f"{Config.MCP_SERVICE_URL}/health")
        health_status["services"]["mcp_service"] = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception as e:
        health_status["services"]["mcp_service"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main AI Endpoints | จุดเชื่อม AI หลัก
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/v1/query", response_model=QueryResponse)
async def ai_query(
    request: QueryRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Main AI query endpoint with RAG + Claude
    จุดเชื่อม AI หลัก พร้อม RAG + Claude
    
    Flow | ขั้นตอน:
    1. Check cache | ตรวจสอบ cache
    2. Retrieve context from vector DB | ดึงบริบทจาก vector DB
    3. Call Claude API with enhanced prompt | เรียก Claude พร้อม prompt
    4. Save interaction for learning | บันทึกเพื่อเรียนรู้
    5. Cache response | เก็บ cache
    """
    
    start_time = datetime.now()
    
    # Generate cache key
    cache_key = f"query:{hash(request.query)}:{request.market}:{request.category}"
    
    # Check cache
    if request.use_cache:
        cached = await state.redis_client.get(cache_key)
        if cached:
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return QueryResponse(
                query=request.query,
                response=cached,
                sources=[],
                metadata={"cached": True},
                cached=True,
                response_time_ms=response_time
            )
    
    # Call RAG service
    try:
        rag_response = await state.http_client.post(
            f"{Config.RAG_SERVICE_URL}/query",
            json={
                "query": request.query,
                "filters": {
                    "market": request.market,
                    "category": request.category
                },
                "limit": 10
            }
        )
        rag_data = rag_response.json()
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"RAG service unavailable: {str(e)}"
        )
    
    # Calculate response time
    response_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    # Save interaction to database
    async with state.db_pool.acquire() as conn:
        interaction_id = await conn.fetchval("""
            INSERT INTO ai_interactions 
            (user_id, session_id, query, query_language, response, 
             context_ids, context_count, model_used, input_tokens, 
             output_tokens, response_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        """,
            request.user_id,
            request.session_id,
            request.query,
            request.language,
            rag_data.get("response"),
            [s.get("id") for s in rag_data.get("sources", [])],
            len(rag_data.get("sources", [])),
            rag_data.get("model"),
            rag_data.get("usage", {}).get("input_tokens"),
            rag_data.get("usage", {}).get("output_tokens"),
            response_time
        )
    
    # Cache response
    if request.use_cache:
        await state.redis_client.setex(
            cache_key,
            Config.CACHE_TTL,
            rag_data.get("response", "")
        )
    
    return QueryResponse(
        query=request.query,
        response=rag_data.get("response", ""),
        sources=rag_data.get("sources", []),
        metadata={
            "interaction_id": str(interaction_id),
            "model": rag_data.get("model"),
            "usage": rag_data.get("usage", {})
        },
        cached=False,
        response_time_ms=response_time
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Product Endpoints | จุดเชื่อมสินค้า
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/v1/products/search")
async def search_products(
    request: ProductSearchRequest,
    api_key: str = Depends(verify_api_key)
):
    """Search products | ค้นหาสินค้า"""
    
    try:
        response = await state.http_client.post(
            f"{Config.MCP_SERVICE_URL}/search_products",
            json=request.dict()
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Affiliate Endpoints | จุดเชื่อม Affiliate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/v1/affiliate/commission")
async def calculate_commission(
    request: CommissionRequest,
    api_key: str = Depends(verify_api_key)
):
    """Calculate affiliate commission | คำนวณ commission"""
    
    try:
        response = await state.http_client.post(
            f"{Config.MCP_SERVICE_URL}/calculate_affiliate_commission",
            json=request.dict()
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/v1/affiliate/performance/{user_id}")
async def get_affiliate_performance(
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get affiliate performance | ดึงข้อมูลประสิทธิภาพ affiliate"""
    
    async with state.db_pool.acquire() as conn:
        result = await conn.fetchrow("""
            SELECT * FROM affiliate_performance WHERE id = $1
        """, user_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        return dict(result)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Analytics Endpoints | จุดเชื่อมวิเคราะห์
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/v1/analytics/ai-usage")
async def get_ai_usage_stats(
    days: int = 7,
    api_key: str = Depends(verify_api_key)
):
    """Get AI usage statistics | ดึงสถิติการใช้ AI"""
    
    async with state.db_pool.acquire() as conn:
        results = await conn.fetch("""
            SELECT * FROM ai_usage_stats 
            WHERE date >= NOW() - INTERVAL '%s days'
            ORDER BY date DESC
        """ % days)
        
        return [dict(r) for r in results]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Feedback Endpoint | จุดเชื่อม Feedback
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/v1/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    api_key: str = Depends(verify_api_key)
):
    """Submit user feedback | ส่ง feedback ผู้ใช้"""
    
    async with state.db_pool.acquire() as conn:
        await conn.execute("""
            UPDATE ai_interactions 
            SET user_feedback_rating = $1,
                user_feedback_helpful = $2,
                user_feedback_comment = $3
            WHERE id = $4
        """,
            request.rating,
            request.helpful,
            request.comment,
            request.interaction_id
        )
    
    return {
        "status": "success",
        "message": "Feedback recorded | บันทึก feedback แล้ว",
        "interaction_id": request.interaction_id
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Run Server | รัน Server
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
