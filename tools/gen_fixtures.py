"""Генерирует эталонные значения из Python-реализации для JS-тестов.

Запуск: python tools/gen_fixtures.py
Результат: tests/fixtures.json
"""

import json
import sys
from decimal import Decimal
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from app.calc import (  # noqa: E402
    calculate_bir,
    calculate_care_unemployed,
    calculate_care_working,
    calculate_unified,
)

CASES: list[dict] = []


def add(case_id: str, kind: str, inputs: dict, expected: dict) -> None:
    CASES.append({"id": case_id, "kind": kind, "input": inputs, "expected": expected})


def bir(case_id, e24, e25, days=140, excluded=0, tenure=True, district="1.0"):
    result = calculate_bir(
        earnings_2024=Decimal(e24),
        earnings_2025=Decimal(e25),
        days=days,
        excluded_days=excluded,
        tenure_6m=tenure,
        district=Decimal(district),
    )
    add(
        case_id,
        "calculateBir",
        {
            "earnings2024": float(e24),
            "earnings2025": float(e25),
            "days": days,
            "excludedDays": excluded,
            "tenure6m": tenure,
            "district": float(district),
        },
        {
            "amount": str(result.amount),
            "daily": str(result.daily),
            "minAmount": str(result.min_amount),
            "maxAmount": str(result.max_amount),
            "limitedBy": result.limited_by,
        },
    )


def care_working(case_id, e24, e25, children=1, excluded=0, district="1.0"):
    result = calculate_care_working(
        earnings_2024=Decimal(e24),
        earnings_2025=Decimal(e25),
        children=children,
        excluded_days=excluded,
        district=Decimal(district),
    )
    add(
        case_id,
        "calculateCareWorking",
        {
            "earnings2024": float(e24),
            "earnings2025": float(e25),
            "children": children,
            "excludedDays": excluded,
            "district": float(district),
        },
        {
            "monthly": str(result.monthly),
            "perChild": str(result.per_child),
            "minMonthly": str(result.min_monthly),
            "maxMonthly": str(result.max_monthly),
            "cappedByEarnings": result.capped_by_earnings,
        },
    )


def care_unemployed(case_id, children=1, district="1.0"):
    result = calculate_care_unemployed(children=children, district=Decimal(district))
    add(
        case_id,
        "calculateCareUnemployed",
        {"children": children, "district": float(district)},
        {
            "monthly": str(result.monthly),
            "perChild": str(result.per_child),
        },
    )


def unified(
    case_id,
    income,
    family,
    children,
    pm_child="18371",
    pm_dush="18939",
    property_ok=True,
    zero_ok=True,
):
    result = calculate_unified(
        income_12m=Decimal(income),
        family_size=family,
        children=children,
        pm_child=Decimal(pm_child),
        pm_dush=Decimal(pm_dush),
        property_ok=property_ok,
        zero_income_ok=zero_ok,
    )
    add(
        case_id,
        "calculateUnified",
        {
            "income12m": float(income),
            "familySize": family,
            "children": children,
            "pmChild": float(pm_child),
            "pmDush": float(pm_dush),
            "propertyOk": property_ok,
            "zeroIncomeOk": zero_ok,
        },
        {
            "eligible": result.eligible,
            "rate": None if result.rate is None else str(result.rate),
            "perChild": str(result.per_child),
            "total": str(result.total),
            "avgIncome": str(result.avg_income),
        },
    )


# БиР
bir("bir-min", "0", "0")
bir("bir-regular", "1000000", "1000000")
bir("bir-max", "5000000", "5000000")
bir("bir-156", "5000000", "5000000", days=156)
bir("bir-194-min", "0", "0", days=194)
bir("bir-short-tenure", "2000000", "2000000", tenure=False)
bir("bir-district-min", "0", "0", district="1.3")
bir("bir-excluded", "1000000", "1000000", excluded=30)
bir("bir-district-high", "1000000", "1000000", district="1.15")

# Уход до 1,5 лет
care_working("care-min", "0", "0")
care_working("care-regular", "1000000", "1000000")
care_working("care-max", "5000000", "5000000")
care_working("care-two", "5000000", "5000000", children=2)
care_working("care-two-floor", "0", "0", children=2)
care_working("care-district", "1000000", "1000000", district="1.3")
care_unemployed("care-unemployed", children=1)
care_unemployed("care-unemployed-two", children=2, district="1.5")

# Единое пособие
unified("uni-low", "300000", 4, 1)
unified("uni-middle", "850000", 4, 1)
unified("uni-refused", "1200000", 4, 1)
unified("uni-two-children", "300000", 4, 2)
unified("uni-property", "300000", 4, 1, property_ok=False)
unified("uni-zero-income", "300000", 4, 1, zero_ok=False)
unified("uni-regional", "300000", 4, 1, pm_child="20000", pm_dush="20000")
unified("uni-boundary", "909072", 4, 1)

output = Path(__file__).resolve().parents[1] / "tests" / "fixtures.json"
output.write_text(
    json.dumps(CASES, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"{len(CASES)} cases -> {output}")
