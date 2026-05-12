"""
OpenThai AI — Claude Mythos Multi-Provider Router v1.0
รองรับ 3 provider พร้อมกัน + Auto-fallback

Provider Priority:
  1. Anthropic Direct API  (claude-mythos-20260407)
  2. AWS Bedrock           (anthropic.claude-mythos-preview-v1:0)
  3. Google Vertex AI      (claude-mythos-preview@anthropic)
  4. Fallback              (claude-sonnet-4-5)

วิธีใช้:
  router = MythosRouter()
  result = await router.generate(messages, system)
  print(result["provider"], result["content"])
"""

import os
import json
import anthropic
from typing import Optional, List, Dict, Any
from datetime import datetime

# ================== MODEL IDs ==================

MODELS = {
    "anthropic": "claude-mythos-20260407",
    "bedrock":   "anthropic.claude-mythos-preview-v1:0",
    "vertex":    "claude-mythos-preview@anthropic",
    "fallback":  "claude-sonnet-4-5"
}

# ================== ROUTER ==================

class MythosRouter:
    """
    Multi-provider router สำหรับ Claude Mythos Preview
    ลอง provider ตามลำดับจนสำเร็จ
    """

    def __init__(self):
        self.anthropic_key   = os.getenv("ANTHROPIC_API_KEY", "")
        self.aws_key_id      = os.getenv("AWS_ACCESS_KEY_ID", "")
        self.aws_secret      = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        self.aws_region      = os.getenv("AWS_REGION", "us-east-1")
        self.gcp_project     = os.getenv("GCP_PROJECT_ID", "")
        self.gcp_region      = os.getenv("GCP_REGION", "us-east5")
        self.mythos_enabled  = os.getenv("MYTHOS_ENABLED", "true").lower() == "true"

        # สถานะ provider แต่ละตัว
        self.provider_status = {
            "anthropic": "unknown",
            "bedrock":   "unknown",
            "vertex":    "unknown",
            "fallback":  "available"
        }

    # ────────────────────────────────────────
    # 1. ANTHROPIC DIRECT
    # ────────────────────────────────────────
    async def _call_anthropic(
        self,
        messages: List[Dict],
        system: str,
        max_tokens: int = 2000
    ) -> Dict:
        """เรียก Claude Mythos ผ่าน Anthropic API โดยตรง"""
        if not self.anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=self.anthropic_key)

        response = client.messages.create(
            model=MODELS["anthropic"],
            max_tokens=max_tokens,
            system=[{
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"}
            }],
            messages=messages
        )

        return {
            "provider": "anthropic",
            "model": MODELS["anthropic"],
            "content": response.content[0].text,
            "usage": {
                "input_tokens":  response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "cache_read":    getattr(response.usage, "cache_read_input_tokens", 0),
            },
            "timestamp": datetime.now().isoformat()
        }

    # ────────────────────────────────────────
    # 2. AWS BEDROCK
    # ────────────────────────────────────────
    async def _call_bedrock(
        self,
        messages: List[Dict],
        system: str,
        max_tokens: int = 2000
    ) -> Dict:
        """เรียก Claude Mythos ผ่าน AWS Bedrock"""
        try:
            import boto3
        except ImportError:
            raise ImportError("boto3 not installed — pip install boto3")

        if not self.aws_key_id or not self.aws_secret:
            raise ValueError("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set")

        bedrock = boto3.client(
            "bedrock-runtime",
            region_name=self.aws_region,
            aws_access_key_id=self.aws_key_id,
            aws_secret_access_key=self.aws_secret
        )

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system,
            "messages": messages
        })

        response = bedrock.invoke_model(
            modelId=MODELS["bedrock"],
            body=body,
            contentType="application/json",
            accept="application/json"
        )

        result = json.loads(response["body"].read())

        return {
            "provider": "bedrock",
            "model": MODELS["bedrock"],
            "content": result["content"][0]["text"],
            "usage": result.get("usage", {}),
            "timestamp": datetime.now().isoformat()
        }

    # ────────────────────────────────────────
    # 3. GOOGLE VERTEX AI
    # ────────────────────────────────────────
    async def _call_vertex(
        self,
        messages: List[Dict],
        system: str,
        max_tokens: int = 2000
    ) -> Dict:
        """เรียก Claude Mythos ผ่าน Google Vertex AI"""
        try:
            from anthropic import AnthropicVertex
        except ImportError:
            raise ImportError("anthropic[vertex] not installed — pip install anthropic[vertex]")

        if not self.gcp_project:
            raise ValueError("GCP_PROJECT_ID not set")

        client = AnthropicVertex(
            region=self.gcp_region,
            project_id=self.gcp_project
        )

        response = client.messages.create(
            model=MODELS["vertex"],
            max_tokens=max_tokens,
            system=system,
            messages=messages
        )

        return {
            "provider": "vertex",
            "model": MODELS["vertex"],
            "content": response.content[0].text,
            "usage": {
                "input_tokens":  response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            "timestamp": datetime.now().isoformat()
        }

    # ────────────────────────────────────────
    # 4. FALLBACK (claude-sonnet-4-5)
    # ────────────────────────────────────────
    async def _call_fallback(
        self,
        messages: List[Dict],
        system: str,
        max_tokens: int = 2000
    ) -> Dict:
        """Fallback ไปใช้ claude-sonnet-4-5 เมื่อ Mythos ไม่พร้อม"""
        if not self.anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=self.anthropic_key)

        response = client.messages.create(
            model=MODELS["fallback"],
            max_tokens=max_tokens,
            system=[{
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"}
            }],
            messages=messages
        )

        return {
            "provider": "fallback",
            "model": MODELS["fallback"],
            "content": response.content[0].text,
            "usage": {
                "input_tokens":  response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "cache_read":    getattr(response.usage, "cache_read_input_tokens", 0),
            },
            "timestamp": datetime.now().isoformat()
        }

    # ────────────────────────────────────────
    # MAIN: AUTO-ROUTE
    # ────────────────────────────────────────
    async def generate(
        self,
        messages: List[Dict],
        system: str = "",
        max_tokens: int = 2000,
        preferred_provider: Optional[str] = None
    ) -> Dict:
        """
        Route คำขอไปยัง provider ที่ดีที่สุด
        ลองตามลำดับจนสำเร็จ
        """
        errors = []

        # ถ้า Mythos ปิดอยู่ → ข้ามไป fallback เลย
        if not self.mythos_enabled:
            return await self._call_fallback(messages, system, max_tokens)

        # กำหนดลำดับ provider
        if preferred_provider and preferred_provider in ["anthropic", "bedrock", "vertex"]:
            order = [preferred_provider, "anthropic", "bedrock", "vertex", "fallback"]
            order = list(dict.fromkeys(order))  # deduplicate
        else:
            order = ["anthropic", "bedrock", "vertex", "fallback"]

        callers = {
            "anthropic": self._call_anthropic,
            "bedrock":   self._call_bedrock,
            "vertex":    self._call_vertex,
            "fallback":  self._call_fallback
        }

        for provider in order:
            try:
                result = await callers[provider](messages, system, max_tokens)
                self.provider_status[provider] = "available"
                result["fallback_used"] = (provider == "fallback")
                result["providers_tried"] = [p for p in order[:order.index(provider)+1]]
                return result
            except Exception as e:
                self.provider_status[provider] = f"error: {str(e)[:50]}"
                errors.append({"provider": provider, "error": str(e)})
                continue

        # ถ้าทุก provider fail
        raise Exception(f"All providers failed: {json.dumps(errors, ensure_ascii=False)}")

    async def check_status(self) -> Dict:
        """ตรวจสอบสถานะ provider ทั้งหมด"""
        status = {}

        # Anthropic
        status["anthropic"] = {
            "available": bool(self.anthropic_key),
            "model": MODELS["anthropic"],
            "endpoint": "api.anthropic.com",
            "key_set": bool(self.anthropic_key),
            "note": "Gated — ต้องขอ access จาก red.anthropic.com"
        }

        # Bedrock
        status["bedrock"] = {
            "available": bool(self.aws_key_id and self.aws_secret),
            "model": MODELS["bedrock"],
            "endpoint": f"bedrock-runtime.{self.aws_region}.amazonaws.com",
            "key_set": bool(self.aws_key_id),
            "region": self.aws_region,
            "note": "ต้องขอ model access ใน AWS Bedrock console"
        }

        # Vertex AI
        status["vertex"] = {
            "available": bool(self.gcp_project),
            "model": MODELS["vertex"],
            "endpoint": f"{self.gcp_region}-aiplatform.googleapis.com",
            "key_set": bool(self.gcp_project),
            "project": self.gcp_project or "not set",
            "note": "ต้องเปิด Vertex AI API + ขอ Claude Mythos access"
        }

        # Fallback
        status["fallback"] = {
            "available": bool(self.anthropic_key),
            "model": MODELS["fallback"],
            "endpoint": "api.anthropic.com",
            "note": "Always available เมื่อมี ANTHROPIC_API_KEY"
        }

        return {
            "mythos_enabled": self.mythos_enabled,
            "providers": status,
            "priority_order": ["anthropic", "bedrock", "vertex", "fallback"],
            "checked_at": datetime.now().isoformat()
        }


# ================== SINGLETON ==================
_router_instance: Optional[MythosRouter] = None

def get_mythos_router() -> MythosRouter:
    global _router_instance
    if _router_instance is None:
        _router_instance = MythosRouter()
    return _router_instance
