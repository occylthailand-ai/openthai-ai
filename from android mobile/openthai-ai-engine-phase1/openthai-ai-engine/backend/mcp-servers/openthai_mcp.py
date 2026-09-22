"""
OpenThai.ai MCP Server | MCP Server สำหรับ OpenThai.ai
======================================================

Custom Model Context Protocol server for OpenThai.ai platform
MCP Server เฉพาะสำหรับแพลตฟอร์ม OpenThai.ai

Features:
- Product catalog search | ค้นหาสินค้า
- Affiliate commission calculation | คำนวณ commission
- Analytics and insights | วิเคราะห์และข้อมูลเชิงลึก
- Multi-currency support (USDT, OTAI, THB) | รองรับหลายสกุลเงิน

Author: OpenThai.ai Team
Date: May 21, 2026
"""

from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
import json


class Market(str, Enum):
    """Supported markets | ตลาดที่รองรับ"""
    THAI = "thai"
    CHINESE = "chinese"
    ENGLISH = "english"


class Currency(str, Enum):
    """Supported currencies | สกุลเงินที่รองรับ"""
    USDT = "USDT"
    OTAI = "OTAI"
    THB = "THB"


class AffiliateTier(int, Enum):
    """Affiliate tiers | ระดับ affiliate"""
    TIER_1 = 1  # Direct referrals | ผู้แนะนำโดยตรง
    TIER_2 = 2  # Indirect referrals | ผู้แนะนำทางอ้อม


@dataclass
class Product:
    """Product model | โมเดลสินค้า"""
    id: str
    name: Dict[str, str]  # {lang: name}
    description: Dict[str, str]  # {lang: description}
    price: float
    currency: Currency
    category: str
    markets: List[Market]
    commission_rate_tier1: float  # Percentage
    commission_rate_tier2: float  # Percentage
    stock: int
    active: bool


@dataclass
class AffiliateCommission:
    """Commission calculation result | ผลการคำนวณ commission"""
    product_id: str
    tier: AffiliateTier
    quantity: int
    product_price: float
    commission_rate: float
    commission_amount: float
    currency: Currency
    breakdown: Dict[str, Any]


class OpenThaiMCPServer:
    """
    MCP Server for OpenThai.ai
    MCP Server สำหรับ OpenThai.ai
    
    This server provides tools for Claude Code to interact with OpenThai.ai platform.
    Server นี้ให้เครื่องมือสำหรับ Claude Code เชื่อมกับแพลตฟอร์ม OpenThai.ai
    """
    
    def __init__(self, db_connection: Any):
        """
        Initialize MCP Server
        
        Args:
            db_connection: Database connection
        """
        self.db = db_connection
        
        # Currency exchange rates (mock - should fetch from API)
        # อัตราแลกเปลี่ยน (จำลอง - ควรดึงจาก API)
        self.exchange_rates = {
            "USDT_TO_THB": 35.50,
            "OTAI_TO_THB": 10.00,
            "THB_TO_USDT": 1 / 35.50,
            "THB_TO_OTAI": 1 / 10.00,
            "USDT_TO_OTAI": 35.50 / 10.00,
            "OTAI_TO_USDT": 10.00 / 35.50
        }
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Tool 1: Search Products | ค้นหาสินค้า
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def search_products(
        self,
        query: str,
        market: Optional[Market] = None,
        category: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Search OpenThai.ai product catalog
        ค้นหาสินค้าใน OpenThai.ai
        
        Args:
            query: Search query | คำค้นหา
            market: Target market filter | กรองตลาด
            category: Category filter | กรองหมวดหมู่
            limit: Max results | จำนวนผลลัพธ์สูงสุด
            
        Returns:
            Search results with products
        """
        print(f"🔍 Searching products: query='{query}', market={market}, category={category}")
        
        # TODO: Implement actual database query
        # ตอนนี้ return mock data
        
        # Mock products
        mock_products = [
            Product(
                id="prod_001",
                name={
                    "thai": "Smart-E แพลตฟอร์มการค้าอัจฉริยะ",
                    "chinese": "Smart-E 智能商务平台",
                    "english": "Smart-E Intelligent Commerce Platform"
                },
                description={
                    "thai": "แพลตฟอร์มการค้าแบบครบวงจรสำหรับตลาดไทย-จีน",
                    "chinese": "泰中市场的综合商务平台",
                    "english": "Comprehensive commerce platform for Thai-Chinese markets"
                },
                price=99999.00,
                currency=Currency.THB,
                category="platform",
                markets=[Market.THAI, Market.CHINESE],
                commission_rate_tier1=10.0,  # 10%
                commission_rate_tier2=5.0,   # 5%
                stock=100,
                active=True
            ),
            Product(
                id="prod_002",
                name={
                    "thai": "โมดูล AI สำหรับการค้า",
                    "chinese": "商业 AI 模块",
                    "english": "AI Module for Commerce"
                },
                description={
                    "thai": "โมดูล AI ที่เพิ่มความฉลาดให้กับระบบการค้าของคุณ",
                    "chinese": "为您的商务系统增添智能的 AI 模块",
                    "english": "AI module that adds intelligence to your commerce system"
                },
                price=29999.00,
                currency=Currency.THB,
                category="ai_module",
                markets=[Market.THAI, Market.CHINESE, Market.ENGLISH],
                commission_rate_tier1=15.0,  # 15%
                commission_rate_tier2=7.5,   # 7.5%
                stock=50,
                active=True
            )
        ]
        
        # Filter by market
        if market:
            mock_products = [p for p in mock_products if market in p.markets]
        
        # Filter by category
        if category:
            mock_products = [p for p in mock_products if p.category == category]
        
        # Limit results
        results = mock_products[:limit]
        
        return {
            "query": query,
            "market": market.value if market else "all",
            "category": category or "all",
            "total": len(results),
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "price": p.price,
                    "currency": p.currency.value,
                    "category": p.category,
                    "markets": [m.value for m in p.markets],
                    "commission_rates": {
                        "tier1": p.commission_rate_tier1,
                        "tier2": p.commission_rate_tier2
                    },
                    "stock": p.stock,
                    "active": p.active
                }
                for p in results
            ]
        }
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Tool 2: Calculate Affiliate Commission | คำนวณ Commission
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def calculate_affiliate_commission(
        self,
        product_id: str,
        tier: AffiliateTier,
        quantity: int = 1,
        target_currency: Optional[Currency] = None
    ) -> AffiliateCommission:
        """
        Calculate commission for affiliate sale
        คำนวณ commission สำหรับการขาย affiliate
        
        Args:
            product_id: Product ID | รหัสสินค้า
            tier: Affiliate tier (1 or 2) | ระดับ affiliate
            quantity: Number of units sold | จำนวนที่ขาย
            target_currency: Convert to currency | แปลงเป็นสกุลเงิน
            
        Returns:
            Commission calculation details
        """
        print(f"💰 Calculating commission: product={product_id}, tier={tier}, qty={quantity}")
        
        # TODO: Fetch product from database
        # Mock product
        product = Product(
            id=product_id,
            name={"thai": "สินค้าตัวอย่าง"},
            description={"thai": "คำอธิบาย"},
            price=10000.00,
            currency=Currency.THB,
            category="sample",
            markets=[Market.THAI],
            commission_rate_tier1=10.0,
            commission_rate_tier2=5.0,
            stock=100,
            active=True
        )
        
        # Get commission rate based on tier
        commission_rate = (
            product.commission_rate_tier1 if tier == AffiliateTier.TIER_1
            else product.commission_rate_tier2
        )
        
        # Calculate commission
        total_price = product.price * quantity
        commission_amount = total_price * (commission_rate / 100)
        
        # Currency conversion if requested
        final_currency = target_currency or product.currency
        if target_currency and target_currency != product.currency:
            conversion_key = f"{product.currency.value}_TO_{target_currency.value}"
            rate = self.exchange_rates.get(conversion_key, 1.0)
            commission_amount = commission_amount * rate
        
        # Build result
        result = AffiliateCommission(
            product_id=product_id,
            tier=tier,
            quantity=quantity,
            product_price=product.price,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            currency=final_currency,
            breakdown={
                "base_price": product.price,
                "quantity": quantity,
                "subtotal": total_price,
                "commission_percentage": commission_rate,
                "commission_amount": commission_amount,
                "original_currency": product.currency.value,
                "final_currency": final_currency.value,
                "tier": f"Tier {tier.value}",
                "tier_description": (
                    "Direct referral (10%)" if tier == AffiliateTier.TIER_1
                    else "Indirect referral (5%)"
                )
            }
        )
        
        print(f"   ✅ Commission: {commission_amount:.2f} {final_currency.value}")
        return result
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Tool 3: Get Sales Analytics | วิเคราะห์ยอดขาย
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def get_sales_analytics(
        self,
        user_id: Optional[str] = None,
        period: str = "month",
        breakdown_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get sales analytics and insights
        ดึงข้อมูลวิเคราะห์ยอดขาย
        
        Args:
            user_id: Filter by user (optional) | กรองตามผู้ใช้
            period: Time period (day/week/month/year) | ช่วงเวลา
            breakdown_by: Group by field (product/market/currency) | จัดกลุ่ม
            
        Returns:
            Analytics data
        """
        print(f"📊 Getting analytics: user={user_id}, period={period}, breakdown={breakdown_by}")
        
        # TODO: Query actual database
        # Mock analytics
        
        mock_analytics = {
            "period": period,
            "user_id": user_id or "all",
            "summary": {
                "total_sales": 1250000.00,
                "total_commission": 125000.00,
                "total_transactions": 42,
                "active_affiliates": 15,
                "currency": "THB"
            },
            "by_tier": {
                "tier_1": {
                    "sales": 900000.00,
                    "commission": 90000.00,
                    "transactions": 30
                },
                "tier_2": {
                    "sales": 350000.00,
                    "commission": 35000.00,
                    "transactions": 12
                }
            },
            "by_currency": {
                "THB": {"amount": 850000.00, "percentage": 68.0},
                "USDT": {"amount": 300000.00, "percentage": 24.0},
                "OTAI": {"amount": 100000.00, "percentage": 8.0}
            },
            "by_market": {
                "thai": {"sales": 700000.00, "percentage": 56.0},
                "chinese": {"sales": 450000.00, "percentage": 36.0},
                "english": {"sales": 100000.00, "percentage": 8.0}
            },
            "top_products": [
                {"id": "prod_001", "name": "Smart-E Platform", "sales": 500000.00},
                {"id": "prod_002", "name": "AI Module", "sales": 300000.00}
            ]
        }
        
        return mock_analytics
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Tool 4: Convert Currency | แปลงสกุลเงิน
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def convert_currency(
        self,
        amount: float,
        from_currency: Currency,
        to_currency: Currency
    ) -> Dict[str, Any]:
        """
        Convert between supported currencies
        แปลงระหว่างสกุลเงินที่รองรับ
        
        Args:
            amount: Amount to convert | จำนวนเงิน
            from_currency: Source currency | สกุลเงินต้นทาง
            to_currency: Target currency | สกุลเงินปลายทาง
            
        Returns:
            Conversion result
        """
        if from_currency == to_currency:
            return {
                "amount": amount,
                "from": from_currency.value,
                "to": to_currency.value,
                "rate": 1.0,
                "converted_amount": amount
            }
        
        conversion_key = f"{from_currency.value}_TO_{to_currency.value}"
        rate = self.exchange_rates.get(conversion_key)
        
        if not rate:
            raise ValueError(f"Conversion rate not available: {conversion_key}")
        
        converted_amount = amount * rate
        
        return {
            "amount": amount,
            "from": from_currency.value,
            "to": to_currency.value,
            "rate": rate,
            "converted_amount": converted_amount,
            "timestamp": "2026-05-21T00:00:00Z"
        }
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MCP Server Definition | คำจำกัดความ MCP Server
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def get_mcp_tools(self) -> List[Dict[str, Any]]:
        """
        Get MCP tool definitions for Claude Code
        ดึงคำจำกัดความเครื่องมือ MCP สำหรับ Claude Code
        
        Returns:
            List of tool definitions
        """
        return [
            {
                "name": "search_products",
                "description": "Search OpenThai.ai product catalog with filters for market and category",
                "description_th": "ค้นหาสินค้าใน OpenThai.ai พร้อมกรองตามตลาดและหมวดหมู่",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        },
                        "market": {
                            "type": "string",
                            "enum": ["thai", "chinese", "english"],
                            "description": "Target market"
                        },
                        "category": {
                            "type": "string",
                            "description": "Product category"
                        },
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Max results"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "calculate_affiliate_commission",
                "description": "Calculate commission for affiliate sales with 2-tier system and multi-currency support",
                "description_th": "คำนวณ commission สำหรับการขาย affiliate แบบ 2 ชั้น รองรับหลายสกุลเงิน",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "string",
                            "description": "Product ID"
                        },
                        "tier": {
                            "type": "integer",
                            "enum": [1, 2],
                            "description": "Affiliate tier (1=direct, 2=indirect)"
                        },
                        "quantity": {
                            "type": "integer",
                            "default": 1,
                            "description": "Quantity sold"
                        },
                        "target_currency": {
                            "type": "string",
                            "enum": ["USDT", "OTAI", "THB"],
                            "description": "Convert to currency"
                        }
                    },
                    "required": ["product_id", "tier"]
                }
            },
            {
                "name": "get_sales_analytics",
                "description": "Get sales analytics and insights with various breakdowns",
                "description_th": "ดึงข้อมูลวิเคราะห์ยอดขายพร้อมการจัดกลุ่มแบบต่างๆ",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "string",
                            "description": "Filter by user ID"
                        },
                        "period": {
                            "type": "string",
                            "enum": ["day", "week", "month", "year"],
                            "default": "month",
                            "description": "Time period"
                        },
                        "breakdown_by": {
                            "type": "string",
                            "enum": ["product", "market", "currency"],
                            "description": "Group results by"
                        }
                    }
                }
            },
            {
                "name": "convert_currency",
                "description": "Convert between USDT, OTAI, and THB currencies",
                "description_th": "แปลงระหว่างสกุลเงิน USDT, OTAI และ THB",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "amount": {
                            "type": "number",
                            "description": "Amount to convert"
                        },
                        "from_currency": {
                            "type": "string",
                            "enum": ["USDT", "OTAI", "THB"],
                            "description": "Source currency"
                        },
                        "to_currency": {
                            "type": "string",
                            "enum": ["USDT", "OTAI", "THB"],
                            "description": "Target currency"
                        }
                    },
                    "required": ["amount", "from_currency", "to_currency"]
                }
            }
        ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Example Usage | ตัวอย่างการใช้งาน
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    """Demo MCP server | สาธิต MCP server"""
    
    print("\n" + "="*60)
    print("🚀 OpenThai.ai MCP Server Demo")
    print("="*60 + "\n")
    
    # Initialize server
    server = OpenThaiMCPServer(db_connection=None)
    
    # Demo 1: Search products
    print("📍 Demo 1: Search Products for Chinese Market")
    print("-" * 60)
    results = server.search_products(
        query="platform",
        market=Market.CHINESE,
        limit=5
    )
    print(json.dumps(results, indent=2, ensure_ascii=False))
    
    # Demo 2: Calculate commission
    print("\n\n📍 Demo 2: Calculate Tier 2 Commission in USDT")
    print("-" * 60)
    commission = server.calculate_affiliate_commission(
        product_id="prod_001",
        tier=AffiliateTier.TIER_2,
        quantity=2,
        target_currency=Currency.USDT
    )
    print(json.dumps(commission.breakdown, indent=2, ensure_ascii=False))
    
    # Demo 3: Get analytics
    print("\n\n📍 Demo 3: Get Sales Analytics")
    print("-" * 60)
    analytics = server.get_sales_analytics(period="month")
    print(json.dumps(analytics["summary"], indent=2, ensure_ascii=False))
    
    # Demo 4: Currency conversion
    print("\n\n📍 Demo 4: Convert THB to USDT")
    print("-" * 60)
    conversion = server.convert_currency(
        amount=10000.00,
        from_currency=Currency.THB,
        to_currency=Currency.USDT
    )
    print(json.dumps(conversion, indent=2, ensure_ascii=False))
    
    print("\n" + "="*60)
    print("✅ Demo completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
